/**
 * Extract speakable text from a character message.
 * Prefers 「quoted dialogue」; falls back to content without *stage directions*.
 */
export function extractVoiceText(content: string): string {
  const dialogues = Array.from(content.matchAll(/「([^」]*)」/g), (m) => m[1]);
  if (dialogues.length > 0) return dialogues.join("。");
  return content.replace(/\*[^*]*\*/g, "").trim() || content.trim();
}
