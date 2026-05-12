export type ID = string;

export type Visibility = "private" | "unlisted";
export type MessageType = "narration" | "character" | "user" | "system" | "event" | "image" | "choice";
export type SpeakerType = "user" | "character" | "narrator" | "system";

// Scene visual system types
export type VisualMode = "off" | "manual" | "scene_bundle" | "major_events_only";
export type BackgroundTransition = "fade" | "instant";
export type VisualUpdateType = "none" | "base_scene" | "expression_variant" | "event_cg";
export type ExpressionType = "neutral" | "annoyed" | "smile" | "blush" | "serious" | "surprised" | "worried" | "embarrassed";
export type VariantType = "base" | "expression" | "event_cg";

export type VisualCue = {
  shouldUpdateVisual: boolean;
  updateType: VisualUpdateType;
  reason: string | null;
  sceneKey: string | null;
  location: string | null;
  timeOfDay: string | null;
  weather: string | null;
  activeCharacters: string[];
  targetCharacter: string | null;
  expression: ExpressionType | null;
  pose: string | null;
  cameraDistance: "close" | "medium" | "wide";
  pov: "first_person" | "third_person";
  priority: "low" | "medium" | "high";
  qualityPreset: ImageQualityPreset;
  eventCg: boolean;
  promptSummary: string | null;
};

export type SessionSceneVisualState = {
  id: ID;
  session_id: ID;
  current_background_image_id: ID | null;
  location: string;
  time_of_day: string;
  weather: string;
  active_characters_json: string[];
  character_outfits_json: Record<string, string>;
  character_emotions_json: Record<string, string>;
  scene_mood: string;
  camera_distance: string;
  pov_type: string;
  last_prompt_summary: string;
  scene_key: string;
  updated_at: string;
};

export type SceneVisualBundle = {
  id: ID;
  session_id: ID;
  scenario_id: ID;
  scene_key: string;
  location: string;
  time_of_day: string;
  weather: string;
  active_character_ids: ID[];
  base_image_id: ID | null;
  continuity_group_id: string;
  style_preset: string | null;
  created_at: string;
  updated_at: string;
};

export type SceneVisualVariant = {
  id: ID;
  bundle_id: ID;
  image_id: ID | null;
  variant_type: VariantType;
  expression: ExpressionType | null;
  pose: string | null;
  emotion_tone: string | null;
  quality_preset: ImageQualityPreset;
  generation_status: "pending" | "generating" | "completed" | "failed";
  created_at: string;
};

export type ContinueSuggestion = {
  available: boolean;
  label: string;
  reason: string | null;
};

export type ChoiceType =
  | "talk"
  | "action"
  | "observe"
  | "silence"
  | "approach"
  | "leave"
  | "question"
  | "avoid"
  | "honest"
  | "flirt"
  | "intimate";
export type MemoryType =
  | "user_memory"
  | "character_memory"
  | "relationship_memory"
  | "story_memory"
  | "promise"
  | "preference"
  | "sensitive"
  | "explicit";
export type Sensitivity = "normal" | "sensitive" | "explicit";
export type ImageTriggerType = "manual" | "major_event" | "chapter_start" | "special_branch";
export type ImageJobStatus = "queued" | "generating" | "completed" | "failed";
export type VoiceJobStatus = "queued" | "generating" | "completed" | "failed";
export type PlayPaceMode = "auto" | "normal" | "choice_heavy";
export type ChoiceFrequency = "normal" | "high";
export type ExperienceMode = "girlfriend" | "story";

export type ChoiceIntent = "honest" | "tease" | "comfort" | "flirt" | "affection" | "observe" | "silent" | "dominant" | "submissive" | "avoid" | "action" | "question" | "meta" | "intimate";
export type ChoiceTone = "casual" | "sweet" | "romantic" | "serious" | "playful" | "dark" | "intimate" | "comedy" | "calm" | "tense";
export type ChoiceAgency = "active" | "passive" | "vulnerable" | "assertive" | "reserved" | "supportive" | "teasing" | "protective";
export type ChoiceProgression = "story_forward" | "relationship" | "world_lore" | "character_focus" | "event_trigger" | "slow_burn" | "conflict" | "recovery";
export type ChoiceStyle = "keyword" | "sentence" | "short" | "natural" | "detailed" | "action_only" | "line_only" | "mixed";
export type PreferenceStrength = "low" | "normal" | "high";

export type VrmExpression =
  | "neutral" | "smile" | "blush" | "embarrassed"
  | "annoyed" | "angry" | "sad" | "worried"
  | "surprised" | "serious";

export type VrmMotion =
  | "idle" | "idle_breathing" | "nod" | "shake_head"
  | "look_away" | "look_at_user" | "cross_arms"
  | "hand_on_chest" | "small_wave" | "shy_shift" | "surprised_step";

export type CharacterControl = {
  targetCharacter: string;
  expression: VrmExpression;
  motion: VrmMotion;
  gaze: "look_at_user" | "look_away" | "look_down" | "look_side";
  cameraDistance: "close" | "medium" | "wide";
  position: "left" | "center" | "right";
  intensity: number;
};
export type TimelineRevealSpeed = "slow" | "normal" | "fast" | "instant";
export type TimelineItemType = "narration" | "character" | "system" | "event";
export type ForeshadowingStatus = "planned" | "introduced" | "developing" | "ready" | "revealed" | "discarded";
export type ForeshadowingVisibility = "hidden_to_user" | "visible_hint" | "debug_only";
export type RevealReadiness = "not_ready" | "warming_up" | "ready" | "overdue";
export type ForeshadowingAction = "create" | "introduce" | "reinforce" | "mark_ready" | "reveal" | "discard";
export type SceneObjectiveProgress = "low" | "medium" | "high";
export type StallRisk = "low" | "medium" | "high";

export type RelationshipValues = {
  trust: number;
  affection: number;
  comfort: number;
  curiosity: number;
  tension: number;
};

export type TimelineItem = {
  type: TimelineItemType;
  characterName: string | null;
  content: string;
};

export type Scenario = {
  id: ID;
  user_id: ID;
  title: string;
  description: string;
  world_setting: string;
  situation: string;
  relationship_setup: string;
  objective: string;
  forbidden_content: string;
  visibility: Visibility;
  tags: string[];
  genre: string;
  content_warnings: string;
  estimated_play_time: string;
  recommended_tone: string;
  progress_percent: number;
  last_played_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ScenarioCharacter = {
  id: ID;
  scenario_id: ID;
  name: string;
  avatar_url?: string | null;
  avatar_storage_path?: string | null;
  display_color: string;
  appearance: string;
  personality: string;
  speaking_style: string;
  first_person: string;
  user_call_name: string;
  role: string;
  background: string;
  likes: string;
  dislikes: string;
  secrets: string;
  sample_dialogues: string;
  sort_order: number;
  voice_enabled?: boolean | null;
  voice_provider?: string | null;
  voice_id?: string | null;
  voice_model?: string | null;
  voice_style?: string | null;
  voice_speed?: number | null;
  voice_pitch?: number | null;
  voice_emotion?: string | null;
  auto_play_voice?: boolean | null;
  // 3D model settings
  model_type?: "none" | "vrm" | "glb" | null;
  model_storage_path?: string | null;
  model_url?: string | null;
  default_expression?: VrmExpression | null;
  default_motion?: VrmMotion | null;
  expression_map_json?: Record<string, string> | null;
  motion_map_json?: Record<string, string> | null;
  vrm_scale?: number | null;
  vrm_position_json?: { x: number; y: number; z: number } | null;
  look_at_user_enabled?: boolean | null;
  blink_enabled?: boolean | null;
  idle_motion_enabled?: boolean | null;
  license_note?: string | null;
  app_use_allowed?: boolean | null;
  modification_allowed?: boolean | null;
  nsfw_allowed?: boolean | null;
  redistribution_allowed?: boolean | null;
  created_at: string;
  updated_at: string;
};

export type UserProfile = {
  id: ID;
  user_id: ID;
  scenario_id: ID;
  display_name: string;
  avatar_url?: string | null;
  avatar_storage_path?: string | null;
  first_person: string;
  speaking_style: string;
  personality: string;
  role: string;
  background: string;
  relationship_to_characters: string;
  roleplay_policy: string;
  created_at: string;
  updated_at: string;
};

export type LorebookEntryType =
  | "world" | "place" | "organization" | "character_secret"
  | "item" | "history" | "rule" | "foreshadowing" | "relationship" | "other";

export type LorebookEntry = {
  id: ID;
  scenario_id: ID;
  lorebook_id?: ID | null;
  title: string;
  content: string;
  keywords: string[];
  importance: number;
  always_include: boolean;
  related_character_ids: ID[];
  is_hidden?: boolean;
  hidden_truth?: string;
  entry_type?: LorebookEntryType;
  created_at: string;
  updated_at: string;
};

export type Lorebook = {
  id: ID;
  user_id: ID;
  title: string;
  short_description: string | null;
  cover_image_url: string | null;
  visibility: "private" | "public";
  entries: LorebookEntry[];
  created_at: string;
  updated_at: string;
};

export type PlotLorebookLink = {
  id: ID;
  plot_id: ID;
  lorebook_id: ID;
  enabled: boolean;
  priority: number;
  created_at: string;
};

export type ModeOptimization = "none" | "girlfriend" | "story";

export type StyleSettings = {
  id: ID;
  scenario_id: ID;
  narration_perspective: "first_person" | "second_person" | "third_person";
  tense: "past" | "present";
  response_length: "short" | "medium" | "long" | "auto";
  expression_style: "dialogue_heavy" | "balanced" | "action_heavy";
  moods: string[];
  prose_style: string;
  provide_choices: boolean;
  show_background_info: boolean;
  show_character_info: boolean;
  allow_free_input: boolean;
  allow_ai_scene_progress: boolean;
  allow_continue_button: boolean;
  mode_optimization: ModeOptimization;
  play_pace_mode: PlayPaceMode;
  auto_advance_message_count: number;
  choice_frequency: ChoiceFrequency;
  difficulty: "easy" | "normal" | "hard" | "extreme";
  pacing: "fast" | "natural" | "slow";
  created_at: string;
  updated_at: string;
};

export type IntroSettings = {
  id: ID;
  scenario_id: ID;
  start_text: string;
  start_location: string;
  start_situation: string;
  appearing_character_ids: ID[];
  user_profile_id: ID;
  initial_narration: string;
  initial_character_messages: Array<{
    characterId: ID;
    characterName: string;
    content: string;
  }>;
  initial_choices: SuggestedReply[];
  created_at: string;
  updated_at: string;
};

export type SuggestedReply = {
  id: ID;
  label: string;
  type: ChoiceType;
  effect: RelationshipValues & { flag?: string };
  intent?: ChoiceIntent | null;
  tone?: ChoiceTone | null;
  agency?: ChoiceAgency | null;
  choiceStyle?: ChoiceStyle | null;
  progression?: ChoiceProgression | null;
  romanceLevel?: number | null;
  intimacyLevel?: number | null;
  riskLevel?: string | null;
  why?: string | null;
};

/** Smart Reply（自然文候補）— ユーザー入力欄に挿入するための短文＋メタデータ */
export type SmartReply = {
  id: ID;
  label: string;
  intent?: ChoiceIntent | null;
  tone?: ChoiceTone | null;
  agency?: ChoiceAgency | null;
};

/** シナリオスコープの preference（global の fallback あり） */
export type ScopedChoicePreferences = {
  global: UserChoicePreferences | null;
  /** key = scenarioId */
  byScenario: Record<string, UserChoicePreferences>;
};

export type ChoiceEventRecord = {
  id: ID;
  sessionId: ID;
  scenarioId: ID;
  characterId: ID | null;
  choiceLabel: string;
  choiceType: ChoiceType;
  intent: ChoiceIntent | null;
  tone: ChoiceTone | null;
  agency: ChoiceAgency | null;
  choiceStyle: ChoiceStyle | null;
  progression: ChoiceProgression | null;
  romanceLevel: number;
  intimacyLevel: number;
  riskLevel: string;
  createdAt: string;
};

export type UserChoicePreferences = {
  preferredIntents: Record<string, number>;
  preferredTones: Record<string, number>;
  preferredAgency: Record<string, number>;
  preferredChoiceStyles: Record<string, number>;
  preferredProgression: Record<string, number>;
  romancePreferenceScore: number;
  intimacyPreferenceScore: number;
  storyProgressPreferenceScore: number;
  slowBurnPreferenceScore: number;
  sampleCount: number;
  updatedAt: string;
};

export type StoryScene = {
  id: ID;
  scenario_id: ID;
  scene_key: string;
  title: string;
  objective: string;
  conflict: string;
  hook: string;
  target_turns: number;
  max_turns: number;
  beats: string[];
  next_scene_key?: string | null;
  created_at: string;
  updated_at: string;
};

export type PlaySession = {
  id: ID;
  user_id: ID;
  scenario_id: ID;
  user_profile_id: ID;
  current_scene_key: string;
  chapter_index: number;
  progress_percent: number;
  status: "active" | "paused" | "completed" | "archived";
  last_summary: string;
  nsfw_chat_enabled: boolean;
  nsfw_image_enabled: boolean;
  play_pace_mode: PlayPaceMode;
  auto_continue_count: number;
  needs_user_input: boolean;
  auto_continue_allowed: boolean;
  pending_choices: SuggestedReply[];
  story_flags: Record<string, unknown>;
  scene_objective: string;
  current_beat_index: number;
  scene_turn_count: number;
  stall_count: number;
  last_conflict: string;
  last_hook: string;
  objective_completed: boolean;
  last_director_reason?: string | null;
  last_quality_score?: number | null;
  quality_stall_count: number;
  last_quality_problem?: string | null;
  last_improvement_hint?: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: ID;
  session_id: ID;
  role: "user" | "assistant" | "system";
  message_type: MessageType;
  speaker_type: SpeakerType;
  speaker_id?: ID | null;
  speaker_name?: string | null;
  speaker_avatar_url?: string | null;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type Memory = {
  id: ID;
  user_id: ID;
  scenario_id: ID;
  character_id?: ID | null;
  session_id?: ID | null;
  type: MemoryType;
  content: string;
  importance: number;
  sensitivity: Sensitivity;
  include_in_prompt: boolean;
  source_message_id?: ID | null;
  created_at: string;
  updated_at: string;
};

export type MemoryCandidate = {
  id: ID;
  user_id: ID;
  scenario_id: ID;
  character_id?: ID | null;
  session_id?: ID | null;
  source_message_id?: ID | null;
  type: MemoryType;
  content: string;
  importance: number;
  sensitivity: Sensitivity;
  reason: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
};

export type ForeshadowingItem = {
  id: ID;
  scenario_id: ID;
  session_id?: ID | null;
  title: string;
  clue_text: string;
  hidden_truth?: string | null;
  related_character_id?: ID | null;
  related_lore_entry_id?: ID | null;
  introduced_at_message_id?: ID | null;
  introduced_scene_key?: string | null;
  planned_reveal_scene_key?: string | null;
  reveal_condition_json: Record<string, unknown>;
  importance: number;
  status: ForeshadowingStatus;
  visibility: ForeshadowingVisibility;
  last_reinforced_at?: string | null;
  revealed_at?: string | null;
  reveal_readiness: RevealReadiness;
  reinforcement_count: number;
  turns_since_introduced: number;
  overdue_score: number;
  created_at: string;
  updated_at: string;
};

export type DirectorUpdate = {
  currentBeatIndex: number;
  objectiveCompleted: boolean;
  stallRisk: StallRisk;
  shouldAdvanceScene: boolean;
  shouldIntroduceEvent: boolean;
  introducedHook: string | null;
  reason: string;
};

export type ForeshadowingUpdate = {
  action: ForeshadowingAction;
  foreshadowingId: ID | null;
  title: string;
  clueText: string;
  hiddenTruth: string | null;
  importance: number;
  relatedCharacterName: string | null;
  plannedRevealSceneKey: string | null;
  revealCondition: Record<string, unknown>;
  revealedText: string | null;
  reason: string;
};

export type QualityCheck = {
  isRepetitive: boolean;
  hasNewInformation: boolean;
  hasCharacterAction: boolean;
  hasEmotionalChange: boolean;
  hasRelationshipChange: boolean;
  hasSceneChange: boolean;
  hasForeshadowing: boolean;
  hasChoicePressure: boolean;
  hasForwardMotion: boolean;
  isStalling: boolean;
  sceneObjectiveProgress: SceneObjectiveProgress;
  qualityScore: number;
  problem: string | null;
  improvementHint: string | null;
};

export type NarrativeQualityLog = {
  id: ID;
  session_id: ID;
  message_id?: ID | null;
  quality_score: number;
  is_repetitive: boolean;
  is_stalling: boolean;
  has_new_information: boolean;
  has_character_action: boolean;
  has_emotional_change: boolean;
  has_relationship_change: boolean;
  has_scene_change: boolean;
  has_foreshadowing: boolean;
  has_choice_pressure: boolean;
  has_forward_motion: boolean;
  scene_objective_progress: SceneObjectiveProgress;
  problem?: string | null;
  improvement_hint?: string | null;
  created_at: string;
};

export type StorySummary = {
  id: ID;
  user_id: ID;
  scenario_id: ID;
  session_id: ID;
  chapter_index: number;
  start_turn_index: number;
  end_turn_index: number;
  summary: string;
  created_at: string;
  updated_at: string;
};

export type RelationshipState = RelationshipValues & {
  id: ID;
  user_id: ID;
  scenario_id: ID;
  character_id: ID;
  relationship_label: string;
  updated_at: string;
};

export type SessionEnvironmentState = {
  id: ID;
  user_id: ID;
  scenario_id: ID;
  session_id: ID;
  date: string;
  time: string;
  location: string;
  weather: string;
  scene: string;
  current_objective: string;
  recent_event: string;
  next_pressure: string;
  chapter: string;
  scene_key: string;
  created_at: string;
  updated_at: string;
};

export type SessionCharacterState = {
  id: ID;
  user_id: ID;
  scenario_id: ID;
  session_id: ID;
  character_id: ID;
  mood: string;
  condition: string;
  outfit: string;
  pose: string;
  goal: string;
  relationship: string;
  inner_thoughts: string;
  inventory: string;
  hidden_intent: string;
  last_action: string;
  created_at: string;
  updated_at: string;
};

export type GeneratedImage = {
  id: ID;
  user_id: ID;
  session_id: ID;
  scenario_id: ID;
  job_id?: ID | null;
  storage_path?: string | null;
  public_url?: string | null;
  thumbnail_url?: string | null;
  is_nsfw: boolean;
  blur_by_default: boolean;
  prompt_summary: string;
  // Scene visual system extensions
  image_kind?: "regular" | "background" | "expression_variant" | "event_cg" | "manual_scene";
  scene_key?: string | null;
  bundle_id?: ID | null;
  variant_type?: VariantType | null;
  expression?: ExpressionType | null;
  continuity_group_id?: string | null;
  quality_preset?: ImageQualityPreset | null;
  style_preset?: ImageStylePreset | null;
  cost_estimated_jpy?: number | null;
  latency_ms?: number | null;
  created_at: string;
};

export type ImageQualityPreset = "draft" | "standard" | "high" | "ultra";
export type ImageStylePreset = "anime" | "visual_novel" | "romance" | "fantasy" | "adventure" | "dark" | "nsfw_anime";

export type ImageGenerationJob = {
  id: ID;
  user_id: ID;
  session_id: ID;
  scenario_id: ID;
  prompt: string;
  negative_prompt?: string | null;
  backend: string;
  nsfw_enabled: boolean;
  trigger_type: ImageTriggerType;
  status: ImageJobStatus;
  quality_preset?: ImageQualityPreset | null;
  style_preset?: ImageStylePreset | null;
  width?: number | null;
  height?: number | null;
  steps?: number | null;
  cfg_scale?: number | null;
  sampler?: string | null;
  model_name?: string | null;
  lora_json?: Record<string, unknown> | null;
  upscale_enabled?: boolean | null;
  seed?: number | null;
  latency_ms?: number | null;
  estimated_cost_jpy: number;
  // Scene visual system extensions
  image_kind?: "regular" | "background" | "expression_variant" | "event_cg" | "manual_scene";
  scene_key?: string | null;
  background_cue_json?: Record<string, unknown> | null;
  reference_image_ids_json?: string[] | null;
  prompt_summary?: string | null;
  continuity_group_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type UsageLog = {
  id: ID;
  user_id: ID;
  kind: "conversation" | "image" | "voice" | "smart_reply" | "summary";
  backend: string;
  provider?: string | null;
  model?: string | null;
  model_role?: string | null;
  input_tokens: number;
  output_tokens: number;
  latency_ms?: number | null;
  image_count: number;
  estimated_cost_jpy: number;
  prompt_chars?: number | null;
  output_chars?: string | null;
  quality_preset?: string | null;
  reason_for_model_selection?: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type ScenarioCharacterVoiceSettings = {
  voice_enabled: boolean;
  voice_provider?: string;
  voice_model?: string;
  voice_id?: string;
  voice_style?: string;
  voice_speed?: number;
  voice_pitch?: number;
  voice_emotion?: string;
  auto_play_voice?: boolean;
};

export type VoiceGenerationJob = {
  id: ID;
  user_id: ID;
  session_id: ID;
  message_id: ID;
  character_id?: ID | null;
  text: string;
  voice_provider: string;
  voice_id?: string | null;
  voice_model?: string | null;
  status: VoiceJobStatus;
  audio_data_uri: string | null;
  duration_ms: number | null;
  estimated_cost_jpy: number;
  latency_ms?: number | null;
  storage_path?: string | null;
  public_url?: string | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
};

export type AppSettings = {
  adult_confirmed: boolean;
  nsfw_chat_enabled: boolean;
  nsfw_image_enabled: boolean;
  blur_nsfw_images: boolean;
  hide_sensitive_memories: boolean;
  show_nsfw_in_history: boolean;
  startup_age_gate: boolean;
  monthly_budget_jpy: number;
  conversation_budget_jpy: number;
  image_budget_jpy: number;
  low_cost_mode: boolean;
  choice_send_behavior: "send_immediately" | "insert_into_composer";
  normal_conversation_backend: string;
  nsfw_conversation_backend: string;
  normal_conversation_provider: string;
  normal_conversation_model: string;
  nsfw_conversation_provider: string;
  nsfw_conversation_model: string;
  cheap_conversation_provider: string;
  cheap_conversation_model: string;
  smart_conversation_provider: string;
  smart_conversation_model: string;
  standard_image_backend: string;
  nsfw_image_backend: string;
  standard_image_provider: string;
  standard_image_model: string;
  nsfw_image_provider: string;
  nsfw_image_model: string;
  image_generation_enabled: boolean;
  suggest_images_on_major_events: boolean;
  allow_manual_image_generation: boolean;
  image_quality: "draft" | "standard" | "high";
  image_size: "square" | "portrait" | "landscape";
  smart_model_for_major_event: boolean;
  auto_switch_when_budget_low: boolean;
  story_director_debug_enabled: boolean;
  timeline_reveal_enabled: boolean;
  timeline_reveal_speed: TimelineRevealSpeed;
  daily_image_limit: number;
  monthly_image_limit: number;
  voice_enabled: boolean;
  voice_provider: string;
  voice_auto_play: boolean;
  voice_budget_jpy: number;
  voice_narration_enabled: boolean;
  director_provider: string;
  director_model: string;
  smart_reply_provider: string;
  smart_reply_model: string;
  summary_provider: string;
  summary_model: string;
  image_prompt_provider: string;
  image_prompt_model: string;
  model_preset: string;
  // Scene visual system settings
  visual_mode: VisualMode;
  background_transition: BackgroundTransition;
  base_image_quality: ImageQualityPreset;
  expression_variant_quality: ImageQualityPreset;
  event_cg_quality: ImageQualityPreset;
  expression_pregen_enabled: boolean;
  image_monthly_budget_jpy: number;
  base_image_budget_jpy: number;
  expression_variant_budget_jpy: number;
  event_cg_budget_jpy: number;
  // Choice preference learning
  choice_learning_enabled: boolean;
  show_choice_effect_hints: boolean;
  preference_strength: PreferenceStrength;
  // Experience mode + VRM settings
  experience_mode: ExperienceMode;
  vrm_enabled: boolean;
  vrm_quality: "high" | "low";
  vrm_fps_limit: number;
  vrm_shadow_enabled: boolean;
  vrm_physics_enabled: boolean;
};

export type ForbiddenContentRule = {
  key: string;
  label: string;
  description: string;
  applies_to: Array<"conversation" | "image">;
  enabled: boolean;
};

export type StoryBundle = {
  scenario: Scenario;
  characters: ScenarioCharacter[];
  userProfiles: UserProfile[];
  lorebook: LorebookEntry[];
  lorebookLinks: PlotLorebookLink[];
  style: StyleSettings;
  intro: IntroSettings;
  storyScenes: StoryScene[];
  foreshadowingItems: ForeshadowingItem[];
};

export type AppState = {
  userId: ID;
  scenarios: Scenario[];
  characters: ScenarioCharacter[];
  userProfiles: UserProfile[];
  lorebook: LorebookEntry[];
  lorebooks: Lorebook[];
  lorebookLinks: PlotLorebookLink[];
  styles: StyleSettings[];
  intros: IntroSettings[];
  sessions: PlaySession[];
  messages: Message[];
  memories: Memory[];
  memoryCandidates: MemoryCandidate[];
  foreshadowingItems: ForeshadowingItem[];
  storyScenes: StoryScene[];
  storySummaries: StorySummary[];
  narrativeQualityLogs: NarrativeQualityLog[];
  relationships: RelationshipState[];
  sessionEnvironmentStates: SessionEnvironmentState[];
  sessionCharacterStates: SessionCharacterState[];
  imageJobs: ImageGenerationJob[];
  images: GeneratedImage[];
  voiceJobs: VoiceGenerationJob[];
  usageLogs: UsageLog[];
  settings: AppSettings;
  choiceEvents: ChoiceEventRecord[];
  choicePreferences: UserChoicePreferences | null;
  scenarioChoicePreferences: Record<string, UserChoicePreferences>;
  // Scene visual system
  sceneVisualBundles: SceneVisualBundle[];
  sceneVisualVariants: SceneVisualVariant[];
  sessionSceneVisualStates: SessionSceneVisualState[];
};
