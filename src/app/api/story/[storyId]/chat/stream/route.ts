import { z } from "zod";
import { nsfwAllowed } from "@/lib/contentSafety";
import { selectConversationModel } from "@/lib/ai/conversation/modelSelection";
import { parseConversationJson } from "@/lib/ai/conversation/schema";
import { calcCostJpy } from "@/lib/ai/costCalc";
import { buildConversationPrompt, buildLatestUserMessage } from "@/lib/promptBuilder";
import { estimateTokenLikeCount, newId } from "@/lib/utils";
import type { ChoiceType, DirectorUpdate, SmartReply, SuggestedReply, TimelineItem } from "@/lib/domain/types";
import type { ConversationRequest, ConversationResponse } from "@/lib/ai/types";

const requestSchema = z.object({
  bundle: z.any(),
  session: z.any(),
  messages: z.array(z.any()),
  userInput: z.string().min(1),
  settings: z.any(),
  inputType: z.enum(["free_text", "choice_selected", "auto_continue", "continue_without_user_speech"]).optional(),
  selectedChoice: z.object({
    label: z.string(),
    type: z.string()
  }).nullable().optional(),
  relationships: z.array(z.any()).optional(),
  lorebook: z.array(z.any()).optional(),
  linkedLorebookEntries: z.array(z.any()).optional(),
  memories: z.array(z.any()).optional(),
  foreshadowingItems: z.array(z.any()).optional(),
  storySummaries: z.array(z.any()).optional(),
  environmentState: z.any().nullable().optional(),
  characterStates: z.array(z.any()).optional(),
  usageTotalCostJpy: z.number().optional(),
  choicePreferences: z.any().nullable().optional()
});

type OpenAIStreamEvent = {
  type?: string;
  delta?: string;
  text?: string;
  response?: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };
  error?: {
    message?: string;
  };
};

type AnthropicStreamEvent = {
  type?: string;
  delta?: {
    type?: string;
    text?: string;
  };
  message?: {
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
    };
  };
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    message?: string;
  };
};

export async function POST(request: Request, context: { params: Promise<{ storyId: string }> }) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response("Invalid stream request", { status: 400 });
  }

  const { storyId } = await context.params;
  const payload = parsed.data as ConversationRequest;
  const allowed = nsfwAllowed(payload.settings.adult_confirmed, payload.settings.nsfw_chat_enabled && payload.session.nsfw_chat_enabled);
  const selection = selectConversationModel(payload, allowed);

  const providerLower = selection.provider.toLowerCase();
  const isOpenAI = providerLower === "openai" || providerLower.startsWith("openai");
  const isAnthropic = providerLower === "anthropic" || providerLower.startsWith("anthropic") || providerLower === "claude";
  if (!isOpenAI && !isAnthropic) {
    return new Response("SSE streaming is not supported by this provider", { status: 409 });
  }

  const apiKey = isAnthropic ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(`${isAnthropic ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY"} is missing`, { status: 409 });
  }

  const model = selection.model || (isAnthropic ? "claude-sonnet-4-5" : process.env.OPENAI_MODEL || "gpt-4.1-mini");
  const providerName = isAnthropic ? "anthropic" : "openai";
  const backend = `${providerName}:${model}`;
  const prompt = buildConversationPrompt({
    bundle: payload.bundle,
    session: payload.session,
    relationships: payload.relationships ?? [],
    lorebook: payload.lorebook ?? payload.bundle.lorebook,
    linkedLorebookEntries: payload.linkedLorebookEntries ?? [],
    memories: payload.memories ?? [],
    recentMessages: payload.messages,
    latestUserInput: payload.userInput,
    settings: payload.settings,
    inputType: payload.inputType,
    selectedChoice: payload.selectedChoice,
    environmentState: payload.environmentState ?? null,
    characterStates: payload.characterStates ?? [],
    outputMode: "ndjson",
    foreshadowingItems: payload.foreshadowingItems ?? [],
    storySummaries: payload.storySummaries ?? [],
    choicePreferences: payload.choicePreferences ?? null
  });
  const userMessage = buildLatestUserMessage(payload.userInput, payload.inputType, payload.selectedChoice);
  const encoder = new TextEncoder();
  const upstreamAbort = new AbortController();

  request.signal.addEventListener("abort", () => upstreamAbort.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const resetTimeout = () => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          send("error", { message: "timeout" });
          upstreamAbort.abort();
        }, 30000);
      };

      let textBuffer = "";
      let rawOutput = "";
      let pendingLine = "";
      let sentTimelineCount = 0;
      let choicesSent = false;
      let directorSent = false;
      let usage: ConversationResponse["usage"] = {
        backend,
        provider: providerName,
        model,
        input_tokens: estimateTokenLikeCount(prompt.systemPrompt),
        output_tokens: 0,
        estimated_cost_jpy: 0,
        prompt_chars: prompt.systemPrompt.length,
        routeHint: selection.routeHint,
        model_role: selection.modelRole,
        reason: selection.reason
      };

      const consumeOutputText = (delta: string) => {
        rawOutput += delta;
        textBuffer += delta;
        let newlineIndex = textBuffer.indexOf("\n");
        while (newlineIndex !== -1) {
          const line = textBuffer.slice(0, newlineIndex).trim();
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line) {
            const parsedLine = parseNdjsonLine(pendingLine ? `${pendingLine}\n${line}` : line);
            if (parsedLine) {
              pendingLine = "";
              const emitted = emitNdjsonObject(parsedLine, send);
              if (emitted === "timeline_item") sentTimelineCount += 1;
              if (emitted === "choices") choicesSent = true;
              if (emitted === "director_update") directorSent = true;
            } else {
              pendingLine = pendingLine ? `${pendingLine}\n${line}` : line;
            }
          }
          newlineIndex = textBuffer.indexOf("\n");
        }
      };

      try {
        resetTimeout();
        const streamInstruction = [
          prompt.systemPrompt,
          "",
          allowed
            ? "NSFW会話は成人確認済みの場合のみ許可。ただし禁止カテゴリは絶対に扱わない。合意・成人・創作上の境界を明確に守る。"
            : "NSFW会話はOFF。成人向け性的描写、露骨な描写、性的な誘導は出さない。必要なら穏当な会話や場面転換にする。",
          "",
          "このレスポンスはリアルタイム表示用です。必ず1行1JSONのNDJSONだけを返し、Markdownや説明文は返さない。"
        ].join("\n");

        const upstream = isAnthropic
          ? await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              signal: upstreamAbort.signal,
              headers: {
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model,
                max_tokens: payload.settings.low_cost_mode ? 1400 : 2200,
                stream: true,
                system: streamInstruction,
                messages: [
                  {
                    role: "user",
                    content: userMessage
                  }
                ]
              })
            })
          : await fetch("https://api.openai.com/v1/responses", {
              method: "POST",
              signal: upstreamAbort.signal,
              headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model,
                stream: true,
                input: [
                  {
                    role: "developer",
                    content: streamInstruction
                  },
                  {
                    role: "user",
                    content: userMessage
                  }
                ],
                max_output_tokens: payload.settings.low_cost_mode ? 1400 : 2200
              })
            });

        if (!upstream.ok || !upstream.body) {
          const body = await upstream.text().catch(() => "");
          send("error", { message: `${providerName} stream error ${upstream.status}`, fallback: true, detail: body.slice(0, 400) });
          send("done", {});
          return;
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        while (true) {
          resetTimeout();
          const { value, done } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          sseBuffer = sseBuffer.replace(/\r\n/g, "\n");
          let boundary = sseBuffer.indexOf("\n\n");
          while (boundary !== -1) {
            const frame = sseBuffer.slice(0, boundary);
            sseBuffer = sseBuffer.slice(boundary + 2);
            if (isAnthropic) {
              const event = parseAnthropicSseFrame(frame);
              if (event?.type === "content_block_delta" && event.delta?.type === "text_delta" && typeof event.delta.text === "string") {
                consumeOutputText(event.delta.text);
              }
              if (event?.type === "message_start") {
                usage = {
                  ...usage,
                  input_tokens: event.message?.usage?.input_tokens ?? usage.input_tokens
                };
              }
              if (event?.type === "message_delta") {
                usage = {
                  ...usage,
                  output_tokens: event.usage?.output_tokens ?? usage.output_tokens
                };
              }
              if (event?.type === "error") {
                send("error", { message: event.error?.message ?? "stream_failed", fallback: true });
              }
            } else {
              const event = parseOpenAISseFrame(frame);
              if (event?.type === "response.output_text.delta" && typeof event.delta === "string") {
                consumeOutputText(event.delta);
              }
              if (event?.type === "response.output_text.done" && typeof event.text === "string" && !rawOutput) {
                consumeOutputText(event.text);
              }
              if (event?.type === "response.completed") {
                usage = {
                  ...usage,
                  input_tokens: event.response?.usage?.input_tokens ?? usage.input_tokens,
                  output_tokens: event.response?.usage?.output_tokens ?? estimateTokenLikeCount(rawOutput)
                };
              }
              if (event?.type === "error" || event?.type === "response.failed") {
                send("error", { message: event.error?.message ?? "stream_failed", fallback: true });
              }
            }
            boundary = sseBuffer.indexOf("\n\n");
          }
        }

        const trailing = [pendingLine, textBuffer.trim()].filter(Boolean).join("\n").trim();
        if (trailing) {
          const parsedTrailing = parseNdjsonLine(trailing);
          if (parsedTrailing) {
            const emitted = emitNdjsonObject(parsedTrailing, send);
            if (emitted === "timeline_item") sentTimelineCount += 1;
            if (emitted === "choices") choicesSent = true;
            if (emitted === "director_update") directorSent = true;
          } else {
            const loose = emitLooseNdjsonObjects(trailing, send);
            sentTimelineCount += loose.timelineItems;
            choicesSent = choicesSent || loose.choices;
            directorSent = directorSent || loose.directorUpdate;
            if (!loose.emitted && loose.remaining.trim()) {
              send("timeline_item", { type: "narration", characterName: null, content: loose.remaining.trim() } satisfies TimelineItem);
              sentTimelineCount += 1;
            }
          }
        }

        if (sentTimelineCount === 0) {
          const fallback = parseConversationJson(rawOutput, usage, backend);
          fallback.timeline.forEach((item) => send("timeline_item", item));
          if (fallback.suggestedReplies.length) send("choices", { items: fallback.suggestedReplies });
          if (fallback.smartReplies.length) {
            send("smart_replies", { replies: fallback.smartReplies });
          }
          send("director_update", fallback.directorUpdate);
          choicesSent = fallback.suggestedReplies.length > 0;
          directorSent = true;
        }

        if (!choicesSent && payload.session.play_pace_mode !== "auto") {
          send("choices", { items: [] });
        }
        if (!directorSent) {
          send("director_update", defaultDirectorUpdate(payload));
        }

        const finalOutputTokens = usage.output_tokens || estimateTokenLikeCount(rawOutput);
        usage = {
          ...usage,
          output_tokens: finalOutputTokens,
          estimated_cost_jpy: calcCostJpy(model, usage.input_tokens, finalOutputTokens)
        };
        send("usage", usage);
        send("done", { usage, storyId });
      } catch (error) {
        if (!upstreamAbort.signal.aborted) {
          send("error", { message: error instanceof Error ? error.message : "stream_error", fallback: true });
        }
        send("done", {});
      } finally {
        if (timeout) clearTimeout(timeout);
        controller.close();
      }
    },
    cancel() {
      upstreamAbort.abort();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}

function parseOpenAISseFrame(frame: string): OpenAIStreamEvent | null {
  return parseSseJsonData(frame) as OpenAIStreamEvent | null;
}

function parseAnthropicSseFrame(frame: string): AnthropicStreamEvent | null {
  return parseSseJsonData(frame) as AnthropicStreamEvent | null;
}

function parseSseJsonData(frame: string): Record<string, unknown> | null {
  const dataLines = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim());
  if (!dataLines.length) return null;
  const data = dataLines.join("\n");
  if (data === "[DONE]") return null;
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseNdjsonLine(line: string) {
  try {
    const parsed = JSON.parse(line) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function emitLooseNdjsonObjects(text: string, send: (event: string, data: unknown) => void) {
  const source = unwrapJsonString(text);
  const result = {
    timelineItems: 0,
    choices: false,
    directorUpdate: false,
    emitted: false,
    remaining: source
  };
  let searchIndex = 0;
  let consumedUntil = 0;

  while (searchIndex < source.length) {
    const start = source.indexOf("{", searchIndex);
    if (start === -1) break;
    const end = findJsonObjectEnd(source, start);
    if (end === -1) break;
    const parsed = parseNdjsonLine(source.slice(start, end + 1));
    if (parsed) {
      const emitted = emitNdjsonObject(parsed, send);
      if (emitted) {
        result.emitted = true;
        consumedUntil = end + 1;
        if (emitted === "timeline_item") result.timelineItems += 1;
        if (emitted === "choices") result.choices = true;
        if (emitted === "director_update") result.directorUpdate = true;
      }
    }
    searchIndex = end + 1;
  }

  result.remaining = result.emitted ? source.slice(consumedUntil) : source;
  return result;
}

function unwrapJsonString(text: string) {
  const trimmed = text.trim();
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === "string") return parsed;
  } catch {
    // Keep the original text unless it clearly looks like a JSON string fragment.
  }
  if (trimmed.includes('\\"type\\"')) {
    return trimmed.replace(/^"|"$/g, "").replace(/\\"/g, '"').replace(/\\n/g, "\n");
  }
  return trimmed;
}

function findJsonObjectEnd(text: string, start: number) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function emitNdjsonObject(raw: Record<string, unknown>, send: (event: string, data: unknown) => void) {
  const type = String(raw.type ?? "").toLowerCase();
  if (type === "narration") {
    send("timeline_item", { type: "narration", characterName: null, content: String(raw.content ?? "") } satisfies TimelineItem);
    return "timeline_item";
  }
  if (type === "dialogue" || type === "character" || type === "action") {
    send("timeline_item", {
      type: "character",
      characterName: String(raw.speaker ?? raw.characterName ?? "語り手"),
      content: String(raw.content ?? "")
    } satisfies TimelineItem);
    return "timeline_item";
  }
  if (type === "choices") {
    const rawItems = Array.isArray(raw.items) ? raw.items : [];
    const items: SuggestedReply[] = rawItems
      .map((item) => normalizeChoice(item))
      .filter((item): item is SuggestedReply => Boolean(item));
    send("choices", { items });
    return "choices";
  }
  if (type === "director" || type === "directorupdate") {
    send("director_update", normalizeDirectorUpdate(raw));
    return "director_update";
  }
  if (type === "smart_replies" || type === "smartreplies") {
    const rawReplies = Array.isArray(raw.replies) ? raw.replies : Array.isArray(raw.items) ? raw.items : [];
    const replies = rawReplies.map(normalizeSmartReply).filter((item): item is SmartReply => Boolean(item));
    send("smart_replies", { replies });
    return "smart_replies";
  }
  return null;
}

function normalizeChoice(raw: unknown): SuggestedReply | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const label = String(record.label ?? "").trim();
  if (!label) return null;
  return {
    id: typeof record.id === "string" ? record.id : newId("choice"),
    label,
    type: normalizeChoiceType(record.type),
    effect: normalizeChoiceEffect(record.effect),
    intent: nullableString(record.intent) as SuggestedReply["intent"],
    tone: nullableString(record.tone) as SuggestedReply["tone"],
    agency: nullableString(record.agency) as SuggestedReply["agency"],
    choiceStyle: nullableString(record.choiceStyle) as SuggestedReply["choiceStyle"],
    progression: nullableString(record.progression) as SuggestedReply["progression"],
    romanceLevel: nullableNumber(record.romanceLevel),
    intimacyLevel: nullableNumber(record.intimacyLevel),
    riskLevel: nullableString(record.riskLevel),
    why: nullableString(record.why)
  };
}

function normalizeSmartReply(raw: unknown): SmartReply | null {
  if (typeof raw === "string") {
    const label = raw.trim();
    return label ? { id: newId("sr"), label, intent: null, tone: null, agency: null } : null;
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const label = String(record.label ?? "").trim();
  if (!label) return null;
  return {
    id: typeof record.id === "string" ? record.id : newId("sr"),
    label,
    intent: nullableString(record.intent) as SmartReply["intent"],
    tone: nullableString(record.tone) as SmartReply["tone"],
    agency: nullableString(record.agency) as SmartReply["agency"]
  };
}

function normalizeChoiceEffect(raw: unknown): SuggestedReply["effect"] {
  const record = raw && typeof raw === "object" && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  return {
    trust: numberOrDefault(record.trust, 0),
    affection: numberOrDefault(record.affection, 0),
    comfort: numberOrDefault(record.comfort, 0),
    curiosity: numberOrDefault(record.curiosity, 1),
    tension: numberOrDefault(record.tension, 0)
  };
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function numberOrDefault(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeChoiceType(value: unknown): ChoiceType {
  const type = String(value ?? "talk");
  const allowed = new Set<ChoiceType>(["talk", "action", "observe", "silence", "approach", "leave", "question", "avoid", "honest", "flirt", "intimate"]);
  return allowed.has(type as ChoiceType) ? (type as ChoiceType) : "talk";
}

function normalizeDirectorUpdate(raw: Record<string, unknown>): DirectorUpdate {
  const data = raw.data && typeof raw.data === "object" && !Array.isArray(raw.data) ? raw.data as Record<string, unknown> : raw;
  return {
    currentBeatIndex: Number(data.currentBeatIndex ?? data.current_beat_index ?? 0),
    objectiveCompleted: Boolean(data.objectiveCompleted ?? data.objective_completed ?? false),
    stallRisk: normalizeStallRisk(data.stallRisk ?? data.stall_risk),
    shouldAdvanceScene: Boolean(data.shouldAdvanceScene ?? data.should_advance_scene ?? false),
    shouldIntroduceEvent: Boolean(data.shouldIntroduceEvent ?? data.should_introduce_event ?? false),
    introducedHook: typeof data.introducedHook === "string" ? data.introducedHook : typeof data.hook === "string" ? data.hook : null,
    reason: String(data.reason ?? data.scene_objective ?? "")
  };
}

function normalizeStallRisk(value: unknown): DirectorUpdate["stallRisk"] {
  if (value === "medium" || value === "high" || value === "low") return value;
  return "low";
}

function defaultDirectorUpdate(payload: ConversationRequest): DirectorUpdate {
  return {
    currentBeatIndex: payload.session.current_beat_index ?? 0,
    objectiveCompleted: false,
    stallRisk: "low",
    shouldAdvanceScene: false,
    shouldIntroduceEvent: false,
    introducedHook: null,
    reason: "ストリーム応答に director が含まれなかったため、現在シーンを維持します。"
  };
}
