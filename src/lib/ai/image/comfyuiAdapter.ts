/**
 * ComfyUI 画像生成アダプター（セルフホスト / クラウドホスト両対応）
 *
 * 使い方:
 *   1. ComfyUI を起動してAPIを有効化する（--enable-cors-header, --listen 0.0.0.0）
 *   2. .env.local に以下を設定する:
 *        STANDARD_IMAGE_BACKEND_URL=http://localhost:8188
 *        NSFW_IMAGE_BACKEND_URL=http://localhost:8188
 *      ※ Vercel 本番では ngrok 等でトンネルしたURLを使う
 *   3. 設定画面の「Standard Image Provider」を "comfyui" にする
 *
 * ComfyUI API は以下の流れで動作する:
 *   1. POST /prompt でジョブをキューに追加 → { prompt_id } を取得
 *   2. GET /history/<prompt_id> をポーリング → outputs が出たら完了
 *   3. GET /view?filename=<filename>&subfolder=...&type=output でPNG取得
 *
 * ワークフローの JSON は COMFYUI_WORKFLOW_JSON に埋め込む（下記参照）。
 */

import { assessContentSafety } from "@/lib/contentSafety";
import { newId } from "@/lib/utils";
import type { ImageBackend, ImageGenerationRequest, ImageGenerationResponse } from "@/lib/ai/types";

// ---------------------------------------------------------------------------
// ワークフロー設定
// ComfyUI から「Save (API format)」でエクスポートした JSON を貼り付ける。
// 以下はシンプルな txt2img ワークフローのテンプレート（SDXLモデル想定）。
// ---------------------------------------------------------------------------
function buildWorkflow(params: {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  cfg: number;
  seed: number;
}): Record<string, unknown> {
  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: params.cfg,
        sampler_name: "dpmpp_2m",
        scheduler: "karras",
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0]
      }
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        // モデルファイル名を変更してください（ComfyUI の models/checkpoints/ に配置）
        ckpt_name: "illustriousXL_v01.safetensors"
      }
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: { width: params.width, height: params.height, batch_size: 1 }
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: { text: params.prompt, clip: ["4", 1] }
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: { text: params.negativePrompt, clip: ["4", 1] }
    },
    "8": {
      class_type: "VAEDecode",
      inputs: { samples: ["3", 0], vae: ["4", 2] }
    },
    "9": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "aichat_", images: ["8", 0] }
    }
  };
}

const SIZE_MAP: Record<string, { width: number; height: number }> = {
  portrait: { width: 832, height: 1216 },
  landscape: { width: 1216, height: 832 },
  square: { width: 1024, height: 1024 }
};

const STEPS_MAP: Record<string, number> = { draft: 20, standard: 28, high: 40 };
const COST_PER_IMAGE_JPY: Record<string, number> = { draft: 0.5, standard: 1, high: 2 };

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 80; // 最大2分

export class ComfyUIImageBackend implements ImageBackend {
  id = "comfyui";

  constructor(
    private readonly baseUrl: string,
    private readonly nsfwCapable: boolean
  ) {}

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const safety = assessContentSafety(request.prompt, "image");
    if (!safety.allowed) {
      throw new Error(safety.message ?? "禁止カテゴリに該当する画像は生成できません。");
    }

    const isNsfw = this.nsfwCapable && request.nsfwAllowed && request.isNsfwRequested;
    const size = SIZE_MAP[request.size] ?? SIZE_MAP.portrait;
    const steps = STEPS_MAP[request.quality] ?? STEPS_MAP.standard;
    const seed = Math.floor(Math.random() * 2 ** 32);

    const callerNegative = (request.negativePrompt ?? "").trim();
    const baseNegative = callerNegative.length > 0
      ? callerNegative
      : "worst quality, low quality, blurry, bad anatomy";
    const negativePrompt = isNsfw
      ? baseNegative
      : (baseNegative.includes("nsfw") ? baseNegative : `nsfw, nude, explicit, ${baseNegative}`);

    const workflow = buildWorkflow({
      prompt: request.prompt,
      negativePrompt,
      width: size.width,
      height: size.height,
      steps,
      cfg: 7,
      seed
    });

    // 1. ジョブをキューに追加
    const queueRes = await fetch(`${this.baseUrl}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow })
    });
    if (!queueRes.ok) {
      throw new Error(`ComfyUI /prompt error ${queueRes.status}`);
    }
    const { prompt_id } = (await queueRes.json()) as { prompt_id: string };

    // 2. ポーリングで完了を待つ
    let outputFilename: string | null = null;
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const histRes = await fetch(`${this.baseUrl}/history/${prompt_id}`);
      if (!histRes.ok) continue;
      const history = (await histRes.json()) as Record<string, unknown>;
      const entry = history[prompt_id] as Record<string, unknown> | undefined;
      if (!entry) continue;

      const outputs = entry.outputs as Record<string, unknown> | undefined;
      if (!outputs) continue;

      // SaveImage ノードの出力を探す
      for (const nodeOutput of Object.values(outputs)) {
        const images = (nodeOutput as Record<string, unknown>)?.images as Array<{ filename: string; subfolder: string; type: string }> | undefined;
        if (images?.[0]) {
          outputFilename = images[0].filename;
          break;
        }
      }
      if (outputFilename) break;
    }

    if (!outputFilename) throw new Error("ComfyUI: タイムアウト — 画像生成が完了しませんでした。");

    // 3. 画像を取得して base64 に変換
    const viewRes = await fetch(
      `${this.baseUrl}/view?filename=${encodeURIComponent(outputFilename)}&type=output`
    );
    if (!viewRes.ok) throw new Error(`ComfyUI /view error ${viewRes.status}`);

    const arrayBuffer = await viewRes.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const imageUrl = `data:image/png;base64,${base64}`;
    const jobId = newId("job");

    return {
      jobId,
      imageUrl,
      promptSummary: request.prompt.slice(0, 120),
      isNsfw,
      blurByDefault: isNsfw,
      usage: {
        backend: "comfyui",
        provider: "comfyui",
        model: "comfyui-local",
        image_count: 1,
        estimated_cost_jpy: COST_PER_IMAGE_JPY[request.quality] ?? COST_PER_IMAGE_JPY.standard
      }
    };
  }
}
