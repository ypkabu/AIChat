import type {
  AppSettings,
  CharacterControl,
  ContinueSuggestion,
  DirectorUpdate,
  ForeshadowingItem,
  ForeshadowingUpdate,
  ImageTriggerType,
  LorebookEntry,
  Memory,
  MemoryType,
  Message,
  PlaySession,
  QualityCheck,
  RelationshipValues,
  RelationshipState,
  SessionCharacterState,
  SessionEnvironmentState,
  Sensitivity,
  SmartReply,
  StorySummary,
  StoryBundle,
  SuggestedReply,
  TimelineItem,
  UserChoicePreferences,
  VisualCue
} from "@/lib/domain/types";

type InfoBoxTextUpdate<T extends string> = Partial<Record<T, string | null>>;

export type InfoBoxUpdate = {
  environment: InfoBoxTextUpdate<
    "date" | "time" | "location" | "weather" | "scene" | "current_objective" | "recent_event" | "next_pressure" | "chapter" | "scene_key"
  > | null;
  characterStates: Array<{
    characterId: string;
    updates: InfoBoxTextUpdate<
      "mood" | "condition" | "outfit" | "pose" | "goal" | "relationship" | "inner_thoughts" | "inventory" | "hidden_intent" | "last_action"
    >;
  }>;
};

export type ConversationRequest = {
  bundle: StoryBundle;
  session: PlaySession;
  messages: Message[];
  userInput: string;
  settings: AppSettings;
  environmentState?: SessionEnvironmentState | null;
  characterStates?: SessionCharacterState[];
  nsfwAllowed?: boolean;
  inputType?: "free_text" | "choice_selected" | "auto_continue" | "continue_without_user_speech";
  selectedChoice?: Pick<SuggestedReply, "label" | "type"> | null;
  relationships?: RelationshipState[];
  lorebook?: LorebookEntry[];
  memories?: Memory[];
  foreshadowingItems?: ForeshadowingItem[];
  storySummaries?: StorySummary[];
  provider?: string;
  model?: string;
  routeHint?: "normal" | "nsfw" | "cheap" | "smart";
  kind?: "conversation" | "smart_reply" | "summary" | "image_prompt" | "director";
  usageTotalCostJpy?: number;
  choicePreferences?: UserChoicePreferences | null;
};

export type ConversationResponse = {
  timeline: TimelineItem[];
  narration: string;
  characterMessages: Array<{
    characterId?: string;
    characterName: string;
    content: string;
  }>;
  suggestedReplies: SuggestedReply[];
  smartReplies: SmartReply[];
  needsUserInput: boolean;
  autoContinueAllowed: boolean;
  storyUpdate: {
    shouldAdvance: boolean;
    nextSceneKey: string | null;
    newFlags: Array<{ key: string; value: unknown }>;
    progressDelta: number;
  };
  memoryCandidates: Array<{
    content: string;
    type: MemoryType;
    importance: number;
    sensitivity: Sensitivity;
    reason: string;
  }>;
  relationshipDelta: RelationshipValues;
  imageCue: {
    shouldSuggestImage: boolean;
    reason: string | null;
    sceneType: string | null;
    nsfwLevel: "none" | "suggestive" | "explicit";
  };
  directorUpdate: DirectorUpdate;
  foreshadowingUpdates: ForeshadowingUpdate[];
  qualityCheck: QualityCheck;
  infoboxUpdate?: InfoBoxUpdate;
  continueSuggestion?: ContinueSuggestion | null;
  characterControl?: CharacterControl | null;
  usage: {
    backend: string;
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    latency_ms?: number | null;
    estimated_cost_jpy: number;
    prompt_chars?: number | null;
    routeHint?: "normal" | "nsfw" | "cheap" | "smart" | null;
    model_role?: string | null;
    reason?: string | null;
  };
  error?: {
    type: string;
    message: string;
    backend: string;
  };
};

export type ConversationStreamEvent =
  | {
      event: "timeline_item";
      data: TimelineItem;
    }
  | {
      event: "choices";
      data: {
        items: SuggestedReply[];
      };
    }
  | {
      event: "director_update";
      data: DirectorUpdate;
    }
  | {
      event: "usage";
      data: ConversationResponse["usage"];
    }
  | {
      event: "done";
      data: {
        usage?: ConversationResponse["usage"];
      };
    }
  | {
      event: "error";
      data: {
        message: string;
        fallback?: boolean;
      };
    };

export type BackgroundJobsResponse = {
  foreshadowingUpdates: ForeshadowingUpdate[];
  memoryCandidates: ConversationResponse["memoryCandidates"];
  relationshipDelta: RelationshipValues;
  imageCue: ConversationResponse["imageCue"];
  infoboxUpdate?: InfoBoxUpdate;
  visualCue?: VisualCue;
  usage?: {
    backend: string;
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    latency_ms?: number | null;
    estimated_cost_jpy: number;
    error?: string;
  };
};

export interface ConversationBackend {
  id: string;
  generateTurn(request: ConversationRequest): Promise<ConversationResponse>;
}

export type ImageGenerationRequest = {
  prompt: string;
  sessionId: string;
  scenarioId: string;
  triggerType: ImageTriggerType;
  nsfwAllowed: boolean;
  isNsfwRequested: boolean;
  quality: string;
  size: string;
  provider?: string;
  model?: string;
};

export type ImageGenerationResponse = {
  jobId: string;
  imageUrl: string;
  promptSummary: string;
  isNsfw: boolean;
  blurByDefault: boolean;
  usage: {
    backend: string;
    provider: string;
    model: string;
    image_count: number;
    estimated_cost_jpy: number;
  };
};

export interface ImageBackend {
  id: string;
  generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
}
