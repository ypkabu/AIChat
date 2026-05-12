import { NextResponse } from "next/server";
import { z } from "zod";
import { DEFAULT_RELATIONSHIP } from "@/lib/domain/constants";
import { calcCostJpy } from "@/lib/ai/costCalc";
import { estimateTokenLikeCount } from "@/lib/utils";
import type { BackgroundJobsResponse } from "@/lib/ai/types";

const relationshipSchema = z.object({
  trust: z.number().int().min(-5).max(5).default(0),
  affection: z.number().int().min(-5).max(5).default(0),
  comfort: z.number().int().min(-5).max(5).default(0),
  curiosity: z.number().int().min(-5).max(5).default(0),
  tension: z.number().int().min(-5).max(5).default(0)
});

const backgroundSchema = z.object({
  foreshadowingUpdates: z.array(
    z.object({
      action: z.enum(["create", "introduce", "reinforce", "mark_ready", "reveal", "discard"]),
      foreshadowingId: z.string().nullable().default(null),
      title: z.string().default(""),
      clueText: z.string().default(""),
      hiddenTruth: z.string().nullable().default(null),
      importance: z.number().int().min(1).max(5).default(3),
      relatedCharacterName: z.string().nullable().default(null),
      plannedRevealSceneKey: z.string().nullable().default(null),
      revealCondition: z.object({
        sceneKey: z.string().nullable().default(null),
        flagKey: z.string().nullable().default(null),
        relationshipHint: z.string().nullable().default(null),
        notes: z.string().nullable().default(null)
      }).default({
        sceneKey: null,
        flagKey: null,
        relationshipHint: null,
        notes: null
      }),
      revealedText: z.string().nullable().default(null),
      reason: z.string().default("")
    })
  ).default([]),
  memoryCandidates: z.array(
    z.object({
      content: z.string().min(1),
      type: z.enum([
        "user_memory",
        "character_memory",
        "relationship_memory",
        "story_memory",
        "promise",
        "preference",
        "sensitive",
        "explicit"
      ]).default("story_memory"),
      importance: z.number().int().min(1).max(5).default(3),
      sensitivity: z.enum(["normal", "sensitive", "explicit"]).default("normal"),
      reason: z.string().default("")
    })
  ).default([]),
  relationshipDelta: relationshipSchema.default(DEFAULT_RELATIONSHIP),
  imageCue: z.object({
    shouldSuggestImage: z.boolean().default(false),
    reason: z.string().nullable().default(null),
    sceneType: z.string().nullable().default(null),
    nsfwLevel: z.enum(["none", "suggestive", "explicit"]).default("none")
  }).default({
    shouldSuggestImage: false,
    reason: null,
    sceneType: null,
    nsfwLevel: "none"
  }),
  visualCue: z.object({
    shouldUpdateVisual: z.boolean().default(false),
    updateType: z.enum(["none", "base_scene", "expression_variant", "event_cg"]).default("none"),
    reason: z.string().nullable().default(null),
    sceneKey: z.string().nullable().default(null),
    location: z.string().nullable().default(null),
    timeOfDay: z.string().nullable().default(null),
    weather: z.string().nullable().default(null),
    activeCharacters: z.array(z.string()).default([]),
    targetCharacter: z.string().nullable().default(null),
    expression: z.enum(["neutral", "annoyed", "smile", "blush", "serious", "surprised", "worried", "embarrassed"]).nullable().default(null),
    pose: z.string().nullable().default(null),
    cameraDistance: z.enum(["close", "medium", "wide"]).default("medium"),
    pov: z.enum(["first_person", "third_person"]).default("first_person"),
    priority: z.enum(["low", "medium", "high"]).default("low"),
    qualityPreset: z.enum(["draft", "standard", "high", "ultra"]).default("standard"),
    eventCg: z.boolean().default(false),
    promptSummary: z.string().nullable().default(null)
  }).default({
    shouldUpdateVisual: false,
    updateType: "none",
    reason: null,
    sceneKey: null,
    location: null,
    timeOfDay: null,
    weather: null,
    activeCharacters: [],
    targetCharacter: null,
    expression: null,
    pose: null,
    cameraDistance: "medium",
    pov: "first_person",
    priority: "low",
    qualityPreset: "standard",
    eventCg: false,
    promptSummary: null
  }),
  infoboxUpdate: z.object({
    environment: z.object({
      date: z.string().nullable().default(null),
      time: z.string().nullable().default(null),
      location: z.string().nullable().default(null),
      weather: z.string().nullable().default(null),
      scene: z.string().nullable().default(null),
      current_objective: z.string().nullable().default(null),
      recent_event: z.string().nullable().default(null),
      next_pressure: z.string().nullable().default(null),
      chapter: z.string().nullable().default(null),
      scene_key: z.string().nullable().default(null)
    }).partial().nullable().default(null),
    characterStates: z.array(
      z.object({
        characterId: z.string().min(1),
        updates: z.object({
          mood: z.string().nullable().default(null),
          condition: z.string().nullable().default(null),
          outfit: z.string().nullable().default(null),
          pose: z.string().nullable().default(null),
          goal: z.string().nullable().default(null),
          relationship: z.string().nullable().default(null),
          inner_thoughts: z.string().nullable().default(null),
          inventory: z.string().nullable().default(null),
          hidden_intent: z.string().nullable().default(null),
          last_action: z.string().nullable().default(null)
        }).partial().default({})
      })
    ).default([])
  }).default({
    environment: null,
    characterStates: []
  })
});

const requestSchema = z.object({
  bundle: z.any(),
  session: z.any(),
  messages: z.array(z.any()),
  aiMessages: z.array(z.any()).default([]),
  response: z.any().optional(),
  userInput: z.string().default(""),
  settings: z.any(),
  environmentState: z.any().nullable().optional(),
  characterStates: z.array(z.any()).optional(),
  relationships: z.array(z.any()).default([]),
  foreshadowingItems: z.array(z.any()).default([])
});

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["foreshadowingUpdates", "memoryCandidates", "relationshipDelta", "imageCue", "visualCue", "infoboxUpdate"],
  properties: {
    foreshadowingUpdates: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "action",
          "foreshadowingId",
          "title",
          "clueText",
          "hiddenTruth",
          "importance",
          "relatedCharacterName",
          "plannedRevealSceneKey",
          "revealCondition",
          "revealedText",
          "reason"
        ],
        properties: {
          action: { type: "string", enum: ["create", "introduce", "reinforce", "mark_ready", "reveal", "discard"] },
          foreshadowingId: { type: ["string", "null"] },
          title: { type: "string" },
          clueText: { type: "string" },
          hiddenTruth: { type: ["string", "null"] },
          importance: { type: "integer", minimum: 1, maximum: 5 },
          relatedCharacterName: { type: ["string", "null"] },
          plannedRevealSceneKey: { type: ["string", "null"] },
          revealCondition: {
            type: "object",
            additionalProperties: false,
            required: ["sceneKey", "flagKey", "relationshipHint", "notes"],
            properties: {
              sceneKey: { type: ["string", "null"] },
              flagKey: { type: ["string", "null"] },
              relationshipHint: { type: ["string", "null"] },
              notes: { type: ["string", "null"] }
            }
          },
          revealedText: { type: ["string", "null"] },
          reason: { type: "string" }
        }
      }
    },
    memoryCandidates: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["content", "type", "importance", "sensitivity", "reason"],
        properties: {
          content: { type: "string" },
          type: {
            type: "string",
            enum: ["user_memory", "character_memory", "relationship_memory", "story_memory", "promise", "preference", "sensitive", "explicit"]
          },
          importance: { type: "integer", minimum: 1, maximum: 5 },
          sensitivity: { type: "string", enum: ["normal", "sensitive", "explicit"] },
          reason: { type: "string" }
        }
      }
    },
    relationshipDelta: relationshipJsonSchema(),
    imageCue: {
      type: "object",
      additionalProperties: false,
      required: ["shouldSuggestImage", "reason", "sceneType", "nsfwLevel"],
      properties: {
        shouldSuggestImage: { type: "boolean" },
        reason: { type: ["string", "null"] },
        sceneType: { type: ["string", "null"] },
        nsfwLevel: { type: "string", enum: ["none", "suggestive", "explicit"] }
      }
    },
    visualCue: {
      type: "object",
      additionalProperties: false,
      required: ["shouldUpdateVisual", "updateType", "reason", "sceneKey", "location", "timeOfDay", "weather", "activeCharacters", "targetCharacter", "expression", "pose", "cameraDistance", "pov", "priority", "qualityPreset", "eventCg", "promptSummary"],
      properties: {
        shouldUpdateVisual: { type: "boolean" },
        updateType: { type: "string", enum: ["none", "base_scene", "expression_variant", "event_cg"] },
        reason: { type: ["string", "null"] },
        sceneKey: { type: ["string", "null"] },
        location: { type: ["string", "null"] },
        timeOfDay: { type: ["string", "null"] },
        weather: { type: ["string", "null"] },
        activeCharacters: { type: "array", items: { type: "string" } },
        targetCharacter: { type: ["string", "null"] },
        expression: { type: ["string", "null"], enum: ["neutral", "annoyed", "smile", "blush", "serious", "surprised", "worried", "embarrassed", null] },
        pose: { type: ["string", "null"] },
        cameraDistance: { type: "string", enum: ["close", "medium", "wide"] },
        pov: { type: "string", enum: ["first_person", "third_person"] },
        priority: { type: "string", enum: ["low", "medium", "high"] },
        qualityPreset: { type: "string", enum: ["draft", "standard", "high", "ultra"] },
        eventCg: { type: "boolean" },
        promptSummary: { type: ["string", "null"] }
      }
    },
    infoboxUpdate: {
      type: "object",
      additionalProperties: false,
      required: ["environment", "characterStates"],
      properties: {
        environment: {
          type: ["object", "null"],
          additionalProperties: false,
          required: ["date", "time", "location", "weather", "scene", "current_objective", "recent_event", "next_pressure", "chapter", "scene_key"],
          properties: {
            date: { type: ["string", "null"] },
            time: { type: ["string", "null"] },
            location: { type: ["string", "null"] },
            weather: { type: ["string", "null"] },
            scene: { type: ["string", "null"] },
            current_objective: { type: ["string", "null"] },
            recent_event: { type: ["string", "null"] },
            next_pressure: { type: ["string", "null"] },
            chapter: { type: ["string", "null"] },
            scene_key: { type: ["string", "null"] }
          }
        },
        characterStates: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["characterId", "updates"],
            properties: {
              characterId: { type: "string" },
              updates: {
                type: "object",
                additionalProperties: false,
                required: ["mood", "condition", "outfit", "pose", "goal", "relationship", "inner_thoughts", "inventory", "hidden_intent", "last_action"],
                properties: {
                  mood: { type: ["string", "null"] },
                  condition: { type: ["string", "null"] },
                  outfit: { type: ["string", "null"] },
                  pose: { type: ["string", "null"] },
                  goal: { type: ["string", "null"] },
                  relationship: { type: ["string", "null"] },
                  inner_thoughts: { type: ["string", "null"] },
                  inventory: { type: ["string", "null"] },
                  hidden_intent: { type: ["string", "null"] },
                  last_action: { type: ["string", "null"] }
                }
              }
            }
          }
        }
      }
    }
  }
} as const;

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{ content?: Array<{ text?: string }> }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid background job request" }, { status: 400 });
  }

  const payload = parsed.data;
  // Background jobs use smart_reply or cheap model to keep cost low
  const provider =
    payload.settings.smart_reply_provider ||
    payload.settings.cheap_conversation_provider ||
    payload.settings.normal_conversation_provider ||
    "openai";
  const model =
    payload.settings.smart_reply_model ||
    payload.settings.cheap_conversation_model ||
    payload.settings.normal_conversation_model ||
    "gpt-4.1-mini";
  const backend = `background:${provider}:${model}`;
  const prompt = buildBackgroundPrompt(payload);

  if (provider !== "openai" || !process.env.OPENAI_API_KEY) {
    const result = heuristicBackgroundResult(payload);
    return NextResponse.json(withUsage(result, backend, provider, model, prompt));
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "developer",
            content: [
              "あなたはメイン会話表示後に動く、安価なバックグラウンド解析器です。",
              "直近timelineから伏線更新、記憶候補、関係値変化、画像化候補、シーン背景cueを抽出します。",
              "Info Box 更新は env/character の短い状態だけを返してください。必要な変更がなければ空配列/空値で構いません。",
              "伏線更新がなければ foreshadowingUpdates: [] を返してください。キーが必要です。",
              "planned の既存伏線を初めて本文に出した場合は introduce、introduced/developing/ready を重ねた場合だけ reinforce を使ってください。",
              "sensitive/explicit memory はユーザーが明示した内容だけ。推測で保存候補にしない。",
              "imageCue は重要イベント/章開始/特別分岐の候補判定だけです。毎ターン画像化候補を出さない。",
              "visualCue: シーン背景画像の更新指示。shouldUpdateVisual=trueにする条件: 場所移動(base_scene)、新キャラ登場(base_scene)、感情が大きく変化(expression_variant)、重要イベント(event_cg)、章開始(base_scene)。通常の会話継続中はshouldUpdateVisual=false。同じ場所/キャラ/状況の会話継続は shouldUpdateVisual=false。sceneKeyは場所+状況を表す英語スネークケース例: classroom_afternoon、inn_room_night。expressionは登場キャラの現在の感情。promptSummaryは50字以内でシーンを説明。",
              "非合意、近親、実在人物性的ディープフェイク、搾取、違法、動物との性的内容など禁止カテゴリは除外します。",
              "hidden_intent と inner_thoughts は非公開情報。本文や選択肢に直接出さないために使ってよいが、UI表示は Debug のみです。",
              "JSONのみ返してください。"
            ].join("\n")
          },
          {
            role: "user",
            content: prompt
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "story_background_jobs",
            strict: true,
            schema: responseJsonSchema
          }
        },
        max_output_tokens: 800
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error("Background jobs request failed", response.status, raw);
      throw new Error(`OpenAI API error ${response.status}`);
    }

    const data = JSON.parse(raw) as OpenAIResponse;
    const outputText = extractOutputText(data);
    const result = backgroundSchema.parse(JSON.parse(outputText));
    const bgInputTokens = data.usage?.input_tokens ?? estimateTokenLikeCount(prompt);
    const bgOutputTokens = data.usage?.output_tokens ?? estimateTokenLikeCount(outputText);
    return NextResponse.json({
      ...result,
      usage: {
        backend,
        provider,
        model,
        input_tokens: bgInputTokens,
        output_tokens: bgOutputTokens,
        estimated_cost_jpy: calcCostJpy(model, bgInputTokens, bgOutputTokens)
      }
    } satisfies BackgroundJobsResponse);
  } catch (error) {
    console.error("Background jobs failed; using heuristic fallback", error);
    const result = heuristicBackgroundResult(payload);
    return NextResponse.json(withUsage(result, backend, provider, model, prompt, error));
  }
}

function buildBackgroundPrompt(payload: z.infer<typeof requestSchema>) {
  const characters = Array.isArray(payload.bundle?.characters)
    ? payload.bundle.characters.map((character: Record<string, unknown>) => `${character.name ?? ""}: ${character.role ?? ""}`).join(" / ")
    : "";
  const currentCharacterNames = new Set(
    payload.aiMessages
      .map((message: Record<string, unknown>) => String(message.speaker_name ?? "").toLowerCase())
      .filter(Boolean)
  );
  const currentCharacterIds = new Set(
    (Array.isArray(payload.bundle?.characters) ? payload.bundle.characters : [])
      .filter((character: Record<string, unknown>) => currentCharacterNames.has(String(character.name ?? "").toLowerCase()))
      .map((character: Record<string, unknown>) => String(character.id ?? "").toLowerCase())
      .filter(Boolean)
  );
  const activeForeshadowing = payload.foreshadowingItems
    .filter((item: Record<string, unknown>) => ["planned", "introduced", "developing", "ready"].includes(String(item.status ?? "")))
    .filter((item: Record<string, unknown>) => {
      const importance = Number(item.importance ?? 0);
      if (importance >= 4) return true;
      const related = String(item.related_character_name ?? item.related_character_id ?? "").toLowerCase();
      return Boolean(related && (currentCharacterNames.has(related) || currentCharacterIds.has(related)));
    })
    .slice(0, 8)
    .map((item: Record<string, unknown>) =>
      `id=${item.id}; title=${item.title}; status=${item.status}; importance=${item.importance}; clue=${item.clue_text}; hiddenTruth=${item.hidden_truth ?? ""}`
    )
    .join("\n");
  const timeline = payload.aiMessages
    .slice(-8)
    .map((message: Record<string, unknown>) => `${message.message_type ?? "message"} / ${message.speaker_name ?? ""}: ${message.content ?? ""}`)
    .join("\n");
  const environmentState = isRecord(payload.environmentState) ? payload.environmentState : null;
  const environmentSummary = environmentState
    ? [
        envLabel("date", environmentState),
        envLabel("time", environmentState),
        envLabel("location", environmentState),
        envLabel("weather", environmentState),
        envLabel("scene", environmentState),
        envLabel("current_objective", environmentState),
        envLabel("recent_event", environmentState),
        envLabel("next_pressure", environmentState),
        envLabel("chapter", environmentState),
        envLabel("scene_key", environmentState)
      ]
        .filter(Boolean)
        .join(" / ")
    : "";
  const characterStates = Array.isArray(payload.characterStates) ? payload.characterStates : [];
  const characterList = Array.isArray(payload.bundle?.characters) ? payload.bundle.characters : [];
  const characterStateLines = characterStates
    .map((state: Record<string, unknown>) => {
      const characterId = String(state.character_id ?? state.characterId ?? "");
      if (!characterId) return "";
      const character = characterList.find((item: Record<string, unknown>) => String(item.id) === characterId);
      const name = character?.name ?? characterId;
      const parts = [
        fieldLabel("mood", state),
        fieldLabel("condition", state),
        fieldLabel("outfit", state),
        fieldLabel("pose", state),
        fieldLabel("goal", state),
        fieldLabel("relationship", state),
        fieldLabel("inventory", state),
        fieldLabel("last_action", state),
        fieldLabel("inner_thoughts", state),
        fieldLabel("hidden_intent", state)
      ]
        .filter(Boolean)
        .join(" / ");
      return parts ? `- ${name}: ${parts}` : `- ${name}: (no data)`;
    })
    .filter(Boolean)
    .join("\n");

  return [
    `scenario=${payload.bundle?.scenario?.title ?? ""}`,
    `scene=${payload.session?.current_scene_key ?? ""}`,
    `sceneObjective=${payload.session?.scene_objective ?? payload.bundle?.scenario?.objective ?? ""}`,
    `userInput=${payload.userInput}`,
    `characters=${characters}`,
    "recentTimeline:",
    timeline,
    environmentSummary ? ["environmentState:", environmentSummary].join(" ") : "environmentState: none",
    characterStateLines ? ["characterStates:", characterStateLines].join("\n") : "characterStates: none",
    activeForeshadowing ? ["activeForeshadowing:", activeForeshadowing].join("\n") : "activeForeshadowing: none",
    "hiddenTruth はUIに表示しない非公開管理情報です。reveal 条件を満たすまで本文用の revealedText に出さない。"
  ].join("\n");
}

function envLabel(key: string, state: Record<string, unknown>) {
  const value = state[key];
  if (typeof value !== "string" || value.trim().length === 0) return "";
  return `${key}=${trimText(value, 80)}`;
}

function fieldLabel(key: string, state: Record<string, unknown>) {
  const value = state[key];
  if (typeof value !== "string" || value.trim().length === 0) return "";
  return `${key}=${trimText(value, 70)}`;
}

function heuristicBackgroundResult(payload: z.infer<typeof requestSchema>) {
  const text = payload.aiMessages.map((message: Record<string, unknown>) => String(message.content ?? "")).join("\n");
  const imageWorthiness = /章|扉|夜明け|光|秘密|告白|対決|到着|発見|分岐|イベント|鍵|手がかり/.test(text);
  const curiosity = /手がかり|秘密|違和感|発見|鍵/.test(text) ? 1 : 0;
  const session = isRecord(payload.session) ? payload.session : {};
  const scenario = isRecord(payload.bundle?.scenario) ? payload.bundle?.scenario : {};
  return {
    foreshadowingUpdates: [],
    memoryCandidates: buildHeuristicMemoryCandidate(payload),
    relationshipDelta: {
      ...DEFAULT_RELATIONSHIP,
      curiosity
    },
    imageCue: {
      shouldSuggestImage: Boolean(payload.settings?.suggest_images_on_major_events && imageWorthiness),
      reason: imageWorthiness ? "重要な節目として画像化候補にできます。" : null,
      sceneType: imageWorthiness ? "story_event" : null,
      nsfwLevel: "none" as const
    },
    infoboxUpdate: {
      environment: {
        chapter: typeof session.chapter_index === "number" ? `第${session.chapter_index}章` : null,
        scene_key: typeof session.current_scene_key === "string" ? session.current_scene_key : null,
        current_objective: typeof session.scene_objective === "string" && session.scene_objective.trim().length > 0
          ? session.scene_objective
          : typeof scenario.objective === "string"
            ? scenario.objective
            : null
      },
      characterStates: []
    },
    visualCue: {
      shouldUpdateVisual: false,
      updateType: "none",
      reason: null,
      sceneKey: null,
      location: null,
      timeOfDay: null,
      weather: null,
      activeCharacters: [],
      targetCharacter: null,
      expression: null,
      pose: null,
      cameraDistance: "medium",
      pov: "first_person",
      priority: "low",
      qualityPreset: "standard",
      eventCg: false,
      promptSummary: null
    }
  } satisfies Omit<BackgroundJobsResponse, "usage">;
}

function buildHeuristicMemoryCandidate(payload: z.infer<typeof requestSchema>) {
  const input = String(payload.userInput ?? "").trim();
  if (!input || input.startsWith("（オート進行")) return [];
  if (input.length < 8) return [];
  return [
    {
      content: `ユーザーは「${input.slice(0, 80)}」と反応した。`,
      type: "story_memory" as const,
      importance: 2,
      sensitivity: "normal" as const,
      reason: "直近の会話反応として後で参照できる可能性があるため。"
    }
  ];
}

function withUsage(
  result: Omit<BackgroundJobsResponse, "usage">,
  backend: string,
  provider: string,
  model: string,
  prompt: string,
  error?: unknown
): BackgroundJobsResponse {
  const body = JSON.stringify(result);
  const fbInput = estimateTokenLikeCount(prompt);
  const fbOutput = estimateTokenLikeCount(body);
  return {
    ...result,
    usage: {
      backend,
      provider,
      model,
      input_tokens: fbInput,
      output_tokens: fbOutput,
      estimated_cost_jpy: calcCostJpy(model, fbInput, fbOutput),
      ...(error ? { error: error instanceof Error ? error.message : "background jobs failed" } : {})
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function trimText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function relationshipJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["trust", "affection", "comfort", "curiosity", "tension"],
    properties: {
      trust: { type: "integer", minimum: -5, maximum: 5 },
      affection: { type: "integer", minimum: -5, maximum: 5 },
      comfort: { type: "integer", minimum: -5, maximum: 5 },
      curiosity: { type: "integer", minimum: -5, maximum: 5 },
      tension: { type: "integer", minimum: -5, maximum: 5 }
    }
  } as const;
}

function extractOutputText(response: OpenAIResponse) {
  if (response.output_text) return response.output_text;
  return response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim() ?? "";
}
