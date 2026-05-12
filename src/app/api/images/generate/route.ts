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
  const selected = nsfw
    ? {
        provider: payload.nsfwImageProvider || payload.nsfwImageBackend,
        model: payload.nsfwImageModel || payload.nsfwImageBackend
      }
    : {
        provider: payload.standardImageProvider || payload.standardImageBackend,
        model: payload.standardImageModel || payload.standardImageBackend
      };
  const backend = getImageBackend(selected.provider, selected.model);

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
