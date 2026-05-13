import { buildConversationPrompt, buildLatestUserMessage } from "@/lib/promptBuilder";
import { calcCostJpy } from "@/lib/ai/costCalc";
import { estimateTokenLikeCount } from "@/lib/utils";
import { conversationJsonSchema, fallbackFromRawText, parseConversationJson } from "./schema";
import type { ConversationProvider, ConversationRequest, ConversationResponse } from "./types";

type OpenAIResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
};

export class OpenAIConversationProvider implements ConversationProvider {
  id = "openai";

  constructor(private configuredModel?: string) {}

  async generateTurn(request: ConversationRequest): Promise<ConversationResponse> {
    const apiKey = process.env.OPENAI_API_KEY;
    const model = this.configuredModel || request.model || process.env.OPENAI_MODEL || "gpt-4.1-mini";
    const backend = `${this.id}:${model}`;

    if (!apiKey) {
      return fallbackFromRawText(
        "OPENAI_API_KEY が未設定です。サーバー側の .env.local に API キーを設定してください。",
        {
          backend,
          provider: this.id,
          model,
          input_tokens: 0,
          output_tokens: 0,
          estimated_cost_jpy: 0
        },
        backend,
        "OPENAI_API_KEY is missing",
        "configuration_error"
      );
    }

    const prompt = buildConversationPrompt({
      bundle: request.bundle,
      session: request.session,
      relationships: request.relationships ?? [],
      lorebook: request.lorebook ?? request.bundle.lorebook,
      linkedLorebookEntries: request.linkedLorebookEntries ?? [],
      memories: request.memories ?? [],
      recentMessages: request.messages,
      latestUserInput: request.userInput,
      settings: request.settings,
      inputType: request.inputType,
      selectedChoice: request.selectedChoice,
      environmentState: request.environmentState ?? null,
      characterStates: request.characterStates ?? [],
      outputMode: "json",
      foreshadowingItems: request.foreshadowingItems ?? [],
      storySummaries: request.storySummaries ?? [],
      choicePreferences: request.choicePreferences ?? null
    });
    const userMessage = buildLatestUserMessage(request.userInput, request.inputType, request.selectedChoice);

    const nsfwRule = request.nsfwAllowed
      ? "NSFW会話は成人確認済みの場合のみ許可。ただし禁止カテゴリは絶対に扱わない。合意・成人・創作上の境界を明確に守る。"
      : "NSFW会話はOFF。成人向け性的描写、露骨な描写、性的な誘導は出さない。必要なら穏当な会話や場面転換にする。";

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "developer",
            content: [
              prompt.systemPrompt,
              "",
              nsfwRule,
              "",
              "返答は必ず JSON オブジェクトのみ。Markdown、前置き、コードブロックは禁止。",
              "timeline を必ず返す。既存互換の narration / characterMessages は不要。",
              "suggestedReplies 件数は play_pace_mode に従う。禁止カテゴリに該当する選択肢は禁止。",
              "メイン応答では timeline / suggestedReplies / directorUpdate だけを返す。",
              "memoryCandidates / relationshipDelta / imageCue / foreshadowingUpdates / qualityCheck は別のバックグラウンド処理が担当するため返さない。",
              "hiddenTruth に相当する秘密や未公開真相を、本文、台詞、ナレーション、選択肢へ直接出さない。"
            ].join("\n")
          },
          {
            role: "user",
            content: userMessage
          }
        ],
        text: {
          format: {
            type: "json_schema",
            name: "story_roleplay_turn",
            strict: true,
            schema: conversationJsonSchema
          }
        },
        max_output_tokens: request.settings.low_cost_mode ? 1400 : 2200
      })
    });

    const raw = await response.text();
    if (!response.ok) {
      console.error("OpenAI conversation request failed", response.status, raw);
      return fallbackFromRawText(
        `会話AI接続でエラーが発生しました。${raw.slice(0, 800)}`,
        {
          backend,
          provider: this.id,
          model,
          input_tokens: estimateTokenLikeCount(prompt.systemPrompt),
          output_tokens: 0,
          estimated_cost_jpy: 0
        },
        backend,
        `OpenAI API error ${response.status}`,
        "provider_error"
      );
    }

    let data: OpenAIResponse;
    try {
      data = JSON.parse(raw) as OpenAIResponse;
    } catch (error) {
      console.error("OpenAI response envelope parse failed", error, raw);
      return fallbackFromRawText(
        raw,
        {
          backend,
          provider: this.id,
          model,
          input_tokens: estimateTokenLikeCount(prompt.systemPrompt),
          output_tokens: 0,
          estimated_cost_jpy: 0
        },
        backend,
        "OpenAI response envelope parse failed",
        "provider_error"
      );
    }

    const outputText = extractOutputText(data);
    const inputTokens = data.usage?.input_tokens ?? estimateTokenLikeCount(prompt.systemPrompt);
    const outputTokens = data.usage?.output_tokens ?? estimateTokenLikeCount(outputText);
    const usage = {
      backend,
      provider: this.id,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_jpy: calcCostJpy(model, inputTokens, outputTokens),
      prompt_chars: prompt.systemPrompt.length,
      routeHint: request.routeHint ?? null
    };

    return parseConversationJson(outputText, usage, backend);
  }
}

function extractOutputText(response: OpenAIResponse) {
  if (response.output_text) return response.output_text;
  return response.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text ?? "")
    .join("")
    .trim() ?? "";
}
