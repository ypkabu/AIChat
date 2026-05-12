import type { AppSettings } from "@/lib/domain/types";

export type ModelRole =
  | "normal_conversation"
  | "smart_conversation"
  | "nsfw_conversation"
  | "low_cost_conversation"
  | "director"
  | "smart_reply"
  | "summary"
  | "image_prompt";

export type ModelResolution = {
  provider: string;
  model: string;
  modelRole: ModelRole;
  reason: string;
};

export type ResolverContext = {
  settings: AppSettings;
  nsfw?: boolean;
  kind?: "conversation" | "smart_reply" | "summary" | "image_prompt" | "director";
  // Important event signals
  hasForeshadowingReady?: boolean;
  hasRelationshipMilestone?: boolean;
  isChapterClimax?: boolean;
  isBranchPoint?: boolean;
  isNewChapter?: boolean;
  lastQualityScore?: number | null;
  characterCount?: number;
  budgetLow?: boolean;
};

function pick(provider: string, model: string): { provider: string; model: string } {
  return { provider: provider || "openai", model: model || "gpt-4.1-mini" };
}

/**
 * Resolves which model/provider to use based on kind and context.
 * Priority order:
 *   1. kind=smart_reply → smart_reply_model
 *   2. kind=summary     → summary_model
 *   3. kind=image_prompt → image_prompt_model
 *   4. kind=director    → director_model
 *   5. nsfw=true        → nsfw_conversation_model
 *   6. low_cost_mode / budget_low → low_cost (cheap) model
 *   7. important event detected → smart_conversation_model
 *   8. default          → normal_conversation_model
 */
export function resolveModel(ctx: ResolverContext): ModelResolution {
  const s = ctx.settings;

  if (ctx.kind === "smart_reply") {
    return {
      ...pick(s.smart_reply_provider, s.smart_reply_model),
      modelRole: "smart_reply",
      reason: "kind=smart_reply"
    };
  }

  if (ctx.kind === "summary") {
    return {
      ...pick(s.summary_provider, s.summary_model),
      modelRole: "summary",
      reason: "kind=summary"
    };
  }

  if (ctx.kind === "image_prompt") {
    return {
      ...pick(s.image_prompt_provider, s.image_prompt_model),
      modelRole: "image_prompt",
      reason: "kind=image_prompt"
    };
  }

  if (ctx.kind === "director") {
    return {
      ...pick(s.director_provider, s.director_model),
      modelRole: "director",
      reason: "kind=director"
    };
  }

  // --- conversation flow below ---

  if (ctx.nsfw) {
    return {
      ...pick(s.nsfw_conversation_provider, s.nsfw_conversation_model),
      modelRole: "nsfw_conversation",
      reason: "nsfw_allowed"
    };
  }

  const budgetLow = ctx.budgetLow ?? false;

  if (s.low_cost_mode || budgetLow) {
    return {
      ...pick(s.cheap_conversation_provider, s.cheap_conversation_model),
      modelRole: "low_cost_conversation",
      reason: s.low_cost_mode ? "low_cost_mode=true" : "budget_low"
    };
  }

  if (s.smart_model_for_major_event) {
    const reasons: string[] = [];

    if (ctx.hasForeshadowingReady) reasons.push("foreshadowing_ready");
    if (ctx.hasRelationshipMilestone) reasons.push("relationship_milestone");
    if (ctx.isChapterClimax) reasons.push("chapter_climax");
    if (ctx.isBranchPoint) reasons.push("branch_point");
    if (ctx.isNewChapter) reasons.push("new_chapter");
    if (ctx.lastQualityScore != null && ctx.lastQualityScore < 4) reasons.push("low_quality_recovery");
    if ((ctx.characterCount ?? 0) >= 3) reasons.push("multi_character");

    if (reasons.length > 0) {
      return {
        ...pick(s.smart_conversation_provider, s.smart_conversation_model),
        modelRole: "smart_conversation",
        reason: reasons.join(",")
      };
    }
  }

  return {
    ...pick(s.normal_conversation_provider, s.normal_conversation_model),
    modelRole: "normal_conversation",
    reason: "normal"
  };
}

/**
 * Derives important event signals from ConversationRequest data.
 * Called from API routes to build ResolverContext.
 */
export function detectImportantEventSignals(payload: {
  session: { progress_percent?: number; stall_count?: number };
  characters?: Array<unknown>;
  foreshadowingItems?: Array<{ status?: string }>;
  lastQualityScore?: number | null;
}): Partial<ResolverContext> {
  const progress = payload.session.progress_percent ?? 0;
  const foreshadowingItems = payload.foreshadowingItems ?? [];

  const hasForeshadowingReady = foreshadowingItems.some(
    (f) => f.status === "ready"
  );

  // chapter climax: near end or at ~25/50/75% milestones
  const isChapterClimax =
    progress >= 90 ||
    [24, 25, 26, 49, 50, 51, 74, 75, 76].includes(Math.round(progress));

  const isNewChapter =
    [0, 1, 2, 23, 24, 48, 49, 73, 74].includes(Math.round(progress));

  const characterCount = Array.isArray(payload.characters)
    ? payload.characters.length
    : 0;

  return {
    hasForeshadowingReady,
    isChapterClimax,
    isNewChapter,
    characterCount,
    lastQualityScore: payload.lastQualityScore ?? null
  };
}
