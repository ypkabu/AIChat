import { MockVoiceProvider } from "./mockVoiceProvider";
import { ElevenLabsProvider } from "./elevenlabsProvider";
import type { VoiceBackend, VoiceProviderKey } from "./types";

export function getVoiceProvider(key: VoiceProviderKey): VoiceBackend {
  if (key === "elevenlabs" && process.env.ELEVENLABS_API_KEY) {
    return new ElevenLabsProvider();
  }
  return new MockVoiceProvider();
}
