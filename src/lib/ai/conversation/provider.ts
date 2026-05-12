import { MockConversationProvider } from "./mockProvider";
import { OpenAIConversationProvider } from "./openaiProvider";
import { AnthropicConversationProvider } from "./providers/anthropicProvider";
import { GoogleConversationProvider } from "./providers/googleProvider";
import type { ConversationProvider } from "./types";

export function getConversationProvider(requestedId: string, model?: string): ConversationProvider {
  const providerId = requestedId.toLowerCase();
  const modelFromId = requestedId.includes(":") ? requestedId.split(":").slice(1).join(":") : undefined;
  const resolvedModel = model ?? modelFromId;

  if (providerId === "anthropic" || providerId.startsWith("anthropic:")) {
    return new AnthropicConversationProvider(resolvedModel);
  }

  if (providerId === "google" || providerId === "gemini" || providerId.startsWith("google:") || providerId.startsWith("gemini:")) {
    return new GoogleConversationProvider(resolvedModel);
  }

  if (providerId === "openai" || providerId.startsWith("openai:")) {
    return new OpenAIConversationProvider(resolvedModel);
  }

  // env-level override (for backward compat)
  const envProvider = process.env.CONVERSATION_PROVIDER?.toLowerCase();
  if (envProvider === "openai") {
    return new OpenAIConversationProvider(resolvedModel);
  }

  if (providerId === "mock-nsfw" || providerId === "mock-private-nsfw") {
    return new MockConversationProvider("mock-nsfw", true);
  }

  return new MockConversationProvider(providerId || "mock-normal", false);
}
