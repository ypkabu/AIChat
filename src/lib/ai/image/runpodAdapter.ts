/**
 * Runpod Serverless 画像生成アダプター
 *
 * 使い方:
 *   1. Runpod でサーバーレスエンドポイントを作成する（例: SDXL, Flux, Illustrious）
 *   2. .env.local に以下を設定する:
 *        STANDARD_IMAGE_BACKEND_URL=https://api.runpod.ai/v2/<endpoint_id>/runsync
 *        NSFW_IMAGE_BACKEND_URL=https://api.runpod.ai/v2/<nsfw_endpoint_id>/runsync
 *        RUNPOD_API_KEY=<your_runpod_api_key>
 *   3. 設定画面の「Standard Image Provider」を "runpod" にする
 *
 * Runpod の runsync API は以下の形式でリクエストを送る:
 *   POST https://api.runpod.ai/v2/<endpoint_id>/runsync
 *   Authorization: Bearer <api_key>
 *   { "input": { "prompt": "...", "negative_prompt": "...", ... } }
 *
 * レスポンス:
 *   { "id": "...", "status": "COMPLETED", "output": { "images": ["<base64>"] } }
 */

import { assessContentSafety } from "@/lib/contentSafety";
import { newId } from "@/lib/utils";
import type { ImageBackend, ImageGenerationRequest, ImageGenerationResponse } from "@/lib/ai/types";

// サイズ設定マップ
const SIZE_MAP: Record<string, { width: number; height: number }> = {
  portrait: { width: 832, height: 1216 },
  landscape: { width: 1216, height: 832 },
  square: { width: 1024, height: 1024 }
};

// クオリティ別ステップ数
const STEPS_MAP: Record<string, number> = {
  draft: 20,
  standard: 28,
  high: 40
};

// JPY換算（Runpod A40 GPU おおよその単価から概算）
const COST_PER_IMAGE_JPY: Record<string, number> = {
  draft: 1.5,
  standard: 3,
  high: 6
};

export class RunpodImageBackend implements ImageBackend {
  id = "runpod";

  constructor(
    private readonly endpointUrl: string,
    private readonly apiKey: string,
    private readonly nsfwCapable: boolean,
    private readonly modelName: string
  ) {}

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const safety = assessContentSafety(request.prompt, "image");
    if (!safety.allowed) {
      throw new Error(safety.message ?? "禁止カテゴリに該当する画像は生成できません。");
    }

    const isNsfw = this.nsfwCapable && request.nsfwAllowed && request.isNsfwRequested;
    const size = SIZE_MAP[request.size] ?? SIZE_MAP.portrait;
    const steps = STEPS_MAP[request.quality] ?? STEPS_MAP.standard;

    const negativePrompt = isNsfw
      ? "worst quality, low quality, blurry, bad anatomy"
      : "nsfw, nude, explicit, worst quality, low quality, blurry, bad anatomy";

    const payload = {
      input: {
        prompt: request.prompt,
        negative_prompt: negativePrompt,
        width: size.width,
        height: size.height,
        num_inference_steps: steps,
        guidance_scale: 7,
        num_images: 1,
        // モデル固有設定はここに追加可能
        // scheduler: "DPM++ 2M Karras",
        // seed: -1,
      }
    };

    const response = await fetch(this.endpointUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(120_000) // 2分タイムアウト
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => String(response.status));
      throw new Error(`Runpod API error ${response.status}: ${detail}`);
    }

    const data = (await response.json()) as {
      status: string;
      output?: {
        images?: string[];
        image?: string;
        image_url?: string;
        message?: string;
        status?: string;
      };
      error?: string;
    };

    if (data.status !== "COMPLETED" || data.error) {
      throw new Error(`Runpod job failed: ${data.error ?? data.status}`);
    }

    const imageUrl = extractRunpodImageUrl(data.output);
    if (!imageUrl) throw new Error("Runpod: 出力画像がありませんでした。");
    const jobId = newId("job");

    return {
      jobId,
      imageUrl,
      promptSummary: request.prompt.slice(0, 120),
      isNsfw,
      blurByDefault: isNsfw,
      usage: {
        backend: "runpod",
        provider: "runpod",
        model: this.modelName,
        image_count: 1,
        estimated_cost_jpy: COST_PER_IMAGE_JPY[request.quality] ?? COST_PER_IMAGE_JPY.standard
      }
    };
  }
}

function extractRunpodImageUrl(output?: {
  images?: string[];
  image?: string;
  image_url?: string;
  message?: string;
}) {
  const raw = output?.images?.[0] ?? output?.image ?? output?.image_url ?? output?.message ?? "";
  if (!raw) return "";
  if (raw.startsWith("data:image/") || raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }
  return `data:image/png;base64,${raw}`;
}
