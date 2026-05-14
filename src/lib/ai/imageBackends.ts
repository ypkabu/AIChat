import { assessContentSafety } from "@/lib/contentSafety";
import { newId } from "@/lib/utils";
import type { ImageBackend, ImageGenerationRequest, ImageGenerationResponse } from "./types";
import { RunpodImageBackend } from "./image/runpodAdapter";
import { ComfyUIImageBackend } from "./image/comfyuiAdapter";

/**
 * 画像バックエンドを返す。
 *
 * 対応プロバイダー:
 *   "runpod"  — Runpod Serverless。env: STANDARD_IMAGE_BACKEND_URL / NSFW_IMAGE_BACKEND_URL / RUNPOD_API_KEY
 *   "comfyui" — ComfyUI (ローカル / ngrok)。env: STANDARD_IMAGE_BACKEND_URL / NSFW_IMAGE_BACKEND_URL
 *   "mock"    — SVGプレースホルダー（デフォルト）
 */
export function getImageBackend(provider: string, model?: string): ImageBackend {
  const providerId = provider.toLowerCase();
  const modelId = model || provider;
  const isNsfwProvider = providerId.includes("nsfw");

  if (providerId === "runpod" || providerId.startsWith("runpod:")) {
    const configuredEndpoint = isNsfwProvider
      ? (process.env.NSFW_IMAGE_BACKEND_URL ?? process.env.STANDARD_IMAGE_BACKEND_URL ?? "")
      : (process.env.STANDARD_IMAGE_BACKEND_URL ?? process.env.NSFW_IMAGE_BACKEND_URL ?? "");
    const endpointUrl = normalizeRunpodEndpoint(configuredEndpoint);
    const apiKey = process.env.RUNPOD_API_KEY ?? "";
    if (!endpointUrl || !apiKey) {
      console.warn("[ImageBackend] Runpod selected but STANDARD_IMAGE_BACKEND_URL or RUNPOD_API_KEY is not set — falling back to mock.");
      return new MockImageBackend(modelId, isNsfwProvider);
    }
    return new RunpodImageBackend(endpointUrl, apiKey, isNsfwProvider, modelId);
  }

  if (providerId === "comfyui" || providerId.startsWith("comfyui:")) {
    const baseUrl = (isNsfwProvider
      ? (process.env.NSFW_IMAGE_BACKEND_URL ?? process.env.STANDARD_IMAGE_BACKEND_URL ?? "")
      : (process.env.STANDARD_IMAGE_BACKEND_URL ?? process.env.NSFW_IMAGE_BACKEND_URL ?? "")).replace(/\/$/, "");
    if (!baseUrl) {
      console.warn("[ImageBackend] ComfyUI selected but STANDARD_IMAGE_BACKEND_URL is not set — falling back to mock.");
      return new MockImageBackend(modelId, isNsfwProvider);
    }
    return new ComfyUIImageBackend(baseUrl, isNsfwProvider);
  }

  if (!providerId || providerId === "mock" || providerId.startsWith("mock")) {
    return new MockImageBackend(modelId, isNsfwProvider);
  }

  // 未知のプロバイダーは Mock にフォールバック
  console.warn(`[ImageBackend] Unknown provider "${provider}" — falling back to mock.`);
  return new MockImageBackend(modelId, isNsfwProvider);
}

function normalizeRunpodEndpoint(value: string) {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://api.runpod.ai/v2/${trimmed}/runsync`;
}

class MockImageBackend implements ImageBackend {
  constructor(
    public id: string,
    private nsfwCapable: boolean
  ) {}

  async generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    const safety = assessContentSafety(request.prompt, "image");
    if (!safety.allowed) {
      throw new Error(safety.message ?? "禁止カテゴリに該当する画像は生成できません。");
    }

    const isNsfw = this.nsfwCapable && request.nsfwAllowed && request.isNsfwRequested;
    const jobId = newId("job");
    const imageUrl = buildSvgDataUrl(request.prompt, isNsfw);

    return {
      jobId,
      imageUrl,
      promptSummary: request.prompt.slice(0, 120),
      isNsfw,
      blurByDefault: isNsfw,
      usage: {
        backend: this.id,
        provider: request.provider || "mock",
        model: request.model || this.id,
        image_count: 1,
        estimated_cost_jpy: request.quality === "high" ? 18 : 8
      }
    };
  }
}

function buildSvgDataUrl(prompt: string, isNsfw: boolean) {
  const safePrompt = prompt.replace(/[<>&"]/g, "").slice(0, 80);
  const colorA = isNsfw ? "#4a2331" : "#12312d";
  const colorB = isNsfw ? "#e8799a" : "#35d0a5";
  const colorC = isNsfw ? "#f5b84b" : "#86a8ff";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 1200'>
    <defs>
      <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
        <stop stop-color='${colorA}'/>
        <stop offset='0.58' stop-color='#101216'/>
        <stop offset='1' stop-color='${colorB}'/>
      </linearGradient>
    </defs>
    <rect width='900' height='1200' fill='url(#g)'/>
    <circle cx='710' cy='210' r='110' fill='${colorC}' opacity='0.25'/>
    <rect x='88' y='170' width='724' height='860' rx='48' fill='rgba(245,247,251,0.08)' stroke='rgba(245,247,251,0.18)'/>
    <path d='M170 820 C300 650 420 720 540 560 C620 455 705 500 755 420' fill='none' stroke='${colorB}' stroke-width='18' stroke-linecap='round' opacity='0.75'/>
    <text x='450' y='620' fill='#f5f7fb' font-family='system-ui, sans-serif' font-size='38' text-anchor='middle'>EVENT IMAGE</text>
    <text x='450' y='675' fill='rgba(245,247,251,0.72)' font-family='system-ui, sans-serif' font-size='26' text-anchor='middle'>${safePrompt}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
