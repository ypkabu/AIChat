import type { VoiceBackend, VoiceRequest, VoiceResponse } from "./types";

export class MockVoiceProvider implements VoiceBackend {
  id = "mock";

  async generateSpeech(request: VoiceRequest): Promise<VoiceResponse> {
    await new Promise((resolve) => setTimeout(resolve, 150));
    return {
      audioDataUri: makeSilentWavDataUri(request.text.length),
      durationMs: Math.max(500, request.text.length * 80),
      estimatedCostJpy: 0,
      provider: this.id,
      model: "mock"
    };
  }
}

function makeSilentWavDataUri(textLength: number): string {
  const sampleRate = 8000;
  const durationSec = Math.min(10, Math.max(0.1, textLength * 0.08));
  const numSamples = Math.floor(sampleRate * durationSec);
  const dataSize = numSamples;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8, "ascii");
  buffer.write("fmt ", 12, "ascii");
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);   // PCM
  buffer.writeUInt16LE(1, 22);   // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate, 28); // byte rate
  buffer.writeUInt16LE(1, 32);   // block align
  buffer.writeUInt16LE(8, 34);   // 8-bit
  buffer.write("data", 36, "ascii");
  buffer.writeUInt32LE(dataSize, 40);
  buffer.fill(0x80, 44); // silence

  return `data:audio/wav;base64,${buffer.toString("base64")}`;
}
