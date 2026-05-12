export type VoiceProviderKey = "mock" | "aivis" | "voicevox" | "elevenlabs";

export type VoiceRequest = {
  text: string;
  voiceId?: string;
  model?: string;
  speed?: number;
  pitch?: number;
  emotion?: string;
  style?: string;
};

export type VoiceResponse = {
  audioDataUri?: string;
  audioUrl?: string;
  storagePath?: string;
  durationMs: number;
  estimatedCostJpy: number;
  provider: string;
  model: string;
  latencyMs?: number;
};

export interface VoiceBackend {
  id: string;
  generateSpeech(request: VoiceRequest): Promise<VoiceResponse>;
}
