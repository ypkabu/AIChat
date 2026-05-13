import { NextResponse } from "next/server";
import { z } from "zod";
import { nsfwAllowed } from "@/lib/contentSafety";
import { getImageBackend } from "@/lib/ai/imageBackends";

const requestSchema = z.object({
  prompt: z.string().min(1),
  sessionId: z.string(),
  scenarioId: z.string(),
  triggerType: z.enum(["manual", "major_event", "chapter_start", "special_branch"]),
  adultConfirmed: z.boolean(),
  nsfwImageEnabled: z.boolean(),
  isNsfwRequested: z.boolean(),
  standardImageBackend: z.string(),
  nsfwImageBackend: z.string(),
  standardImageProvider: z.string().optional(),
  standardImageModel: z.string().optional(),
  nsfwImageProvider: z.string().optional(),
  nsfwImageModel: z.string().optional(),
  quality: z.string(),
  size: z.string()
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid image request" }, { status: 400 });
  }

  const payload = parsed.data;
  if (!["manual", "major_event", "chapter_start", "special_branch"].includes(payload.triggerType)) {
    return NextResponse.json({ error: "Invalid image trigger" }, { status: 400 });
  }
  const allowed = nsfwAllowed(payload.adultConfirmed, payload.nsfwImageEnabled);
  const nsfw = payload.isNsfwRequested && allowed;
  const selected = resolveImageSelection(payload, nsfw);
  const backend = getImageBackend(selected.backendProvider, selected.model);

  try {
    const response = await backend.generateImage({
      prompt: payload.prompt,
      sessionId: payload.sessionId,
      scenarioId: payload.scenarioId,
      triggerType: payload.triggerType,
      nsfwAllowed: allowed,
      isNsfwRequested: payload.isNsfwRequested,
      quality: payload.quality,
      size: payload.size,
      provider: selected.provider,
      model: selected.model
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Image generation failed" }, { status: 400 });
  }
}

type ImageRequestPayload = z.infer<typeof requestSchema>;

function resolveImageSelection(payload: ImageRequestPayload, nsfw: boolean) {
  const requestedProvider = nsfw
    ? payload.nsfwImageProvider || payload.nsfwImageBackend
    : payload.standardImageProvider || payload.standardImageBackend;
  const requestedModel = nsfw
    ? payload.nsfwImageModel || payload.nsfwImageBackend
    : payload.standardImageModel || payload.standardImageBackend;
  const envProvider = nsfw ? process.env.NSFW_IMAGE_PROVIDER : process.env.STANDARD_IMAGE_PROVIDER;
  const inferredProvider = inferConfiguredImageProvider(nsfw);
  const provider = isMockProvider(requestedProvider)
    ? (envProvider || inferredProvider || requestedProvider)
    : requestedProvider;
  const model = isMockProvider(requestedProvider)
    ? ((nsfw ? process.env.NSFW_IMAGE_MODEL : process.env.STANDARD_IMAGE_MODEL) || requestedModel)
    : requestedModel;
  return {
    provider,
    backendProvider: nsfw && !provider.toLowerCase().includes("nsfw") && !isMockProvider(provider)
      ? `${provider}:nsfw`
      : provider,
    model
  };
}

function inferConfiguredImageProvider(nsfw: boolean) {
  const imageUrl = nsfw
    ? process.env.NSFW_IMAGE_BACKEND_URL || process.env.STANDARD_IMAGE_BACKEND_URL
    : process.env.STANDARD_IMAGE_BACKEND_URL || process.env.NSFW_IMAGE_BACKEND_URL;
  if (!imageUrl) return "";
  if (process.env.RUNPOD_API_KEY) return "runpod";
  return "comfyui";
}

function isMockProvider(provider: string) {
  return !provider || provider.toLowerCase() === "mock" || provider.toLowerCase().startsWith("mock");
}
