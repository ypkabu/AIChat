import { NextResponse } from "next/server";
import { z } from "zod";
import { calcCostJpy } from "@/lib/ai/costCalc";
import { estimateTokenLikeCount } from "@/lib/utils";

const qualitySchema = z.object({
  isRepetitive: z.boolean().default(false),
  hasNewInformation: z.boolean().default(false),
  hasCharacterAction: z.boolean().default(false),
  hasEmotionalChange: z.boolean().default(false),
  hasRelationshipChange: z.boolean().default(false),
  hasSceneChange: z.boolean().default(false),
  hasForeshadowing: z.boolean().default(false),
  hasChoicePressure: z.boolean().default(false),
  hasForwardMotion: z.boolean().default(true),
  isStalling: z.boolean().default(false),
  sceneObjectiveProgress: z.enum(["low", "medium", "high"]).default("medium"),
  qualityScore: z.number().int().min(0).max(10).default(7),
  problem: z.string().nullable().default(null),
  improvementHint: z.string().nullable().default(null)
});

const requestSchema = z.object({
  session: z.any(),
  messages: z.array(z.any()),
  settings: z.any(),
  scenarioTitle: z.string().optional(),
  sceneObjective: z.string().optional(),
  foreshadowingItems: z.array(z.any()).optional()
});

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "isRepetitive",
    "hasNewInformation",
    "hasCharacterAction",
    "hasEmotionalChange",
    "hasRelationshipChange",
    "hasSceneChange",
    "hasForeshadowing",
    "hasChoicePressure",
    "hasForwardMotion",
    "isStalling",
    "sceneObjectiveProgress",
    "qualityScore",
    "problem",
    "improvementHint"
  ],
  properties: {
    isRepetitive: { type: "boolean" },
    hasNewInformation: { type: "boolean" },
    hasCharacterAction: { type: "boolean" },
    hasEmotionalChange: { type: "boolean" },
    hasRelationshipChange: { type: "boolean" },
    hasSceneChange: { type: "boolean" },
    hasForeshadowing: { type: "boolean" },
    hasChoicePressure: { type: "boolean" },
    hasForwardMotion: { type: "boolean" },
    isStalling: { type: "boolean" },
    sceneObjectiveProgress: { type: "string", enum: ["low", "medium", "high"] },
    qualityScore: { type: "integer", minimum: 0, maximum: 10 },
    problem: { type: ["string", "null"] },
    improvementHint: { type: ["string", "null"] }
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
    return NextResponse.json({ error: "Invalid quality check request" }, { status: 400 });
  }

  const payload = parsed.data;
  // Quality check uses cheap/smart_reply model to keep cost low
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
  const backend = `quality:${provider}:${model}`;
  const prompt = buildQualityPrompt(payload.messages, payload.session, payload.scenarioTitle, payload.sceneObjective, payload.foreshadowingItems);

  if (provider !== "openai" || !process.env.OPENAI_API_KEY) {
    const qualityCheck = heuristicQualityCheck(payload.messages, payload.foreshadowingItems, payload.session);
    const hInput = estimateTokenLikeCount(prompt);
    const hOutput = estimateTokenLikeCount(JSON.stringify(qualityCheck));
    return NextResponse.json({
      qualityCheck,
      usage: {
        backend,
        provider,
        model,
        input_tokens: hInput,
        output_tokens: hOutput,
        estimated_cost_jpy: calcCostJpy(model, hInput, hOutput)
      }
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
              "あなたは会話ログの物語品質を採点する安価なバックグラウンド評価器です。",
              "直近3ターン分のtimelineだけを見て、各項目を0 or 1相当のbooleanで判定します。",
              "qualityScore は true の項目数の合計で 0〜10。",
              "qualityScore が4以下なら problem に低かった項目名を列挙し、improvementHint に次ターンの改善指示を書く。",
              "qualityScore が5以上なら problem と improvementHint は null。",
              "ユーザーには直接表示しない内部データです。JSONのみ返してください。"
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
            name: "narrative_quality_check",
            strict: true,
            schema: responseJsonSchema
          }
        },
        max_output_tokens: 500
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error("Quality check request failed", response.status, raw);
      throw new Error(`OpenAI API error ${response.status}`);
    }

    const data = JSON.parse(raw) as OpenAIResponse;
    const outputText = extractOutputText(data);
    const qualityCheck = qualitySchema.parse(JSON.parse(outputText));
    const qInput = data.usage?.input_tokens ?? estimateTokenLikeCount(prompt);
    const qOutput = data.usage?.output_tokens ?? estimateTokenLikeCount(outputText);
    return NextResponse.json({
      qualityCheck,
      usage: {
        backend,
        provider,
        model,
        input_tokens: qInput,
        output_tokens: qOutput,
        estimated_cost_jpy: calcCostJpy(model, qInput, qOutput)
      }
    });
  } catch (error) {
    console.error("Quality check failed; using heuristic fallback", error);
    const qualityCheck = heuristicQualityCheck(payload.messages, payload.foreshadowingItems, payload.session);
    const fbInput = estimateTokenLikeCount(prompt);
    const fbOutput = estimateTokenLikeCount(JSON.stringify(qualityCheck));
    return NextResponse.json({
      qualityCheck,
      usage: {
        backend,
        provider,
        model,
        input_tokens: fbInput,
        output_tokens: fbOutput,
        estimated_cost_jpy: calcCostJpy(model, fbInput, fbOutput),
        error: error instanceof Error ? error.message : "quality check failed"
      }
    });
  }
}

function buildQualityPrompt(
  messages: Array<Record<string, unknown>>,
  session?: Record<string, unknown>,
  scenarioTitle?: string,
  sceneObjective?: string,
  foreshadowingItems?: Array<Record<string, unknown>>
) {
  const compact = messages
    .slice(-18)
    .map((message) => {
      const speaker = message.speaker_name ?? message.speaker_type ?? message.role ?? "unknown";
      return `${message.message_type ?? "message"} / ${speaker}: ${message.content ?? ""}`;
    })
    .join("\n");

  const context: string[] = [
    `scenario=${scenarioTitle ?? ""}`,
    `sceneObjective=${sceneObjective ?? ""}`,
  ];

  if (session) {
    context.push(`stallCount=${session.stall_count ?? 0}`);
    context.push(`qualityStallCount=${session.quality_stall_count ?? 0}`);
    context.push(`playPaceMode=${session.play_pace_mode ?? "normal"}`);
    const lastScore = session.last_quality_score;
    if (typeof lastScore === "number" && lastScore <= 4 && session.last_quality_problem) {
      context.push(`previousQualityProblem=${session.last_quality_problem}`);
    }
  }

  if (foreshadowingItems && foreshadowingItems.length > 0) {
    const unresolvedTitles = foreshadowingItems
      .filter((item) => ["planned", "introduced", "developing", "ready"].includes(String(item.status ?? "")))
      .map((item) => String(item.title ?? ""))
      .filter(Boolean);
    if (unresolvedTitles.length > 0) {
      context.push(`unresolvedForeshadowing=${unresolvedTitles.join(", ")}`);
    }
  }

  context.push("直近ログ:", compact);
  return context.join("\n");
}

function heuristicQualityCheck(
  messages: Array<Record<string, unknown>>,
  foreshadowingItems?: Array<Record<string, unknown>>,
  session?: Record<string, unknown>
) {
  const text = messages.map((message) => String(message.content ?? "")).join("\n");
  const hasNewInformation = /足音|通知|鍵|手がかり|秘密|違和感|現れ|変わ|見つ|気づ|光|影|匂い|扉|窓|名前|約束/.test(text);
  const hasCharacterAction = /立|歩|近づ|離れ|触れ|開け|閉め|拾|置|見つ|笑|泣|黙|頷|首を振|目を/.test(text);
  const hasEmotionalChange = /驚|戸惑|安心|怒|悲|嬉|怖|緊張|照れ|迷|ほっと/.test(text);
  const hasRelationshipChange = /信頼|距離|近く|遠く|仲|約束|秘密|打ち明け|許/.test(text);
  const hasSceneChange = /場所|部屋|廊下|駅|外|中|雨|夜|朝|扉|場面/.test(text);
  const unresolvedTitles = (foreshadowingItems ?? [])
    .filter((item) => ["planned", "introduced", "developing", "ready"].includes(String(item.status ?? "")))
    .map((item) => String(item.title ?? "").toLowerCase());
  const hasForeshadowing =
    /伏線|手がかり|違和感|謎|秘密|鍵|影|封筒|印/.test(text) ||
    unresolvedTitles.some((title) => title && text.toLowerCase().includes(title));
  const pendingChoices = session?.pending_choices;
  const hasChoicePressure =
    (Array.isArray(pendingChoices) && pendingChoices.length > 0) ||
    /選ぶ|どうする|決め|答え|どちら|どれ|いずれ/.test(text);
  const isRepetitive = repeatedQuestionCount(text) >= 2;
  const isStalling = !hasNewInformation && !hasCharacterAction && !hasSceneChange;
  const hasForwardMotion = !isStalling && (hasNewInformation || hasCharacterAction || hasSceneChange);
  const sceneObjectiveProgress = hasForwardMotion && hasNewInformation ? "high" : hasForwardMotion ? "medium" : "low";
  const checks = [
    hasNewInformation,
    hasCharacterAction,
    hasEmotionalChange,
    hasRelationshipChange,
    hasSceneChange,
    hasForeshadowing,
    hasChoicePressure,
    !isRepetitive,
    !isStalling,
    sceneObjectiveProgress !== "low"
  ];
  const qualityScore = checks.filter(Boolean).length;
  return {
    isRepetitive,
    hasNewInformation,
    hasCharacterAction,
    hasEmotionalChange,
    hasRelationshipChange,
    hasSceneChange,
    hasForeshadowing,
    hasChoicePressure,
    hasForwardMotion,
    isStalling,
    sceneObjectiveProgress,
    qualityScore,
    problem: qualityScore <= 4 ? "新情報、具体行動、場面変化、選択圧、シーン目的への前進を確認してください。" : null,
    improvementHint: qualityScore <= 4 ? "次の応答では低かった項目を意識し、小さな新情報か具体行動で場面目的へ進める。" : null
  };
}

function repeatedQuestionCount(text: string) {
  return (text.match(/どうする|どうしたい|なにをする|何をする|大丈夫/g) ?? []).length;
}

function extractOutputText(response: OpenAIResponse) {
  if (response.output_text) return response.output_text;
  return response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim() ?? "";
}
