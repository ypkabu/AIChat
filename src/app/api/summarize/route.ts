import { NextResponse } from "next/server";
import { z } from "zod";
import { calcCostJpy } from "@/lib/ai/costCalc";
import { estimateTokenLikeCount } from "@/lib/utils";

const requestSchema = z.object({
  messages: z.array(z.any()),
  settings: z.any(),
  scenarioTitle: z.string().optional(),
  sceneObjective: z.string().optional()
});

const summarySchema = z.object({
  summary: z.string().min(1)
});

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary"],
  properties: {
    summary: { type: "string" }
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
    return NextResponse.json({ error: "Invalid summarize request" }, { status: 400 });
  }

  const payload = parsed.data;
  // Prefer dedicated summary model, fall back to cheap → normal → openai defaults
  const provider =
    payload.settings.summary_provider ||
    payload.settings.cheap_conversation_provider ||
    payload.settings.normal_conversation_provider ||
    "openai";
  const model =
    payload.settings.summary_model ||
    payload.settings.cheap_conversation_model ||
    payload.settings.normal_conversation_model ||
    "gpt-4.1-mini";
  const backend = `summary:${provider}:${model}`;
  const prompt = buildSummaryPrompt(payload.messages, payload.scenarioTitle, payload.sceneObjective);

  if (provider !== "openai" || !process.env.OPENAI_API_KEY) {
    const summary = heuristicSummary(payload.messages);
    return NextResponse.json({
      summary,
      usage: usage(backend, provider, model, prompt, summary)
    });
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
              "以下の会話履歴を構造化サマリーに変換しろ。",
              "以下の項目を必ず含めること。抜けがあってはならない。",
              "",
              "【現在地】: 現在の場所/場面/状況",
              "【重要イベント】: 物語上の重要イベントや変化",
              "【関係性変化】: 誰が誰に対してどう感じ、関係がどう変わったか",
              "【未回収伏線】: まだ回収していない伏線・違和感",
              "【約束】: キャラやユーザーが決めたこと、約束したこと",
              "【重要選択】: ユーザーが行った重要な選択",
              "【次の目的】: 次に目指すべき目的や課題",
              "【{{user}}が話したこと】: ユーザーが自分について話した内容",
              "",
              "出力は箇条書き。各項目2〜4行。",
              "情報がない項目は「なし」と書け。",
              "JSONのみ返す。"
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
            name: "structured_story_summary",
            strict: true,
            schema: responseJsonSchema
          }
        },
        max_output_tokens: 900
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error("Summary request failed", response.status, raw);
      throw new Error(`OpenAI API error ${response.status}`);
    }

    const data = JSON.parse(raw) as OpenAIResponse;
    const outputText = extractOutputText(data);
    const result = summarySchema.parse(JSON.parse(outputText));
    const sInput = data.usage?.input_tokens ?? estimateTokenLikeCount(prompt);
    const sOutput = data.usage?.output_tokens ?? estimateTokenLikeCount(result.summary);
    return NextResponse.json({
      summary: result.summary,
      usage: {
        backend,
        provider,
        model,
        input_tokens: sInput,
        output_tokens: sOutput,
        estimated_cost_jpy: calcCostJpy(model, sInput, sOutput)
      }
    });
  } catch (error) {
    console.error("Summary failed; using heuristic fallback", error);
    const summary = heuristicSummary(payload.messages);
    return NextResponse.json({
      summary,
      usage: {
        ...usage(backend, provider, model, prompt, summary),
        error: error instanceof Error ? error.message : "summary failed"
      }
    });
  }
}

function buildSummaryPrompt(messages: Array<Record<string, unknown>>, scenarioTitle?: string, sceneObjective?: string) {
  const compact = messages
    .map((message, index) => {
      const speaker = message.speaker_name ?? message.speaker_type ?? message.role ?? "unknown";
      return `${index + 1}. ${message.message_type ?? "message"} / ${speaker}: ${message.content ?? ""}`;
    })
    .join("\n");
  return [`scenario=${scenarioTitle ?? ""}`, `sceneObjective=${sceneObjective ?? ""}`, "会話履歴:", compact].join("\n");
}

function heuristicSummary(messages: Array<Record<string, unknown>>) {
  const text = messages.map((message) => `${message.speaker_name ?? message.role ?? "unknown"}: ${message.content ?? ""}`).join("\n");
  const userLines = messages
    .filter((message) => message.role === "user")
    .map((message) => String(message.content ?? ""))
    .filter(Boolean)
    .slice(0, 3);
  return [
    "現在地:",
    "- なし",
    "重要イベント:",
    `- ${text.slice(0, 180) || "なし"}`,
    "関係性変化:",
    "- 会話の流れに応じて関係が少し変化した可能性がある。",
    "未回収伏線:",
    "- なし",
    "約束:",
    "- なし",
    "重要選択:",
    "- なし",
    "次の目的:",
    "- 現在の場面目的の続き。",
    "{{user}}が話したこと:",
    userLines.length ? userLines.map((line) => `- ${line.slice(0, 120)}`).join("\n") : "- なし"
  ].join("\n");
}

function usage(backend: string, provider: string, model: string, prompt: string, output: string) {
  const inp = estimateTokenLikeCount(prompt);
  const out = estimateTokenLikeCount(output);
  return {
    backend,
    provider,
    model,
    input_tokens: inp,
    output_tokens: out,
    estimated_cost_jpy: calcCostJpy(model, inp, out)
  };
}

function extractOutputText(response: OpenAIResponse) {
  if (response.output_text) return response.output_text;
  return response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim() ?? "";
}
