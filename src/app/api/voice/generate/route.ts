import { NextResponse } from "next/server";
import { z } from "zod";
import { getVoiceProvider } from "@/lib/ai/voice/provider";
import type { VoiceProviderKey } from "@/lib/ai/voice/types";

const requestSchema = z.object({
  text: z.string().min(1).max(600),
  provider: z.string().default("mock"),
  voiceId: z.string().optional(),
  model: z.string().optional(),
  speed: z.number().optional(),
  pitch: z.number().optional()
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid voice request" }, { status: 400 });
  }

  const { text, provider, voiceId, model, speed, pitch } = parsed.data;
  const backend = getVoiceProvider(provider as VoiceProviderKey);

  try {
    const result = await backend.generateSpeech({ text, voiceId, model, speed, pitch });
    return NextResponse.json({
      audioDataUri: result.audioDataUri ?? null,
      audioUrl: result.audioUrl ?? null,
      durationMs: result.durationMs,
      estimatedCostJpy: result.estimatedCostJpy,
      provider: result.provider,
      model: result.model
    });
  } catch (error) {
    console.error("Voice generation failed", error);
    return NextResponse.json({ error: "音声生成に失敗しました。" }, { status: 500 });
  }
}
