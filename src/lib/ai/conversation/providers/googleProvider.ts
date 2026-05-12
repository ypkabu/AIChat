import { buildConversationPrompt, buildLatestUserMessage } from "@/lib/promptBuilder";
import { calcCostJpy } from "@/lib/ai/costCalc";
import { estimateTokenLikeCount } from "@/lib/utils";
import { fallbackFromRawText, parseConversationJson } from "../schema";
import type { ConversationProvider, ConversationRequest, ConversationResponse } from "../types";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
  error?: { message?: string; code?: number };
};

export class GoogleConversationProvider implements ConversationProvider {
  id = "google";

  constructor(private configuredModel?: string) {}

  async generateTurn(request: ConversationRequest): Promise<ConversationResponse> {
    const apiKey = process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY;
    const model = this.configuredModel || request.model || "gemini-2.0-flash";
    const backend = `${this.id}:${model}`;

    if (!apiKey) {
      return fallbackFromRawText(
        "GOOGLE_API_KEY が未設定です。サーバー側の .env.local に API キーを設定してください。",
        { backend, provider: this.id, model, input_tokens: 0, output_tokens: 0, estimated_cost_jpy: 0 },
        backend,
        "GOOGLE_API_KEY is missing",
        "configuration_error"
      );
    }

    const prompt = buildConversationPrompt({
      bundle: request.bundle,
      session: request.session,
      relationships: request.relationships ?? [],
      lorebook: request.lorebook ?? request.bundle.lorebook,
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

    const userMessage = buildLatestUserMessage(
      request.userInput,
      request.inputType,
      request.selectedChoice
    );

    const nsfwRule = request.nsfwAllowed
      ? "NSFW会話は成人確認済みの場合のみ許可。禁止カテゴリは扱わない。"
      : "NSFW会話はOFF。成人向け性的描写は出さない。";

    const systemInstruction = [
      prompt.systemPrompt,
      "",
      nsfwRule,
      "",
      "返答は必ず JSON オブジェクトのみ。Markdown、前置き、コードブロック（```）は禁止。",
      "timeline を必ず返す。suggestedReplies と directorUpdate も含める。",
      "メイン応答では timeline / suggestedReplies / directorUpdate だけを返す。",
      "memoryCandidates / relationshipDelta / imageCue / foreshadowingUpdates / qualityCheck は返さない。",
      "hiddenTruth に相当する秘密や未公開真相を本文・台詞・選択肢へ直接出さない。"
    ].join("\n");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: [{ parts: [{ text: userMessage }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: request.settings.low_cost_mode ? 700 : 1100
          }
        })
      });
    } catch (error) {
      return fallbackFromRawText(
        `Google Gemini API 接続エラー: ${error instanceof Error ? error.message : String(error)}`,
        { backend, provider: this.id, model, input_tokens: 0, output_tokens: 0, estimated_cost_jpy: 0 },
        backend,
        "Google fetch failed",
        "provider_error"
      );
    }

    const raw = await response.text();

    if (!response.ok) {
      console.error("Google Gemini conversation request failed", response.status, raw);
      return fallbackFromRawText(
        `会話AI（Google Gemini）でエラーが発生しました。${raw.slice(0, 800)}`,
        {
          backend,
          provider: this.id,
          model,
          input_tokens: estimateTokenLikeCount(systemInstruction),
          output_tokens: 0,
          estimated_cost_jpy: 0
        },
        backend,
        `Google API error ${response.status}`,
        "provider_error"
      );
    }

    let data: GeminiResponse;
    try {
      data = JSON.parse(raw) as GeminiResponse;
    } catch (error) {
      console.error("Google Gemini response envelope parse failed", error, raw);
      return fallbackFromRawText(
        raw,
        {
          backend,
          provider: this.id,
          model,
          input_tokens: estimateTokenLikeCount(systemInstruction),
          output_tokens: 0,
          estimated_cost_jpy: 0
        },
        backend,
        "Google Gemini response envelope parse failed",
        "provider_error"
      );
    }

    const outputText =
      data.candidates
        ?.flatMap((c) => c.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim() ?? "";

    const inputTokens =
      data.usageMetadata?.promptTokenCount ?? estimateTokenLikeCount(systemInstruction);
    const outputTokens =
      data.usageMetadata?.candidatesTokenCount ?? estimateTokenLikeCount(outputText);

    const usage = {
      backend,
      provider: this.id,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_jpy: calcCostJpy(model, inputTokens, outputTokens),
      prompt_chars: systemInstruction.length,
      routeHint: request.routeHint ?? null
    };

    return parseConversationJson(outputText, usage, backend);
  }
}
