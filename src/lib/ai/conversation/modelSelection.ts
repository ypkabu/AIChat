import type { ConversationRequest } from "@/lib/ai/types";
import { resolveModel, detectImportantEventSignals } from "./modelResolver";

/** Backward-compatible wrapper used by existing API routes. */
export function selectConversationModel(payload: ConversationRequest, nsfw: boolean) {
  const budgetLow =
    payload.settings.auto_switch_when_budget_low &&
    (payload.usageTotalCostJpy ?? 0) >= payload.settings.monthly_budget_jpy * 0.9;

  const signals = detectImportantEventSignals({
    session: payload.session,
    characters: payload.bundle?.characters,
    foreshadowingItems: payload.foreshadowingItems,
    lastQualityScore: null
  });

  const resolution = resolveModel({
    settings: payload.settings,
    nsfw,
    kind: payload.kind ?? "conversation",
    budgetLow,
    ...signals
  });

  const routeMap: Record<string, "normal" | "nsfw" | "cheap" | "smart"> = {
    normal_conversation: "normal",
    nsfw_conversation: "nsfw",
    low_cost_conversation: "cheap",
    smart_conversation: "smart",
    director: "smart",
    smart_reply: "normal",
    summary: "cheap",
    image_prompt: "normal"
  };

  return {
    provider: resolution.provider,
    model: resolution.model,
    modelRole: resolution.modelRole,
    reason: resolution.reason,
    routeHint: routeMap[resolution.modelRole] ?? ("normal" as const)
  };
}
