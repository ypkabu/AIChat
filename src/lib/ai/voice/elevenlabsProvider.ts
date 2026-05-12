import type { VoiceBackend, VoiceRequest, VoiceResponse } from "./types";

// Cost estimate: ElevenLabs Flash v2.5 is ~$0.11/1000 chars → ~16.5 JPY
const COST_PER_CHAR_JPY = 0.0165;

export class ElevenLabsProvider implements VoiceBackend {
  id = "elevenlabs";

  private readonly apiKey: string;
  private readonly defaultVoiceId: string;
  private readonly defaultModel: string;

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY ?? "";
    this.defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel
    this.defaultModel = process.env.ELEVENLABS_DEFAULT_MODEL ?? "eleven_flash_v2_5";
  }

  async generateSpeech(request: VoiceRequest): Promise<VoiceResponse> {
    if (!this.apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

    const voiceId = request.voiceId ?? this.defaultVoiceId;
    const model = request.model ?? this.defaultModel;
    const startMs = Date.now();

    const payload: Record<string, unknown> = {
      text: request.text,
      model_id: model,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    };

    if (request.speed !== undefined && request.speed !== 1.0) {
      payload.voice_settings = {
        ...(payload.voice_settings as object),
        speed: request.speed
      };
    }

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => String(res.status));
      throw new Error(`ElevenLabs API error ${res.status}: ${detail}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const audioDataUri = `data:audio/mpeg;base64,${base64}`;

    const latencyMs = Date.now() - startMs;
    // Rough duration: ~150 chars/sec for Japanese TTS
    const durationMs = Math.max(500, Math.round(request.text.length * 1000 / 150));
    const estimatedCostJpy = request.text.length * COST_PER_CHAR_JPY;

    return {
      audioDataUri,
      durationMs,
      estimatedCostJpy,
      provider: this.id,
      model,
      latencyMs
    };
  }
}
