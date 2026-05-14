import { buildConversationPrompt, buildLatestUserMessage } from "@/lib/promptBuilder";
import { calcCostJpy } from "@/lib/ai/costCalc";
import { estimateTokenLikeCount } from "@/lib/utils";
import { fallbackFromRawText, parseConversationJson } from "../schema";
import type { ConversationProvider, ConversationRequest, ConversationResponse } from "../types";

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { message?: string };
};

export class AnthropicConversationProvider implements ConversationProvider {
  id = "anthropic";

  constructor(private configuredModel?: string) {}

  async generateTurn(request: ConversationRequest): Promise<ConversationResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = this.configuredModel || request.model || "claude-sonnet-4-5";
    const backend = `${this.id}:${model}`;

    if (!apiKey) {
      return fallbackFromRawText(
        "ANTHROPIC_API_KEY が未設定です。サーバー側の .env.local に API キーを設定してください。",
        { backend, provider: this.id, model, input_tokens: 0, output_tokens: 0, estimated_cost_jpy: 0 },
        backend,
        "ANTHROPIC_API_KEY is missing",
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

    const userMessage = buildLatestUserMessage(
      request.userInput,
      request.inputType,
      request.selectedChoice
    );

    const nsfwRule = request.nsfwAllowed
      ? "NSFW会話は成人確認済みの場合のみ許可。ただし禁止カテゴリは絶対に扱わない。"
      : "NSFW会話はOFF。成人向け性的描写は出さない。";

    const systemPrompt = [
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

    const maxTokens = request.settings.low_cost_mode ? 700 : 1100;

    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }]
        })
      });
    } catch (error) {
      return fallbackFromRawText(
        `Anthropic API 接続エラー: ${error instanceof Error ? error.message : String(error)}`,
        { backend, provider: this.id, model, input_tokens: 0, output_tokens: 0, estimated_cost_jpy: 0 },
        backend,
        "Anthropic fetch failed",
        "provider_error"
      );
    }

    const raw = await response.text();

    if (!response.ok) {
      console.error("Anthropic conversation request failed", response.status, raw);
      return fallbackFromRawText(
        `会話AI（Anthropic）でエラーが発生しました。${raw.slice(0, 800)}`,
        {
          backend,
          provider: this.id,
          model,
          input_tokens: estimateTokenLikeCount(systemPrompt),
          output_tokens: 0,
          estimated_cost_jpy: 0
        },
        backend,
        `Anthropic API error ${response.status}`,
        "provider_error"
      );
    }

    let data: AnthropicResponse;
    try {
      data = JSON.parse(raw) as AnthropicResponse;
    } catch (error) {
      console.error("Anthropic response envelope parse failed", error, raw);
      return fallbackFromRawText(
        raw,
        {
          backend,
          provider: this.id,
          model,
          input_tokens: estimateTokenLikeCount(systemPrompt),
          output_tokens: 0,
          estimated_cost_jpy: 0
        },
        backend,
        "Anthropic response envelope parse failed",
        "provider_error"
      );
    }

    const outputText = data.content
      ?.filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim() ?? "";

    const inputTokens = data.usage?.input_tokens ?? estimateTokenLikeCount(systemPrompt);
    const outputTokens = data.usage?.output_tokens ?? estimateTokenLikeCount(outputText);

    const usage = {
      backend,
      provider: this.id,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      estimated_cost_jpy: calcCostJpy(model, inputTokens, outputTokens),
      prompt_chars: systemPrompt.length,
      routeHint: request.routeHint ?? null
    };

    return parseConversationJson(outputText, usage, backend);
  }
}
