import type { AppSettings, ForbiddenContentRule, RelationshipValues } from "./types";

export const APP_USER_ID = "local-user";

export const FORBIDDEN_CONTENT_RULES: ForbiddenContentRule[] = [
  {
    key: "non_consent",
    label: "非合意・強制・脅迫・性的暴力",
    description: "合意のない性的行為、強制、脅迫、性的暴力を扱わない。",
    applies_to: ["conversation", "image"],
    enabled: true
  },
  {
    key: "incest",
    label: "近親相姦",
    description: "近親相姦を含む性的コンテンツを扱わない。",
    applies_to: ["conversation", "image"],
    enabled: true
  },
  {
    key: "real_person_deepfake",
    label: "実在人物の性的ディープフェイク",
    description: "実在人物を性的に描写または画像化するディープフェイクを扱わない。",
    applies_to: ["conversation", "image"],
    enabled: true
  },
  {
    key: "trafficking_exploitation_abuse",
    label: "人身売買・搾取・性的虐待",
    description: "人身売買、搾取、性的虐待を扱わない。",
    applies_to: ["conversation", "image"],
    enabled: true
  },
  {
    key: "bestiality",
    label: "動物との性的行為",
    description: "動物との性的行為を扱わない。",
    applies_to: ["conversation", "image"],
    enabled: true
  },
  {
    key: "illegal_content",
    label: "違法コンテンツ",
    description: "違法行為や違法コンテンツを扱わない。",
    applies_to: ["conversation", "image"],
    enabled: true
  },
  {
    key: "non_consensual_intimate_images",
    label: "非同意の親密画像",
    description: "リベンジポルノや非同意の親密画像を扱わない。",
    applies_to: ["conversation", "image"],
    enabled: true
  }
];

export const DEFAULT_RELATIONSHIP: RelationshipValues = {
  trust: 0,
  affection: 0,
  comfort: 0,
  curiosity: 0,
  tension: 0
};

export const DEFAULT_SETTINGS: AppSettings = {
  adult_confirmed: false,
  nsfw_chat_enabled: false,
  nsfw_image_enabled: false,
  blur_nsfw_images: true,
  hide_sensitive_memories: true,
  show_nsfw_in_history: false,
  startup_age_gate: true,
  monthly_budget_jpy: 5000,
  conversation_budget_jpy: 3500,
  image_budget_jpy: 1200,
  low_cost_mode: true,
  choice_send_behavior: "send_immediately",
  normal_conversation_backend: "openai",
  nsfw_conversation_backend: "openai",
  normal_conversation_provider: "openai",
  normal_conversation_model: "gpt-4.1-mini",
  nsfw_conversation_provider: "openai",
  nsfw_conversation_model: "gpt-4.1-mini",
  cheap_conversation_provider: "openai",
  cheap_conversation_model: "gpt-4.1-mini",
  smart_conversation_provider: "openai",
  smart_conversation_model: "gpt-4.1",
  standard_image_backend: "mock-standard-image",
  nsfw_image_backend: "mock-private-nsfw-image",
  standard_image_provider: "mock",
  standard_image_model: "mock-standard-image",
  nsfw_image_provider: "mock",
  nsfw_image_model: "mock-private-nsfw-image",
  image_generation_enabled: true,
  suggest_images_on_major_events: true,
  allow_manual_image_generation: true,
  image_quality: "standard",
  image_size: "portrait",
  smart_model_for_major_event: true,
  auto_switch_when_budget_low: true,
  story_director_debug_enabled: false,
  timeline_reveal_enabled: true,
  timeline_reveal_speed: "normal",
  streaming_display_enabled: true,
  typewriter_enabled: true,
  typewriter_speed: "normal",
  real_streaming_enabled: false,
  streaming_fallback_enabled: true,
  show_skip_button: true,
  daily_image_limit: 5,
  monthly_image_limit: 60,
  voice_enabled: false,
  voice_provider: "mock",
  voice_auto_play: false,
  voice_budget_jpy: 0,
  voice_narration_enabled: false,
  director_provider: "openai",
  director_model: "gpt-4.1",
  smart_reply_provider: "openai",
  smart_reply_model: "gpt-4.1-mini",
  summary_provider: "openai",
  summary_model: "gpt-4.1-mini",
  image_prompt_provider: "openai",
  image_prompt_model: "gpt-4.1-mini",
  model_preset: "balanced",
  // Scene visual system
  visual_mode: "scene_bundle" as const,
  background_transition: "fade" as const,
  base_image_quality: "standard" as const,
  expression_variant_quality: "draft" as const,
  event_cg_quality: "high" as const,
  expression_pregen_enabled: false,
  image_monthly_budget_jpy: 1400,
  base_image_budget_jpy: 800,
  expression_variant_budget_jpy: 400,
  event_cg_budget_jpy: 200,
  // Choice preference learning
  choice_learning_enabled: true,
  show_choice_effect_hints: false,
  preference_strength: "normal" as const,
  // Experience mode + VRM
  experience_mode: "story" as const,
  vrm_enabled: true,
  vrm_quality: "low" as const,
  vrm_fps_limit: 30,
  vrm_shadow_enabled: false,
  vrm_physics_enabled: true
};

export const IMAGE_QUALITY_PRESETS = [
  { key: "fast",    label: "高速",   quality: "draft"    as const, size: "square"   as const },
  { key: "balance", label: "バランス", quality: "standard" as const, size: "portrait" as const },
  { key: "quality", label: "高品質",  quality: "high"     as const, size: "portrait" as const }
] as const;

export type GenrePreset = {
  key: string;
  label: string;
  description: string;
  genre: string;
  moods: string[];
  prose_style: string;
  expression_style: "dialogue_heavy" | "balanced" | "action_heavy";
  response_length: "short" | "medium" | "long" | "auto";
  pacing: "fast" | "natural" | "slow";
  image_style_preset?: string;
  voice_style_preset?: string;
};

export const GENRE_PRESETS: GenrePreset[] = [
  {
    key: "romance_school",
    label: "学園恋愛",
    description: "距離感、信頼、嫉妬、告白未満の緊張感。甘酸っぱい青春ロマンス。",
    genre: "学園恋愛",
    moods: ["ロマンス", "青春", "癒し"],
    prose_style: "恋愛心理小説",
    expression_style: "dialogue_heavy",
    response_length: "medium",
    pacing: "natural",
    image_style_preset: "visual_novel",
    voice_style_preset: "cheerful"
  },
  {
    key: "slow_burn_love",
    label: "スローバーン",
    description: "じっくり距離を縮める恋愛。積み重なる感情と意識し合う二人。",
    genre: "スローバーン恋愛",
    moods: ["ロマンス", "癒し"],
    prose_style: "恋愛心理小説",
    expression_style: "dialogue_heavy",
    response_length: "medium",
    pacing: "slow",
    image_style_preset: "visual_novel",
    voice_style_preset: "soft"
  },
  {
    key: "isekai_fantasy",
    label: "異世界転移",
    description: "異世界転移。冒険、ギルド、魔法、仲間、旅。王道ファンタジー。",
    genre: "異世界ファンタジー",
    moods: ["ファンタジー", "アクション"],
    prose_style: "王道ファンタジー",
    expression_style: "balanced",
    response_length: "long",
    pacing: "natural",
    image_style_preset: "fantasy",
    voice_style_preset: "energetic"
  },
  {
    key: "adventure_party",
    label: "冒険パーティ",
    description: "仲間との冒険。クエスト、戦闘、絆、選択。熱い友情と成長。",
    genre: "冒険",
    moods: ["アクション", "ファンタジー"],
    prose_style: "アクション",
    expression_style: "action_heavy",
    response_length: "medium",
    pacing: "fast",
    image_style_preset: "adventure",
    voice_style_preset: "energetic"
  },
  {
    key: "royal_fantasy",
    label: "王国・貴族",
    description: "王国、貴族、騎士、陰謀、ロマンス。格調高い政治劇と恋愛。",
    genre: "王国ファンタジー",
    moods: ["ファンタジー", "ロマンス", "シリアス"],
    prose_style: "格式高い宮廷小説",
    expression_style: "balanced",
    response_length: "long",
    pacing: "natural",
    image_style_preset: "fantasy",
    voice_style_preset: "noble"
  },
  {
    key: "academy_battle",
    label: "学園バトル",
    description: "学園バトル。能力、ライバル、成長、対決。熱血と友情の物語。",
    genre: "学園バトル",
    moods: ["アクション", "青春"],
    prose_style: "バトルライトノベル",
    expression_style: "action_heavy",
    response_length: "medium",
    pacing: "fast",
    image_style_preset: "anime",
    voice_style_preset: "intense"
  },
  {
    key: "dark_romance",
    label: "ダークロマンス",
    description: "重めの恋愛。秘密、依存、葛藤、複雑な感情の交差。",
    genre: "ダークロマンス",
    moods: ["ロマンス", "ダーク", "シリアス"],
    prose_style: "心理小説",
    expression_style: "dialogue_heavy",
    response_length: "medium",
    pacing: "slow",
    image_style_preset: "dark",
    voice_style_preset: "serious"
  },
  {
    key: "mystery",
    label: "ミステリー",
    description: "謎、手がかり、推理。ハードボイルドな緊張感。",
    genre: "ミステリー",
    moods: ["ミステリー", "シリアス"],
    prose_style: "ハードボイルド",
    expression_style: "balanced",
    response_length: "medium",
    pacing: "natural",
    image_style_preset: "dark",
    voice_style_preset: "serious"
  },
  {
    key: "horror",
    label: "ホラー",
    description: "心理ホラー。恐怖、不安、絶望。ダークな世界観。",
    genre: "ホラー",
    moods: ["ホラー", "ダーク"],
    prose_style: "心理ホラー",
    expression_style: "action_heavy",
    response_length: "medium",
    pacing: "slow",
    image_style_preset: "dark",
    voice_style_preset: "whisper"
  },
  {
    key: "youth",
    label: "青春・日常",
    description: "温かな青春日常。友情、部活、淡い恋心。",
    genre: "青春",
    moods: ["青春", "日常"],
    prose_style: "温かな青春物語",
    expression_style: "dialogue_heavy",
    response_length: "medium",
    pacing: "natural",
    image_style_preset: "visual_novel",
    voice_style_preset: "cheerful"
  }
];

export const MOOD_OPTIONS = [
  "ロマンス",
  "癒し",
  "シリアス",
  "ヤンデレ",
  "ファンタジー",
  "アクション",
  "ミステリー",
  "ホラー",
  "青春",
  "コメディ",
  "ダーク",
  "日常"
];

export const PROSE_STYLE_OPTIONS = [
  "設定しない",
  "恋愛心理小説",
  "ハードボイルド",
  "夜想文学",
  "温かな青春物語",
  "アクション",
  "王道ファンタジー",
  "ライトノベル",
  "心理ホラー",
  "静かな文学調",
  "会話劇"
];

export const CHARACTER_COLORS = ["#35d0a5", "#f5b84b", "#86a8ff", "#ff8fb3", "#c8f56a"];

export const RELATIONSHIP_LABELS = [
  { min: -999, label: "初対面" },
  { min: 4, label: "気になる相手" },
  { min: 9, label: "仲のいい相手" },
  { min: 15, label: "信頼している相手" },
  { min: 23, label: "特別な相手" }
];

export type ModelPresetKey = "balanced" | "quality_story" | "budget";

export type ModelPresetConfig = Partial<AppSettings>;

export const MODEL_PRESETS: Record<ModelPresetKey, { label: string; description: string; config: ModelPresetConfig }> = {
  balanced: {
    label: "バランス",
    description: "OpenAI GPT-4.1 系でコストと品質をバランスよく配分。",
    config: {
      normal_conversation_provider: "openai",
      normal_conversation_model: "gpt-4.1",
      smart_conversation_provider: "openai",
      smart_conversation_model: "gpt-4.1",
      director_provider: "openai",
      director_model: "gpt-4.1",
      smart_reply_provider: "openai",
      smart_reply_model: "gpt-4.1-mini",
      summary_provider: "openai",
      summary_model: "gpt-4.1-mini",
      image_prompt_provider: "openai",
      image_prompt_model: "gpt-4.1-mini",
      cheap_conversation_provider: "openai",
      cheap_conversation_model: "gpt-4.1-mini",
      model_preset: "balanced"
    }
  },
  quality_story: {
    label: "Quality Story",
    description: "通常会話は Claude Sonnet、重要シーンは Claude Opus で高品質。image_prompt は Gemini。",
    config: {
      normal_conversation_provider: "anthropic",
      normal_conversation_model: "claude-sonnet-4-6",
      smart_conversation_provider: "anthropic",
      smart_conversation_model: "claude-opus-4-7",
      director_provider: "openai",
      director_model: "gpt-4.1",
      smart_reply_provider: "openai",
      smart_reply_model: "gpt-4.1-mini",
      summary_provider: "openai",
      summary_model: "gpt-4.1-mini",
      image_prompt_provider: "google",
      image_prompt_model: "gemini-2.5-pro",
      cheap_conversation_provider: "openai",
      cheap_conversation_model: "gpt-4.1-mini",
      model_preset: "quality_story"
    }
  },
  budget: {
    label: "バジェット",
    description: "全役割を gpt-4.1-mini に統一してコストを最小化。",
    config: {
      normal_conversation_provider: "openai",
      normal_conversation_model: "gpt-4.1-mini",
      smart_conversation_provider: "openai",
      smart_conversation_model: "gpt-4.1",
      director_provider: "openai",
      director_model: "gpt-4.1-mini",
      smart_reply_provider: "openai",
      smart_reply_model: "gpt-4.1-mini",
      summary_provider: "openai",
      summary_model: "gpt-4.1-mini",
      image_prompt_provider: "openai",
      image_prompt_model: "gpt-4.1-mini",
      cheap_conversation_provider: "openai",
      cheap_conversation_model: "gpt-4.1-mini",
      model_preset: "budget"
    }
  }
};
