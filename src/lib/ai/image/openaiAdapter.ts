/**
 * OpenAI Image Generation Adapter (gpt-image-1 / dall-e-3)
 *
 * gpt-image-1 の利点:
 *   - プロンプトの指示に忠実（compositional reasoning）
 *   - プロンプトを勝手に書き換えない（DALL-E 3 は revised_prompt で変更する）
 *   - 透過背景対応
 *   - トークン使用量が返るのでコスト計算が正確
 *   - 最大 3840x2160 のカスタムサイズ対応
 *
 * 使い方:
 *   1. .env.local に OPENAI_API_KEY を設定する
 *   2. 設定画面の「通常画像モデル」Provider を "openai" にする
 *   3. Model を "gpt-image-1" にする
 */

import { assessContentSafety } from "@/lib/contentSafety";
import { newId } from "@/lib/utils";
import type { ImageBackend, ImageGenerationRequest, ImageGenerationResponse } from "@/lib/ai/types";

// サイズマップ — gpt-image-1 は 1024x1024, 1536x1024, 1024x1536, auto に対応
const SIZE_MAP: Record<string, string> = {
  portrait: "1024x1536",
  landscape: "1536x1024",
  square: "1024x1024"
};

// Quality マップ — gpt-image-1 は low / medium / high / auto
const QUALITY_MAP: Record<string, string> = {
  draft: "low",
  standard: "medium",
  high: "high",
  ultra: "high"
};

// コスト概算 (JPY) — gpt-image-1 の実際の価格から換算
// low: $0.011-0.016, medium: $0.042-0.063, high: $0.167-0.250
const COST_PER_IMAGE_JPY: Record<string, Record<string, number>> = {
  "1024x1024": { low: 1.7, medium: 6.5, high: 26 },
  "1024x1536": { low: 2.5, medium: 9.8, high: 39 },
  "1536x1024": { low: 2.5, medium: 9.8, high: 39 }
};

// DALL-E 3 コスト概算 (JPY)
const DALLE3_COST_JPY: Record<string, Record<string, number>> = {
  "1024x1024": { standard: 6.2, hd: 12.4 },
  "1024x1792": { standard: 12.4, hd: 18.6 },
  "1792x1024": { standard: 12.4, hd: 18.6 }
};

type OpenAIImageResponse = {
  created: number;
  data: Array<{
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
  }>;
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
};

export class OpenAIImageBackend implements ImageBackend {
  id = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly modelName: string,
    private readonly nsfwCapable: boolean
  ) {}

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const safety = assessContentSafety(request.prompt, "image");
    if (!safety.allowed) {
      throw new Error(safety.message ?? "禁止カテゴリに該当する画像は生成できません。");
    }

    const isNsfw = this.nsfwCapable && request.nsfwAllowed && request.isNsfwRequested;
    const isGptImage = this.modelName.startsWith("gpt-image");
    const isDalle3 = this.modelName.includes("dall-e-3");

    // サイズ解決
    const size = isGptImage
      ? (SIZE_MAP[request.size] ?? "1024x1536")
      : (request.size === "portrait" ? "1024x1792" : request.size === "landscape" ? "1792x1024" : "1024x1024");

    // 品質解決
    const quality = isGptImage
      ? (QUALITY_MAP[request.quality] ?? "medium")
      : (request.quality === "high" || request.quality === "ultra" ? "hd" : "standard");

    // プロンプト組み立て
    // gpt-image-1 は negative prompt を直接扱わないので、positive prompt の末尾に
    // 「絶対に含めるな」リストを自然文で追加する。
    let finalPrompt = request.prompt;
    if (isGptImage && request.negativePrompt) {
      const negItems = request.negativePrompt
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 60)
        .slice(0, 12);
      if (negItems.length > 0) {
        finalPrompt += `\n\nSTRICT EXCLUSIONS — these MUST NOT appear in the image under any circumstances: ${negItems.join(", ")}.`;
      }
    }
    // gpt-image-1 は最大32,000文字対応だが、安全マージンとして 4000 文字でクリップ
    if (finalPrompt.length > 4000) {
      finalPrompt = finalPrompt.slice(0, 3990) + "...";
    }

    // API リクエスト
    const body: Record<string, unknown> = {
      model: this.modelName,
      prompt: finalPrompt,
      size,
      quality,
      n: 1
    };

    if (isGptImage) {
      body.output_format = "png";
      body.background = "opaque";
    } else if (isDalle3) {
      body.response_format = "b64_json";
      body.style = "vivid";
    } else {
      body.response_format = "b64_json";
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180_000)
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => String(response.status));
      throw new Error(`OpenAI Image API error ${response.status}: ${detail}`);
    }

    const data = (await response.json()) as OpenAIImageResponse;
    const imageData = data.data?.[0];
    if (!imageData) throw new Error("OpenAI: 画像データが返されませんでした。");

    const imageUrl = imageData.b64_json
      ? `data:image/png;base64,${imageData.b64_json}`
      : imageData.url ?? "";

    if (!imageUrl) throw new Error("OpenAI: 画像URLまたはデータが空です。");

    const jobId = newId("job");

    // コスト計算
    let estimatedCostJpy: number;
    if (data.usage) {
      // トークンベースの正確な計算 ($8/1M input, $32/1M output) → JPY (155円/USD)
      const inputCostUsd = (data.usage.input_tokens / 1_000_000) * 8;
      const outputCostUsd = (data.usage.output_tokens / 1_000_000) * 32;
      estimatedCostJpy = (inputCostUsd + outputCostUsd) * 155;
    } else if (isDalle3) {
      const sizeKey = size as keyof typeof DALLE3_COST_JPY;
      const qualityKey = quality as "standard" | "hd";
      estimatedCostJpy = DALLE3_COST_JPY[sizeKey]?.[qualityKey] ?? 12.4;
    } else {
      const sizeKey = size as keyof typeof COST_PER_IMAGE_JPY;
      const qualityKey = quality as "low" | "medium" | "high";
      estimatedCostJpy = COST_PER_IMAGE_JPY[sizeKey]?.[qualityKey] ?? 6.5;
    }

    return {
      jobId,
      imageUrl,
      promptSummary: request.prompt.slice(0, 120),
      isNsfw,
      blurByDefault: isNsfw,
      usage: {
        backend: "openai",
        provider: "openai",
        model: this.modelName,
        image_count: 1,
        estimated_cost_jpy: Math.round(estimatedCostJpy * 10) / 10
      }
    };
  }
}
