import { z } from "zod";
import { DEFAULT_RELATIONSHIP } from "@/lib/domain/constants";
import { newId } from "@/lib/utils";
import type { ConversationResponse } from "../types";
import type {
  ChoiceAgency,
  ChoiceIntent,
  ChoiceProgression,
  ChoiceStyle,
  ChoiceTone,
  TimelineItem
} from "@/lib/domain/types";

export const choiceTypeSchema = z.enum([
  "talk",
  "action",
  "observe",
  "silence",
  "approach",
  "leave",
  "question",
  "avoid",
  "honest",
  "flirt",
  "intimate"
]);

const relationshipDeltaSchema = z.object({
  trust: z.number().int().min(-5).max(5).default(0),
  affection: z.number().int().min(-5).max(5).default(0),
  comfort: z.number().int().min(-5).max(5).default(0),
  curiosity: z.number().int().min(-5).max(5).default(0),
  tension: z.number().int().min(-5).max(5).default(0)
});

const timelineItemSchema = z.object({
  type: z.enum(["narration", "character", "system", "event"]),
  characterName: z.string().nullable().default(null),
  content: z.string().min(1)
});

const directorUpdateSchema = z.object({
  currentBeatIndex: z.number().int().min(0).default(0),
  objectiveCompleted: z.boolean().default(false),
  stallRisk: z.enum(["low", "medium", "high"]).default("low"),
  shouldAdvanceScene: z.boolean().default(false),
  shouldIntroduceEvent: z.boolean().default(false),
  introducedHook: z.string().nullable().default(null),
  reason: z.string().default("")
});

const revealConditionSchema = z.object({
  sceneKey: z.string().nullable().default(null),
  flagKey: z.string().nullable().default(null),
  relationshipHint: z.string().nullable().default(null),
  notes: z.string().nullable().default(null)
});

const foreshadowingUpdateSchema = z.object({
  action: z.enum(["create", "introduce", "reinforce", "mark_ready", "reveal", "discard"]),
  foreshadowingId: z.string().nullable().default(null),
  title: z.string().default(""),
  clueText: z.string().default(""),
  hiddenTruth: z.string().nullable().default(null),
  importance: z.number().int().min(1).max(5).default(3),
  relatedCharacterName: z.string().nullable().default(null),
  plannedRevealSceneKey: z.string().nullable().default(null),
  revealCondition: revealConditionSchema.default({
    sceneKey: null,
    flagKey: null,
    relationshipHint: null,
    notes: null
  }),
  revealedText: z.string().nullable().default(null),
  reason: z.string().default("")
});

const qualityCheckSchema = z.object({
  isRepetitive: z.boolean().default(false),
  hasNewInformation: z.boolean().default(false),
  hasCharacterAction: z.boolean().default(false),
  hasEmotionalChange: z.boolean().default(false),
  hasRelationshipChange: z.boolean().default(false),
  hasSceneChange: z.boolean().default(false),
  hasForeshadowing: z.boolean().default(false),
  hasChoicePressure: z.boolean().default(false),
  hasForwardMotion: z.boolean().default(true),
  isStalling: z.boolean().default(false),
  sceneObjectiveProgress: z.enum(["low", "medium", "high"]).default("medium"),
  qualityScore: z.number().int().min(0).max(10).default(7),
  problem: z.string().nullable().default(null),
  improvementHint: z.string().nullable().default(null)
});

const continueSuggestionSchema = z.object({
  available: z.boolean().default(false),
  label: z.string().default("続きを見る"),
  reason: z.string().nullable().default(null)
});

const vrmExpressionSchema = z.enum([
  "neutral", "smile", "blush", "embarrassed",
  "annoyed", "angry", "sad", "worried", "surprised", "serious"
]).default("neutral");

const vrmMotionSchema = z.enum([
  "idle", "idle_breathing", "nod", "shake_head",
  "look_away", "look_at_user", "cross_arms",
  "hand_on_chest", "small_wave", "shy_shift", "surprised_step"
]).default("idle");

const characterControlSchema = z.object({
  targetCharacter: z.string().default(""),
  expression: vrmExpressionSchema,
  motion: vrmMotionSchema,
  gaze: z.enum(["look_at_user", "look_away", "look_down", "look_side"]).default("look_at_user"),
  cameraDistance: z.enum(["close", "medium", "wide"]).default("medium"),
  position: z.enum(["left", "center", "right"]).default("center"),
  intensity: z.number().min(0).max(1).default(0.7)
});

export const conversationOutputSchema = z.object({
  timeline: z.array(timelineItemSchema).default([]),
  narration: z.string().default(""),
  characterMessages: z.array(
    z.object({
      characterName: z.string().min(1),
      content: z.string().min(1)
    })
  ).default([]),
  suggestedReplies: z.array(
    z.object({
      label: z.string().min(1),
      type: choiceTypeSchema,
      effect: relationshipDeltaSchema,
      intent: z.string().nullable().optional(),
      tone: z.string().nullable().optional(),
      agency: z.string().nullable().optional(),
      choiceStyle: z.string().nullable().optional(),
      progression: z.string().nullable().optional(),
      romanceLevel: z.number().int().min(0).max(5).nullable().optional(),
      intimacyLevel: z.number().int().min(0).max(5).nullable().optional(),
      riskLevel: z.string().nullable().optional(),
      why: z.string().nullable().optional()
    })
  ).default([]),
  smartReplies: z.array(z.object({
    id: z.string().default(() => newId("sr")),
    label: z.string().min(1),
    intent: z.string().nullable().optional(),
    tone: z.string().nullable().optional(),
    agency: z.string().nullable().optional()
  })).max(3).default([]),
  needsUserInput: z.boolean().default(true),
  autoContinueAllowed: z.boolean().default(false),
  storyUpdate: z.object({
    shouldAdvance: z.boolean().default(false),
    nextSceneKey: z.string().nullable().default(null),
    newFlags: z.array(z.object({
      key: z.string(),
      value: z.union([z.boolean(), z.string(), z.number(), z.null()])
    })).default([]),
    progressDelta: z.number().int().min(0).max(20).default(0)
  }).default({
    shouldAdvance: false,
    nextSceneKey: null,
    newFlags: [],
    progressDelta: 0
  }),
  memoryCandidates: z.array(
    z.object({
      content: z.string().min(1),
      type: z.enum([
        "user_memory",
        "character_memory",
        "relationship_memory",
        "story_memory",
        "promise",
        "preference",
        "sensitive",
        "explicit"
      ]).default("story_memory"),
      importance: z.number().int().min(1).max(5).default(3),
      sensitivity: z.enum(["normal", "sensitive", "explicit"]).default("normal"),
      reason: z.string().default("")
    })
  ).default([]),
  relationshipDelta: relationshipDeltaSchema.default(DEFAULT_RELATIONSHIP),
  imageCue: z.object({
    shouldSuggestImage: z.boolean().default(false),
    reason: z.string().nullable().default(null),
    sceneType: z.string().nullable().default(null),
    nsfwLevel: z.enum(["none", "suggestive", "explicit"]).default("none")
  }).default({
    shouldSuggestImage: false,
    reason: null,
    sceneType: null,
    nsfwLevel: "none"
  }),
  directorUpdate: directorUpdateSchema.default({
    currentBeatIndex: 0,
    objectiveCompleted: false,
    stallRisk: "low",
    shouldAdvanceScene: false,
    shouldIntroduceEvent: false,
    introducedHook: null,
    reason: ""
  }),
  foreshadowingUpdates: z.array(foreshadowingUpdateSchema).default([]),
  continueSuggestion: continueSuggestionSchema.nullable().default({
    available: false,
    label: "続きを見る",
    reason: null
  }),
  characterControl: characterControlSchema.nullable().default(null),
  qualityCheck: qualityCheckSchema.default({
    isRepetitive: false,
    hasNewInformation: false,
    hasCharacterAction: false,
    hasEmotionalChange: false,
    hasRelationshipChange: false,
    hasSceneChange: false,
    hasForeshadowing: false,
    hasChoicePressure: false,
    hasForwardMotion: true,
    isStalling: false,
    sceneObjectiveProgress: "medium",
    qualityScore: 7,
    problem: null,
    improvementHint: null
  })
});

export const conversationJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "timeline",
    "suggestedReplies",
    "smartReplies",
    "directorUpdate",
    "continueSuggestion",
    "characterControl"
  ],
  properties: {
    timeline: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "characterName", "content"],
        properties: {
          type: { type: "string", enum: ["narration", "character", "system", "event"] },
          characterName: { type: ["string", "null"] },
          content: { type: "string" }
        }
      }
    },
    suggestedReplies: {
      type: "array",
      minItems: 0,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "type", "effect", "intent", "tone", "agency", "choiceStyle", "progression", "romanceLevel", "intimacyLevel", "riskLevel", "why"],
        properties: {
          label: { type: "string" },
          type: { type: "string", enum: choiceTypeSchema.options },
          effect: relationshipJsonSchema(),
          intent: { type: ["string", "null"], enum: ["honest","tease","comfort","flirt","affection","observe","silent","dominant","submissive","avoid","action","question","meta","intimate", null] },
          tone: { type: ["string", "null"], enum: ["casual","sweet","romantic","serious","playful","dark","intimate","comedy","calm","tense", null] },
          agency: { type: ["string", "null"], enum: ["active","passive","vulnerable","assertive","reserved","supportive","teasing","protective", null] },
          choiceStyle: { type: ["string", "null"], enum: ["keyword","sentence","short","natural","detailed","action_only","line_only","mixed", null] },
          progression: { type: ["string", "null"], enum: ["story_forward","relationship","world_lore","character_focus","event_trigger","slow_burn","conflict","recovery", null] },
          romanceLevel: { type: ["number", "null"] },
          intimacyLevel: { type: ["number", "null"] },
          riskLevel: { type: ["string", "null"], enum: ["low","medium","high", null] },
          why: { type: ["string", "null"] }
        }
      }
    },
    smartReplies: {
      type: "array",
      minItems: 0,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "label"],
        properties: {
          id: { type: "string" },
          label: { type: "string" },
          intent: { anyOf: [{ type: "string", enum: ["honest","tease","comfort","flirt","affection","observe","silent","dominant","submissive","avoid","action","question","meta","intimate"] }, { type: "null" }] },
          tone: { anyOf: [{ type: "string", enum: ["casual","sweet","romantic","serious","playful","dark","intimate","comedy","calm","tense"] }, { type: "null" }] },
          agency: { anyOf: [{ type: "string", enum: ["active","passive","vulnerable","assertive","reserved","supportive","teasing","protective"] }, { type: "null" }] }
        }
      }
    },
    directorUpdate: directorUpdateJsonSchema(),
    continueSuggestion: {
      type: "object",
      additionalProperties: false,
      required: ["available", "label", "reason"],
      properties: {
        available: { type: "boolean" },
        label: { type: "string" },
        reason: { type: ["string", "null"] }
      }
    },
    characterControl: {
      anyOf: [
        { type: "null" },
        {
      type: "object",
      additionalProperties: false,
      required: ["targetCharacter", "expression", "motion", "gaze", "cameraDistance", "position", "intensity"],
      properties: {
        targetCharacter: { type: "string" },
        expression: { type: "string", enum: ["neutral","smile","blush","embarrassed","annoyed","angry","sad","worried","surprised","serious"] },
        motion: { type: "string", enum: ["idle","idle_breathing","nod","shake_head","look_away","look_at_user","cross_arms","hand_on_chest","small_wave","shy_shift","surprised_step"] },
        gaze: { type: "string", enum: ["look_at_user","look_away","look_down","look_side"] },
        cameraDistance: { type: "string", enum: ["close","medium","wide"] },
        position: { type: "string", enum: ["left","center","right"] },
        intensity: { type: "number" }
      }
        }
      ]
    }
  }
} as const;

export function parseConversationJson(
  text: string,
  usage: ConversationResponse["usage"],
  backend: string
): ConversationResponse {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse conversation AI JSON", error, text);
    return fallbackFromRawText(text, usage, backend, error instanceof Error ? error.message : "Unknown JSON parse error");
  }

  try {
    const parsed = conversationOutputSchema.parse(normalizeConversationPayload(raw, text));
    const timeline = parsed.timeline.length ? parsed.timeline : legacyToTimeline(parsed.narration, parsed.characterMessages);
    const narration = parsed.narration || timeline.find((item) => item.type === "narration")?.content || "";
    const characterMessages = parsed.characterMessages.length
      ? parsed.characterMessages
      : timeline
          .filter((item) => item.type === "character")
          .map((item) => ({
            characterName: item.characterName ?? "語り手",
            content: item.content
          }));
    const mustStopAuto = parsed.needsUserInput || parsed.imageCue.shouldSuggestImage || parsed.imageCue.nsfwLevel !== "none";
    return {
      ...parsed,
      timeline,
      narration,
      characterMessages,
      suggestedReplies: parsed.suggestedReplies.map((reply) => ({
        id: newId("choice"),
        ...reply,
        intent: (reply.intent ?? null) as ChoiceIntent | null,
        tone: (reply.tone ?? null) as ChoiceTone | null,
        agency: (reply.agency ?? null) as ChoiceAgency | null,
        choiceStyle: (reply.choiceStyle ?? null) as ChoiceStyle | null,
        progression: (reply.progression ?? null) as ChoiceProgression | null,
        why: reply.why ?? null
      })),
      smartReplies: (parsed.smartReplies ?? []).map((r) => ({
        ...r,
        intent: (r.intent ?? null) as ChoiceIntent | null,
        tone: (r.tone ?? null) as ChoiceTone | null,
        agency: (r.agency ?? null) as ChoiceAgency | null
      })),
      needsUserInput: parsed.needsUserInput || mustStopAuto,
      autoContinueAllowed: parsed.autoContinueAllowed && !mustStopAuto,
      continueSuggestion: mustStopAuto
        ? { available: false, label: "続きを見る", reason: "重要分岐のため停止" }
        : (parsed.continueSuggestion ?? { available: true, label: "続きを見る", reason: null }),
      characterControl: parsed.characterControl ?? null,
      storyUpdate: {
        ...parsed.storyUpdate,
        newFlags: parsed.storyUpdate.newFlags.map((flag) => ({
          key: flag.key,
          value: flag.value
        }))
      },
      usage
    };
  } catch (error) {
    console.error("Failed to validate conversation AI JSON", error, text);
    return fallbackFromRawText(text, usage, backend, error instanceof Error ? error.message : "Unknown parse error");
  }
}

export function fallbackFromRawText(
  text: string,
  usage: ConversationResponse["usage"],
  backend: string,
  message: string,
  type = "parse_error"
): ConversationResponse {
  return {
    timeline: [
      {
        type: "narration",
        characterName: null,
        content: text || "AI応答の解析に失敗しました。"
      }
    ],
    narration: text || "AI応答の解析に失敗しました。",
    characterMessages: [],
    suggestedReplies: [
      {
        id: newId("choice"),
        label: "安全に続きを尋ねる",
        type: "talk",
        effect: { trust: 0, affection: 0, comfort: 0, curiosity: 1, tension: 0 }
      },
      {
        id: newId("choice"),
        label: "場面を整理する",
        type: "observe",
        effect: { trust: 0, affection: 0, comfort: 1, curiosity: 1, tension: -1 }
      }
    ],
    smartReplies: [],
    needsUserInput: true,
    autoContinueAllowed: false,
    continueSuggestion: { available: false, label: "続きを見る", reason: null },
    characterControl: null,
    storyUpdate: {
      shouldAdvance: false,
      nextSceneKey: null,
      newFlags: [],
      progressDelta: 0
    },
    memoryCandidates: [],
    relationshipDelta: DEFAULT_RELATIONSHIP,
    imageCue: {
      shouldSuggestImage: false,
      reason: null,
      sceneType: null,
      nsfwLevel: "none"
    },
    directorUpdate: {
      currentBeatIndex: 0,
      objectiveCompleted: false,
      stallRisk: "low",
      shouldAdvanceScene: false,
      shouldIntroduceEvent: false,
      introducedHook: null,
      reason: "AI応答の解析または生成に失敗したため、進行判断は保留しました。"
    },
    foreshadowingUpdates: [],
    qualityCheck: {
      isRepetitive: false,
      hasNewInformation: false,
      hasCharacterAction: false,
      hasEmotionalChange: false,
      hasRelationshipChange: false,
      hasSceneChange: false,
      hasForeshadowing: false,
      hasChoicePressure: false,
      hasForwardMotion: false,
      isStalling: true,
      sceneObjectiveProgress: "low",
      qualityScore: 4,
      problem: "AI応答を通常形式で取得できませんでした。",
      improvementHint: "次ターンで短い新情報か具体的な行動を入れて、場面目的へ戻す。"
    },
    usage,
    error: {
      type,
      message,
      backend
    }
  };
}

function legacyToTimeline(
  narration: string,
  characterMessages: Array<{ characterName: string; content: string }>
) {
  return [
    ...(narration
      ? [
          {
            type: "narration" as const,
            characterName: null,
            content: narration
          }
        ]
      : []),
    ...characterMessages.map((message) => ({
      type: "character" as const,
      characterName: message.characterName,
      content: message.content
    }))
  ];
}

function normalizeConversationPayload(raw: unknown, rawText: string) {
  if (!isRecord(raw)) {
    console.error("Conversation AI JSON root is not an object", rawText);
    return {
      timeline: [rawTextToNarrationItem(rawText)]
    };
  }

  const normalized = { ...raw };
  if (Array.isArray(raw.timeline)) {
    const timeline = raw.timeline
      .map(normalizeTimelineItem)
      .filter((item): item is TimelineItem => Boolean(item));
    normalized.timeline = timeline.length ? timeline : fallbackTimelineFromPayload(raw, rawText);
  } else {
    normalized.timeline = fallbackTimelineFromPayload(raw, rawText);
  }
  if (!Array.isArray(raw.foreshadowingUpdates)) {
    normalized.foreshadowingUpdates = [];
  }
  if (typeof normalized.needsUserInput !== "boolean") {
    normalized.needsUserInput = inferNeedsUserInput(normalized);
  }
  if (typeof normalized.autoContinueAllowed !== "boolean") {
    normalized.autoContinueAllowed = !normalized.needsUserInput;
  }
  normalized.storyUpdate = isRecord(normalized.storyUpdate) ? normalized.storyUpdate : {
    shouldAdvance: Boolean(asRecord(normalized.directorUpdate).shouldAdvanceScene),
    nextSceneKey: null,
    newFlags: [],
    progressDelta: Boolean(asRecord(normalized.directorUpdate).objectiveCompleted) ? 2 : 0
  };
  if (!Array.isArray(normalized.memoryCandidates)) normalized.memoryCandidates = [];
  if (!isRecord(normalized.relationshipDelta)) normalized.relationshipDelta = DEFAULT_RELATIONSHIP;
  if (!isRecord(normalized.imageCue)) {
    normalized.imageCue = {
      shouldSuggestImage: false,
      reason: null,
      sceneType: null,
      nsfwLevel: "none"
    };
  }
  if (!isRecord(normalized.qualityCheck)) {
    normalized.qualityCheck = {
      isRepetitive: false,
      hasNewInformation: true,
      hasCharacterAction: true,
      hasEmotionalChange: false,
      hasRelationshipChange: false,
      hasSceneChange: Boolean(asRecord(normalized.directorUpdate).shouldAdvanceScene),
      hasForeshadowing: false,
      hasChoicePressure: Array.isArray(normalized.suggestedReplies) && normalized.suggestedReplies.length > 0,
      hasForwardMotion: true,
      isStalling: false,
      sceneObjectiveProgress: Boolean(asRecord(normalized.directorUpdate).objectiveCompleted) ? "high" : "medium",
      qualityScore: 7,
      problem: null,
      improvementHint: null
    };
  }

  return normalized;
}

function inferNeedsUserInput(payload: Record<string, unknown>) {
  const replies = Array.isArray(payload.suggestedReplies) ? payload.suggestedReplies : [];
  const director = asRecord(payload.directorUpdate);
  return replies.length > 0 || Boolean(director.shouldAdvanceScene) || Boolean(director.shouldIntroduceEvent);
}

function fallbackTimelineFromPayload(payload: Record<string, unknown>, rawText: string): TimelineItem[] {
  const narration = typeof payload.narration === "string" ? payload.narration.trim() : "";
  if (narration) return [rawTextToNarrationItem(narration)];

  const legacyMessages = Array.isArray(payload.characterMessages)
    ? payload.characterMessages
        .map((message) => normalizeTimelineItem({ ...asRecord(message), type: "character" }))
        .filter((item): item is TimelineItem => Boolean(item))
    : [];
  if (legacyMessages.length) return legacyMessages;

  return [rawTextToNarrationItem(rawText)];
}

function normalizeTimelineItem(rawItem: unknown): TimelineItem | null {
  if (!isRecord(rawItem)) return null;

  const content = stringValue(rawItem.content)?.trim();
  if (!content) return null;

  const speaker = stringValue(rawItem.speaker) ?? stringValue(rawItem.characterName);
  const rawType = stringValue(rawItem.type)?.trim().toLowerCase();
  const type = normalizeTimelineType(rawType, speaker);

  if (type === "narration") {
    return { type: "narration", characterName: null, content };
  }

  if (type === "system" || type === "event") {
    return { type, characterName: null, content };
  }

  return {
    type: "character",
    characterName: speaker ?? "語り手",
    content
  };
}

function normalizeTimelineType(type: string | undefined, speaker: string | undefined): TimelineItem["type"] {
  if (!speaker) return "narration";
  if (!type) return "character";
  if (type === "dialogue" || type === "character") return "character";
  if (type === "system" || type === "event" || type === "narration") return type;
  return "narration";
}

function rawTextToNarrationItem(text: string): TimelineItem {
  return {
    type: "narration",
    characterName: null,
    content: text || "AI応答の解析に失敗しました。"
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function asRecord(value: unknown) {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function directorUpdateJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "currentBeatIndex",
      "objectiveCompleted",
      "stallRisk",
      "shouldAdvanceScene",
      "shouldIntroduceEvent",
      "introducedHook",
      "reason"
    ],
    properties: {
      currentBeatIndex: { type: "integer", minimum: 0 },
      objectiveCompleted: { type: "boolean" },
      stallRisk: { type: "string", enum: ["low", "medium", "high"] },
      shouldAdvanceScene: { type: "boolean" },
      shouldIntroduceEvent: { type: "boolean" },
      introducedHook: { type: ["string", "null"] },
      reason: { type: "string" }
    }
  } as const;
}

function foreshadowingUpdateJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "action",
      "foreshadowingId",
      "title",
      "clueText",
      "hiddenTruth",
      "importance",
      "relatedCharacterName",
      "plannedRevealSceneKey",
      "revealCondition",
      "revealedText",
      "reason"
    ],
    properties: {
      action: { type: "string", enum: ["create", "introduce", "reinforce", "mark_ready", "reveal", "discard"] },
      foreshadowingId: { type: ["string", "null"] },
      title: { type: "string" },
      clueText: { type: "string" },
      hiddenTruth: { type: ["string", "null"] },
      importance: { type: "integer", minimum: 1, maximum: 5 },
      relatedCharacterName: { type: ["string", "null"] },
      plannedRevealSceneKey: { type: ["string", "null"] },
      revealCondition: {
        type: "object",
        additionalProperties: false,
        required: ["sceneKey", "flagKey", "relationshipHint", "notes"],
        properties: {
          sceneKey: { type: ["string", "null"] },
          flagKey: { type: ["string", "null"] },
          relationshipHint: { type: ["string", "null"] },
          notes: { type: ["string", "null"] }
        }
      },
      revealedText: { type: ["string", "null"] },
      reason: { type: "string" }
    }
  } as const;
}

function qualityCheckJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "isRepetitive",
      "hasNewInformation",
      "hasCharacterAction",
      "hasEmotionalChange",
      "hasRelationshipChange",
      "hasSceneChange",
      "hasForeshadowing",
      "hasChoicePressure",
      "hasForwardMotion",
      "isStalling",
      "sceneObjectiveProgress",
      "qualityScore",
      "problem",
      "improvementHint"
    ],
    properties: {
      isRepetitive: { type: "boolean" },
      hasNewInformation: { type: "boolean" },
      hasCharacterAction: { type: "boolean" },
      hasEmotionalChange: { type: "boolean" },
      hasRelationshipChange: { type: "boolean" },
      hasSceneChange: { type: "boolean" },
      hasForeshadowing: { type: "boolean" },
      hasChoicePressure: { type: "boolean" },
      hasForwardMotion: { type: "boolean" },
      isStalling: { type: "boolean" },
      sceneObjectiveProgress: { type: "string", enum: ["low", "medium", "high"] },
      qualityScore: { type: "integer", minimum: 0, maximum: 10 },
      problem: { type: ["string", "null"] },
      improvementHint: { type: ["string", "null"] }
    }
  } as const;
}

function relationshipJsonSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["trust", "affection", "comfort", "curiosity", "tension"],
    properties: {
      trust: { type: "integer", minimum: -5, maximum: 5 },
      affection: { type: "integer", minimum: -5, maximum: 5 },
      comfort: { type: "integer", minimum: -5, maximum: 5 },
      curiosity: { type: "integer", minimum: -5, maximum: 5 },
      tension: { type: "integer", minimum: -5, maximum: 5 }
    }
  } as const;
}
