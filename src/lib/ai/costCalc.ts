const RATES: Record<string, [number, number]> = {
  // OpenAI
  "gpt-4.1":           [2.0,  8.0],
  "gpt-4.1-mini":      [0.4,  1.6],
  "gpt-4o":            [2.5, 10.0],
  "gpt-4o-mini":       [0.15, 0.6],
  // Anthropic Claude
  "claude-opus-4-7":           [15.0, 75.0],
  "claude-sonnet-4-6":         [3.0,  15.0],
  "claude-haiku-4-5-20251001": [0.8,   4.0],
  "claude-opus-4-5":           [15.0, 75.0],
  "claude-sonnet-4-5":         [3.0,  15.0],
  // Google Gemini
  "gemini-2.5-pro":   [3.5, 10.5],
  "gemini-2.0-flash": [0.1,  0.4],
  "gemini-1.5-pro":   [3.5, 10.5],
  "gemini-1.5-flash": [0.075, 0.3],
};

export function calcCostJpy(model: string, inputTokens: number, outputTokens: number): number {
  const [inRate, outRate] = RATES[model] ?? [2.0, 8.0];
  const usd = (inputTokens / 1_000_000) * inRate + (outputTokens / 1_000_000) * outRate;
  return usd * 150;
}
