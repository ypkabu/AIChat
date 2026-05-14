const JSON_PAYLOAD_NOTICE = "過去のAI応答が旧形式のJSONとして保存されています。新しい応答では本文だけを表示します。";
const SCHEMA_ERROR_NOTICE = "過去のAI応答形式エラーを短縮表示しています。もう一度送信すると現在の形式で再生成されます。";

export function displayContent(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return content;
  if (looksLikeConversationJson(trimmed)) return JSON_PAYLOAD_NOTICE;
  if (looksLikeProviderSchemaError(trimmed)) return SCHEMA_ERROR_NOTICE;
  return content;
}

function looksLikeConversationJson(value: string) {
  if (!(value.startsWith("{") || value.startsWith("["))) return false;
  return value.includes("\"timeline\"") || value.includes("\"suggestedReplies\"") || value.includes("\"directorUpdate\"");
}

function looksLikeProviderSchemaError(value: string) {
  return value.includes("Invalid schema for response_format") || value.includes("OpenAI conversation request failed");
}
