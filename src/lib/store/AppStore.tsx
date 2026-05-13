"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_RELATIONSHIP, DEFAULT_SETTINGS, RELATIONSHIP_LABELS } from "@/lib/domain/constants";
import { createBlankScenarioState, createSampleState } from "@/lib/domain/sampleData";
import type {
  AppSettings,
  AppState,
  CharacterControl,
  ChoiceEventRecord,
  ContinueSuggestion,
  ExpressionType,
  ForeshadowingItem,
  ForeshadowingStatus,
  GeneratedImage,
  ID,
  ImageGenerationJob,
  ImageQualityPreset,
  ImageStylePreset,
  ImageTriggerType,
  Memory,
  MemoryCandidate,
  Message,
  NarrativeQualityLog,
  PlayPaceMode,
  PlaySession,
  QualityCheck,
  RelationshipState,
  RelationshipValues,
  SceneVisualBundle,
  SceneVisualVariant,
  SessionCharacterState,
  SessionEnvironmentState,
  SessionSceneVisualState,
  StyleSettings,
  StorySummary,
  StoryScene,
  StoryBundle,
  SuggestedReply,
  TimelineItem,
  UsageLog,
  UserChoicePreferences,
  VariantType,
  VisualCue,
  VoiceGenerationJob
} from "@/lib/domain/types";
import { extractVoiceText } from "@/lib/ai/voice/voiceText";
import { clamp, estimateTokenLikeCount, newId, nowIso } from "@/lib/utils";
import type { ConversationResponse } from "@/lib/ai/types";
import type { BackgroundJobsResponse } from "@/lib/ai/types";
import { uploadGeneratedImageFromUrl, uploadVoiceAudio } from "@/lib/supabase/storage";
import {
  getAuthenticatedUser,
  isSupabaseConfigured,
  loadAppStateFromSupabase,
  saveAppStateToSupabase,
  saveGeneratedAudio,
  seedRemoteWithSample,
  signInAnonymously,
  signInWithEmailOtp,
  signOutSupabase,
  type SupabaseRemoteState
} from "@/lib/supabase/repository";

const STORAGE_KEY = "story-roleplay-pwa-state-v1";

type TurnControl = {
  skipRequested: boolean;
  abortController: AbortController | null;
  resolveDelay: (() => void) | null;
};

type TypewriterRevealOptions = {
  intervalMs: number;
  chunkSize: number;
};

type TypewriterRevealResult = {
  skipped: boolean;
  totalRevealTimeMs: number;
};

type AppStoreValue = {
  state: AppState;
  hydrated: boolean;
  remote: SupabaseRemoteState;
  remoteSaving: boolean;
  updateSettings: (settings: Partial<AppSettings>) => void;
  signInRemoteAnonymously: () => Promise<void>;
  signInRemoteWithEmail: (email: string) => Promise<void>;
  signOutRemote: () => Promise<void>;
  syncRemoteNow: () => Promise<void>;
  createScenario: () => string;
  saveBundle: (bundle: StoryBundle) => void;
  getBundle: (scenarioId: ID) => StoryBundle | null;
  startOrResumeScenario: (scenarioId: ID) => string;
  toggleScenarioBookmark: (scenarioId: ID) => void;
  sendTurn: (sessionId: ID, text: string, choice?: SuggestedReply) => Promise<void>;
  sendSilentContinue: (sessionId: ID) => Promise<void>;
  continueAutoTurn: (sessionId: ID, options?: { allowNonAuto?: boolean }) => Promise<void>;
  skipCurrentTurn: () => void;
  setSessionPlayPaceMode: (sessionId: ID, mode: PlayPaceMode) => void;
  generateImage: (sessionId: ID, prompt: string, triggerType: ImageTriggerType, isNsfwRequested: boolean) => Promise<void>;
  generateSceneBackground: (sessionId: ID, cue: VisualCue, existingBundleId?: ID | null) => Promise<void>;
  generateVoice: (sessionId: ID, messageId: ID, characterId: ID | null, content: string) => Promise<void>;
  currentSmartReplies: import("@/lib/domain/types").SmartReply[];
  currentContinueSuggestion: ContinueSuggestion | null;
  currentCharacterControl: CharacterControl | null;
  getSessionBackground: (sessionId: ID) => string | null;
  isSceneGenerating: (sessionId: ID) => boolean;
  approveMemoryCandidate: (candidateId: ID) => void;
  rejectMemoryCandidate: (candidateId: ID) => void;
  updateMemory: (memoryId: ID, patch: Partial<Memory>) => void;
  deleteMemory: (memoryId: ID) => void;
  resetLocalState: () => void;
  resetChoicePreferences: () => void;
  // Lorebook methods
  listLorebooks: () => import("@/lib/domain/types").Lorebook[];
  createLorebook: () => string;
  saveLorebook: (lorebook: import("@/lib/domain/types").Lorebook) => void;
  deleteLorebook: (id: ID) => void;
  addLorebookLink: (plotId: ID, lorebookId: ID) => void;
  removeLorebookLink: (linkId: ID) => void;
  toggleLorebookLink: (linkId: ID, enabled: boolean) => void;
};

const AppStoreContext = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(() => createSampleState());
  const [hydrated, setHydrated] = useState(false);
  const [remote, setRemote] = useState<SupabaseRemoteState>({
    configured: isSupabaseConfigured,
    user: null,
    loading: isSupabaseConfigured,
    error: null
  });
  const [remoteSaving, setRemoteSaving] = useState(false);
  const [currentSmartReplies, setCurrentSmartReplies] = useState<import("@/lib/domain/types").SmartReply[]>([]);
  const [currentContinueSuggestion, setCurrentContinueSuggestion] = useState<ContinueSuggestion | null>(null);
  const [currentCharacterControl, setCurrentCharacterControl] = useState<CharacterControl | null>(null);
  const [sceneGeneratingIds, setSceneGeneratingIds] = useState<Set<ID>>(new Set());
  const remoteSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRemoteSnapshot = useRef("");
  const activeTurnControl = useRef<TurnControl | null>(null);
  const resolveVisualCueRef = useRef<((sessionId: ID, cue: VisualCue, bundle: StoryBundle) => Promise<void>) | null>(null);
  const sceneGeneratingIdsRef = useRef<Set<ID>>(new Set());

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setState(normalizeState(JSON.parse(stored) as AppState));
      } catch {
        setState(createSampleState());
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated || !isSupabaseConfigured) {
      setRemote((current) => ({ ...current, loading: false }));
      return;
    }

    let cancelled = false;

    async function bootRemote() {
      setRemote((current) => ({ ...current, loading: true, error: null }));
      try {
        const user = await getAuthenticatedUser();
        if (!user) {
          if (!cancelled) setRemote({ configured: true, user: null, loading: false, error: null });
          return;
        }

        const nextState = (await loadAppStateFromSupabase(user)) ?? (await seedRemoteWithSample(user));
        if (cancelled) return;
        const normalized = mergeLocalOnlyState(normalizeState(nextState));
        lastRemoteSnapshot.current = JSON.stringify(normalized);
        setState(normalized);
        setRemote({ configured: true, user, loading: false, error: null });
      } catch (error) {
        if (!cancelled) {
          setRemote({
            configured: true,
            user: null,
            loading: false,
            error: error instanceof Error ? error.message : "Supabase の読み込みに失敗しました。"
          });
        }
      }
    }

    void bootRemote();

    return () => {
      cancelled = true;
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || !remote.user || remote.loading) return;
    const snapshot = JSON.stringify(state);
    if (snapshot === lastRemoteSnapshot.current) return;

    if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    remoteSaveTimer.current = setTimeout(() => {
      setRemoteSaving(true);
      saveAppStateToSupabase(state, remote.user!)
        .then(() => {
          lastRemoteSnapshot.current = snapshot;
          setRemote((current) => ({ ...current, error: null }));
        })
        .catch((error) => {
          setRemote((current) => ({
            ...current,
            error: error instanceof Error ? error.message : "Supabase への保存に失敗しました。"
          }));
        })
        .finally(() => setRemoteSaving(false));
    }, 900);

    return () => {
      if (remoteSaveTimer.current) clearTimeout(remoteSaveTimer.current);
    };
  }, [hydrated, remote.loading, remote.user, state]);

  const getBundle = useCallback(
    (scenarioId: ID): StoryBundle | null => {
      const scenario = state.scenarios.find((item) => item.id === scenarioId);
      const style = state.styles.find((item) => item.scenario_id === scenarioId);
      const intro = state.intros.find((item) => item.scenario_id === scenarioId);
      if (!scenario || !style || !intro) return null;
      return {
        scenario,
        characters: state.characters.filter((item) => item.scenario_id === scenarioId).sort((a, b) => a.sort_order - b.sort_order),
        userProfiles: state.userProfiles.filter((item) => item.scenario_id === scenarioId),
        lorebook: state.lorebook.filter((item) => item.scenario_id === scenarioId),
        lorebookLinks: (state.lorebookLinks ?? []).filter((item) => item.plot_id === scenarioId),
        style,
        intro,
        storyScenes: state.storyScenes.filter((item) => item.scenario_id === scenarioId),
        foreshadowingItems: state.foreshadowingItems.filter((item) => item.scenario_id === scenarioId && !item.session_id)
      };
    },
    [state]
  );

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    setState((current) => ({ ...current, settings: { ...current.settings, ...settings } }));
  }, []);

  const skipCurrentTurn = useCallback(() => {
    const control = activeTurnControl.current;
    if (!control) return;
    control.skipRequested = true;
    control.resolveDelay?.();
  }, []);

  const runQualityCheck = useCallback(
    async (
      sessionId: ID,
      sessionForTurn: PlaySession,
      bundle: StoryBundle,
      messagesForQuality: Message[],
      messageId: ID | null,
      settings: AppSettings,
      userId: ID,
      foreshadowingItems?: ForeshadowingItem[]
    ) => {
      if (!shouldSampleQuality(sessionForTurn)) return;
      try {
        const startedAt = performance.now();
        const response = await fetch("/api/quality", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session: sessionForTurn,
            messages: messagesForQuality,
            settings,
            scenarioTitle: bundle.scenario.title,
            sceneObjective: sessionForTurn.scene_objective || bundle.scenario.objective,
            foreshadowingItems: foreshadowingItems ?? []
          })
        });
        const latencyMs = Math.round(performance.now() - startedAt);
        if (!response.ok) throw new Error("品質チェックに失敗しました。");
        const result = (await response.json()) as {
          qualityCheck: QualityCheck;
          usage?: {
            backend: string;
            provider: string;
            model: string;
            input_tokens: number;
            output_tokens: number;
            estimated_cost_jpy: number;
            error?: string;
          };
        };
        setState((current) => {
          const log = qualityLogFromQualityCheck(sessionId, result.qualityCheck, messageId);
          const usageLog = result.usage ? usageFromQualityCheck(userId, { ...result.usage, latency_ms: latencyMs }, result.qualityCheck) : null;
          return {
            ...current,
            narrativeQualityLogs: [...current.narrativeQualityLogs, log],
            usageLogs: usageLog ? [...current.usageLogs, usageLog] : current.usageLogs,
            sessions: current.sessions.map((session) =>
              session.id === sessionId ? { ...session, ...applyQualitySessionUpdate(session, result.qualityCheck), updated_at: nowIso() } : session
            )
          };
        });
      } catch (error) {
        console.warn("[Narrative Quality] Background check skipped", error);
      }
    },
    []
  );

  const runBackgroundJobs = useCallback(
    async (
      sessionId: ID,
      sessionForTurn: PlaySession,
      bundle: StoryBundle,
      messagesForContext: Message[],
      aiMessages: Message[],
      mainResponse: ConversationResponse,
      sourceMessageId: ID | null,
      settings: AppSettings,
      userId: ID
    ) => {
      try {
        const startedAt = performance.now();
        const response = await fetch("/api/background", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bundle,
            session: sessionForTurn,
            messages: messagesForContext,
            aiMessages,
            response: mainResponse,
            userInput: messagesForContext.at(-1)?.content ?? "",
            settings,
            environmentState: state.sessionEnvironmentStates.find((item) => item.session_id === sessionId) ?? null,
            characterStates: state.sessionCharacterStates.filter((item) => item.session_id === sessionId),
            relationships: state.relationships.filter((relationship) => relationship.scenario_id === sessionForTurn.scenario_id),
            foreshadowingItems: state.foreshadowingItems.filter(
              (item) => item.scenario_id === sessionForTurn.scenario_id && (!item.session_id || item.session_id === sessionId)
            )
          })
        });
        const latencyMs = Math.round(performance.now() - startedAt);
        if (!response.ok) throw new Error("バックグラウンド解析に失敗しました。");
        const result = (await response.json()) as BackgroundJobsResponse;
        setState((current) => {
          const currentSession = current.sessions.find((item) => item.id === sessionId) ?? sessionForTurn;
          const backgroundResponse = withBackgroundResult(mainResponse, result);
          const candidateRows = memoryCandidatesFromBackground(result, userId, currentSession.scenario_id, sessionId, sourceMessageId);
          const usageLog = result.usage ? usageFromBackgroundJobs(userId, { ...result.usage, latency_ms: latencyMs }, result) : null;
          const imageCueMessage = imageCueToMessage(sessionId, result.imageCue);
          const shouldStopAuto = result.imageCue.shouldSuggestImage || result.imageCue.nsfwLevel !== "none";
          const infoBox = applyInfoBoxUpdate(
            current.sessionEnvironmentStates,
            current.sessionCharacterStates,
            result.infoboxUpdate,
            currentSession,
            bundle,
            userId
          );
          return {
            ...current,
            messages: imageCueMessage ? [...current.messages, imageCueMessage] : current.messages,
            memoryCandidates: candidateRows.length ? [...current.memoryCandidates, ...candidateRows] : current.memoryCandidates,
            foreshadowingItems: applyForeshadowingUpdates(current.foreshadowingItems, backgroundResponse, currentSession, bundle, aiMessages, {
              advanceTurnState: false
            }),
            relationships: applyRelationshipDelta(
              ensureRelationships(current.relationships, userId, currentSession.scenario_id, bundle.characters.map((item) => item.id)),
              currentSession.scenario_id,
              bundle.characters[0]?.id,
              result.relationshipDelta
            ),
            sessionEnvironmentStates: infoBox.environmentStates,
            sessionCharacterStates: infoBox.characterStates,
            sessions: shouldStopAuto
              ? current.sessions.map((session) =>
                  session.id === sessionId
                    ? { ...session, pending_choices: session.pending_choices, needs_user_input: true, auto_continue_allowed: false, auto_continue_count: 0, updated_at: nowIso() }
                    : session
                )
              : current.sessions,
            usageLogs: usageLog ? [...current.usageLogs, usageLog] : current.usageLogs
          };
        });
        // Process visualCue asynchronously – never blocks conversation display
        if (result.visualCue?.shouldUpdateVisual) {
          void resolveVisualCueRef.current?.(sessionId, result.visualCue, bundle);
        }
      } catch (error) {
        console.warn("[AI Background] Jobs skipped", error);
      }
    },
    [state.foreshadowingItems, state.relationships, state.sessionEnvironmentStates, state.sessionCharacterStates]
  );

  const runConversationSummary = useCallback(
    async (
      sessionId: ID,
      sessionForTurn: PlaySession,
      bundle: StoryBundle,
      messagesForSession: Message[],
      settings: AppSettings,
      userId: ID
    ) => {
      const currentSummaries = state.storySummaries.filter((summary) => summary.session_id === sessionId);
      const range = selectSummaryRange(messagesForSession, currentSummaries);
      if (!range) return;

      try {
        const startedAt = performance.now();
        const response = await fetch("/api/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: range.messages,
            settings,
            scenarioTitle: bundle.scenario.title,
            sceneObjective: sessionForTurn.scene_objective || bundle.scenario.objective
          })
        });
        const latencyMs = Math.round(performance.now() - startedAt);
        if (!response.ok) throw new Error("会話要約に失敗しました。");
        const result = (await response.json()) as {
          summary: string;
          usage?: {
            backend: string;
            provider: string;
            model: string;
            input_tokens: number;
            output_tokens: number;
            estimated_cost_jpy: number;
            error?: string;
          };
        };
        setState((current) => {
          const nextSummary: StorySummary = {
            id: newId("summary"),
            user_id: userId,
            scenario_id: sessionForTurn.scenario_id,
            session_id: sessionId,
            chapter_index: sessionForTurn.chapter_index,
            start_turn_index: range.startTurn,
            end_turn_index: range.endTurn,
            summary: formatStructuredSummary(result.summary),
            created_at: nowIso(),
            updated_at: nowIso()
          };
          const usageLog = result.usage ? usageFromSummary(userId, { ...result.usage, latency_ms: latencyMs }, nextSummary) : null;
          return {
            ...current,
            storySummaries: compactStorySummaries([...current.storySummaries, nextSummary], sessionId),
            usageLogs: usageLog ? [...current.usageLogs, usageLog] : current.usageLogs
          };
        });
      } catch (error) {
        console.warn("[Conversation Summary] Background summary skipped", error);
      }
    },
    [state.storySummaries]
  );

  const loadRemoteForUser = useCallback(async (user: NonNullable<SupabaseRemoteState["user"]>) => {
    setRemote((current) => ({ ...current, user, loading: true, error: null }));
    const nextState = (await loadAppStateFromSupabase(user)) ?? (await seedRemoteWithSample(user));
    const normalized = mergeLocalOnlyState(normalizeState(nextState));
    lastRemoteSnapshot.current = JSON.stringify(normalized);
    setState(normalized);
    setRemote({ configured: true, user, loading: false, error: null });
  }, []);

  const signInRemoteAnonymously = useCallback(async () => {
    try {
      setRemote((current) => ({ ...current, loading: true, error: null }));
      const user = await signInAnonymously();
      if (!user) throw new Error("匿名ログインに失敗しました。");
      await loadRemoteForUser(user);
    } catch (error) {
      setRemote((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "匿名ログインに失敗しました。"
      }));
      throw error;
    }
  }, [loadRemoteForUser]);

  const signInRemoteWithEmail = useCallback(async (email: string) => {
    try {
      setRemote((current) => ({ ...current, loading: true, error: null }));
      await signInWithEmailOtp(email);
      setRemote((current) => ({ ...current, loading: false, error: "確認メールを送信しました。メール内のリンクから戻ってください。" }));
    } catch (error) {
      setRemote((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "メールログインに失敗しました。"
      }));
      throw error;
    }
  }, []);

  const signOutRemote = useCallback(async () => {
    await signOutSupabase();
    lastRemoteSnapshot.current = "";
    setRemote({ configured: isSupabaseConfigured, user: null, loading: false, error: null });
  }, []);

  const syncRemoteNow = useCallback(async () => {
    if (!remote.user) return;
    setRemoteSaving(true);
    try {
      await saveAppStateToSupabase(state, remote.user);
      lastRemoteSnapshot.current = JSON.stringify(state);
      setRemote((current) => ({ ...current, error: null }));
    } catch (error) {
      setRemote((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Supabase への保存に失敗しました。"
      }));
      throw error;
    } finally {
      setRemoteSaving(false);
    }
  }, [remote.user, state]);

  const createScenario = useCallback(() => {
    const blank = createBlankScenarioState(state.userId);
    setState((current) => ({
      ...current,
      scenarios: [blank.scenario, ...current.scenarios],
      characters: [...current.characters, ...blank.characters],
      userProfiles: [...current.userProfiles, blank.profile],
      styles: [...current.styles, blank.style],
      intros: [...current.intros, blank.intro],
      lorebook: [...current.lorebook, ...blank.lorebook],
      storyScenes: [...current.storyScenes, ...blank.storyScenes],
      foreshadowingItems: [...current.foreshadowingItems, ...blank.foreshadowingItems]
    }));
    return blank.scenario.id;
  }, [state.userId]);

  const saveBundle = useCallback((bundle: StoryBundle) => {
    const now = nowIso();

    setState((current) => ({
      ...current,
      scenarios: upsertById(current.scenarios, { ...bundle.scenario, updated_at: now }),
      characters: [
        ...current.characters.filter((item) => item.scenario_id !== bundle.scenario.id),
        ...bundle.characters.map((item, index) => ({ ...item, sort_order: index, updated_at: now }))
      ].filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index),
      userProfiles: [
        ...current.userProfiles.filter((item) => item.scenario_id !== bundle.scenario.id),
        ...bundle.userProfiles.map((item) => ({ ...item, updated_at: now }))
      ].filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index),
      lorebook: [
        ...current.lorebook.filter((item) => item.scenario_id !== bundle.scenario.id),
        ...bundle.lorebook.map((item) => ({ ...item, updated_at: now }))
      ].filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index),
      lorebookLinks: [
        ...(current.lorebookLinks ?? []).filter((item) => item.plot_id !== bundle.scenario.id),
        ...bundle.lorebookLinks
      ].filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index),
      storyScenes: [
        ...current.storyScenes.filter((item) => item.scenario_id !== bundle.scenario.id),
        ...bundle.storyScenes.map((item) => ({ ...item, updated_at: now }))
      ].filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index),
      foreshadowingItems: [
        ...current.foreshadowingItems.filter((item) => item.scenario_id !== bundle.scenario.id || item.session_id),
        ...bundle.foreshadowingItems.map((item) => ({ ...item, session_id: item.session_id ?? null, updated_at: now }))
      ].filter((item, index, array) => array.findIndex((candidate) => candidate.id === item.id) === index),
      styles: upsertById(current.styles, { ...bundle.style, updated_at: now }),
      intros: upsertById(current.intros, { ...bundle.intro, updated_at: now })
    }));
  }, []);

  const startOrResumeScenario = useCallback(
    (scenarioId: ID) => {
      const active = state.sessions.find((session) => session.scenario_id === scenarioId && session.status === "active");
      if (active) return active.id;

      const bundle = getBundle(scenarioId);
      if (!bundle) return "";
      const now = nowIso();
      const sessionId = newId("session");
      const profile = bundle.userProfiles.find((item) => item.id === bundle.intro.user_profile_id) ?? bundle.userProfiles[0];
      const openingScene = bundle.storyScenes.find((scene) => scene.scene_key === "chapter_1_opening") ?? bundle.storyScenes[0];
      const initialSceneKey = openingScene?.scene_key ?? "chapter_1_opening";
      const session: PlaySession = {
        id: sessionId,
        user_id: state.userId,
        scenario_id: scenarioId,
        user_profile_id: profile?.id ?? "",
        current_scene_key: initialSceneKey,
        chapter_index: 1,
        progress_percent: 0,
        status: "active",
        last_summary: "",
        nsfw_chat_enabled: state.settings.adult_confirmed && state.settings.nsfw_chat_enabled,
        nsfw_image_enabled: state.settings.adult_confirmed && state.settings.nsfw_image_enabled,
        play_pace_mode: bundle.style.play_pace_mode,
        auto_continue_count: 0,
        needs_user_input: true,
        auto_continue_allowed: false,
        pending_choices: bundle.intro.initial_choices,
        story_flags: {},
        scene_objective: openingScene?.objective || bundle.scenario.objective,
        current_beat_index: 0,
        scene_turn_count: 0,
        stall_count: 0,
        last_conflict: openingScene?.conflict ?? "",
        last_hook: openingScene?.hook ?? "",
        objective_completed: false,
        last_director_reason: null,
        last_quality_score: null,
        quality_stall_count: 0,
        last_quality_problem: null,
        last_improvement_hint: null,
        created_at: now,
        updated_at: now
      };

      const openingMessages: Message[] = [
        {
          id: newId("msg"),
          session_id: sessionId,
          role: "assistant",
          message_type: "narration",
          speaker_type: "narrator",
          speaker_name: "ナレーション",
          speaker_avatar_url: null,
          content: bundle.intro.initial_narration || bundle.intro.start_text,
          metadata: {},
          created_at: now
        },
        ...bundle.intro.initial_character_messages.map((item) => {
          const character = bundle.characters.find((candidate) => candidate.id === item.characterId || candidate.name === item.characterName);
          return {
            id: newId("msg"),
            session_id: sessionId,
            role: "assistant" as const,
            message_type: "character" as const,
            speaker_type: "character" as const,
            speaker_id: character?.id ?? item.characterId,
            speaker_name: character?.name ?? item.characterName,
            speaker_avatar_url: character?.avatar_url ?? null,
            content: item.content,
            metadata: {},
            created_at: nowIso()
          };
        })
      ];

      const relationships = bundle.characters.map((character) => createRelationship(state.userId, scenarioId, character.id));
      const environmentState = createEnvironmentState(state.userId, session, bundle, now);
      const initialCharacterIds = bundle.intro.appearing_character_ids.length
        ? bundle.intro.appearing_character_ids
        : bundle.characters.map((character) => character.id);
      const characterStates = initialCharacterIds
        .map((characterId) => {
          const character = bundle.characters.find((item) => item.id === characterId);
          if (!character) return null;
          return createCharacterState(state.userId, session, characterId, character, now);
        })
        .filter(Boolean) as SessionCharacterState[];

      setState((current) => ({
        ...current,
        sessions: [...current.sessions, session],
        messages: [...current.messages, ...openingMessages],
        relationships: [...current.relationships, ...relationships],
        sessionEnvironmentStates: [...current.sessionEnvironmentStates, environmentState],
        sessionCharacterStates: [...current.sessionCharacterStates, ...characterStates],
        scenarios: current.scenarios.map((scenario) =>
          scenario.id === scenarioId ? { ...scenario, last_played_at: now, updated_at: now } : scenario
        )
      }));

      return sessionId;
    },
    [getBundle, state]
  );

  const toggleScenarioBookmark = useCallback((scenarioId: ID) => {
    setState((current) => {
      const bookmarkedScenarioIds = current.bookmarkedScenarioIds ?? [];
      const exists = bookmarkedScenarioIds.includes(scenarioId);
      return {
        ...current,
        bookmarkedScenarioIds: exists
          ? bookmarkedScenarioIds.filter((id) => id !== scenarioId)
          : [...bookmarkedScenarioIds, scenarioId]
      };
    });
  }, []);

  const sendTurn = useCallback(
    async (sessionId: ID, text: string, choice?: SuggestedReply) => {
      const session = state.sessions.find((item) => item.id === sessionId);
      if (!session) return;
      const bundle = getBundle(session.scenario_id);
      if (!bundle) return;

      const sessionSnapshot = {
        pending_choices: session.pending_choices,
        needs_user_input: session.needs_user_input,
        auto_continue_allowed: session.auto_continue_allowed,
        auto_continue_count: session.auto_continue_count
      };

      const profile = bundle.userProfiles.find((item) => item.id === session.user_profile_id) ?? bundle.userProfiles[0];
      activeTurnControl.current?.abortController?.abort();
      activeTurnControl.current?.resolveDelay?.();
      const control: TurnControl = { skipRequested: false, abortController: null, resolveDelay: null };
      activeTurnControl.current = control;
      const inputType = choice ? "choice_selected" as const : "free_text" as const;
      const selectedChoice = choice ? { label: choice.label, type: choice.type } : null;
      const sessionForRequest: PlaySession = {
        ...session,
        auto_continue_count: 0,
        needs_user_input: false,
        auto_continue_allowed: false
      };
      const userMessage: Message = {
        id: newId("msg"),
        session_id: sessionId,
        role: "user",
        message_type: "user",
        speaker_type: "user",
        speaker_id: profile?.id,
        speaker_name: profile?.display_name ?? "あなた",
        speaker_avatar_url: profile?.avatar_url ?? null,
        content: text,
        metadata: choice ? { choice } : {},
        created_at: nowIso()
      };

      const localMessages = [...state.messages, userMessage];
      setState((current) => {
        const choiceTracking = (choice && current.settings.choice_learning_enabled)
          ? trackChoiceSelection(current, sessionId, session.scenario_id, choice)
          : {};
        return {
          ...current,
          ...choiceTracking,
          messages: [...current.messages, userMessage],
          sessions: current.sessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  pending_choices: [],
                  auto_continue_count: 0,
                  needs_user_input: false,
                  auto_continue_allowed: false,
                  updated_at: nowIso()
                }
              : item
          )
        };
      });

      const requestSettings = effectiveTurnSettings(state);
      const conversationStartedAt = performance.now();
      const revealOptions = getTypewriterRevealOptions(requestSettings);
      const environmentState = state.sessionEnvironmentStates.find((item) => item.session_id === sessionId) ?? null;
      const characterStates = state.sessionCharacterStates.filter((item) => item.session_id === sessionId);
      const usageTotalCostJpy = state.usageLogs.reduce((sum, log) => sum + log.estimated_cost_jpy, 0);
      const requestPayload = {
        bundle,
        session: sessionForRequest,
        messages: localMessages.filter((message) => message.session_id === sessionId).slice(-20),
        userInput: text,
        settings: requestSettings,
        environmentState,
        characterStates,
        inputType,
        selectedChoice,
        relationships: state.relationships.filter((relationship) => relationship.scenario_id === session.scenario_id),
        lorebook: state.lorebook.filter((entry) => entry.scenario_id === session.scenario_id),
        linkedLorebookEntries: getLinkedLorebookEntries(state, session.scenario_id),
        memories: state.memories.filter((memory) => memory.scenario_id === session.scenario_id),
        storySummaries: state.storySummaries.filter((summary) => summary.session_id === sessionId).slice(-3),
        foreshadowingItems: state.foreshadowingItems.filter(
          (item) => item.scenario_id === session.scenario_id && (!item.session_id || item.session_id === sessionId)
        ),
        usageTotalCostJpy,
        choicePreferences: state.scenarioChoicePreferences?.[session.scenario_id] ?? state.choicePreferences ?? null
      };
      let displayedAiMessages = false;
      let revealResult: TypewriterRevealResult | null = null;
      let aiMessages: Message[] = [];
      let ai: ConversationResponse | null = null;
      try {
        const response = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
          throw new Error("会話生成に失敗しました。");
        }

        ai = (await response.json()) as ConversationResponse;
        aiMessages = aiResponseToMessages(ai, sessionId, bundle.characters, profile, { allowAiGeneratedUser: inputType === "choice_selected" });

        if (revealOptions.intervalMs > 0) {
          revealResult = await displayMessagesSequentially(aiMessages, control, revealOptions, (updateMessages) => {
            setState((current) => ({ ...current, messages: updateMessages(current.messages) }));
          });
        } else {
          setState((current) => ({ ...current, messages: [...current.messages, ...aiMessages] }));
        }

        displayedAiMessages = true;
      } catch (error) {
        setState((current) => ({
          ...current,
          sessions: current.sessions.map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  pending_choices: sessionSnapshot.pending_choices,
                  needs_user_input: sessionSnapshot.needs_user_input,
                  auto_continue_allowed: sessionSnapshot.auto_continue_allowed,
                  auto_continue_count: sessionSnapshot.auto_continue_count,
                  updated_at: nowIso()
                }
              : item
          )
        }));
        throw error;
      } finally {
        if (activeTurnControl.current === control && !ai?.suggestedReplies.length) activeTurnControl.current = null;
      }
      if (!ai) throw new Error("会話生成に失敗しました。");
      const conversationLatencyMs = Math.round(performance.now() - conversationStartedAt);
      if (activeTurnControl.current === control) activeTurnControl.current = null;
      const candidateRows = ai.memoryCandidates.map((candidate): MemoryCandidate => ({
        id: newId("memcand"),
        user_id: state.userId,
        scenario_id: session.scenario_id,
        character_id: null,
        session_id: sessionId,
        source_message_id: userMessage.id,
        type: candidate.type,
        content: candidate.content,
        importance: candidate.importance,
        sensitivity: candidate.sensitivity,
        reason: candidate.reason,
        status: "pending",
        created_at: nowIso(),
        updated_at: nowIso()
      }));
      const usage = usageFromConversation(state.userId, ai, conversationLatencyMs, requestSettings, revealResult);
      const messagesForQuality = [...localMessages.filter((message) => message.session_id === sessionId), ...aiMessages].slice(-18);
      const messagesAfterTurn = [...localMessages.filter((message) => message.session_id === sessionId), ...aiMessages];

      setState((current) => {
        const currentSession = current.sessions.find((item) => item.id === sessionId) ?? sessionForRequest;
        const immediateAi = withQualityCheck(ai, qualityFromSession(currentSession));
        const autoState = computeAutoState(immediateAi, currentSession, bundle.style, 0, isMonthlyBudgetNearLimit({ ...current, usageLogs: [...current.usageLogs, usage] }));
        const foreshadowingItems = applyForeshadowingUpdates(
          current.foreshadowingItems,
          immediateAi,
          currentSession,
          bundle,
          aiMessages
        );
        const patchedRelationships = applyRelationshipDelta(
          ensureRelationships(current.relationships, state.userId, session.scenario_id, bundle.characters.map((item) => item.id)),
          session.scenario_id,
          bundle.characters[0]?.id,
          mergeDelta(ai.relationshipDelta, choice?.effect)
        );
        const nextSessions = current.sessions.map((item) =>
          item.id === sessionId
            ? {
                ...item,
                pending_choices: ai.suggestedReplies,
                needs_user_input: autoState.needsUserInput,
                auto_continue_allowed: autoState.autoContinueAllowed,
                auto_continue_count: autoState.autoContinueCount,
                ...applyDirectorSessionUpdate(item, immediateAi, bundle.storyScenes),
                story_flags: Object.fromEntries([
                  ...Object.entries(item.story_flags),
                  ...ai.storyUpdate.newFlags.map((flag) => [flag.key, flag.value] as const),
                  ...(choice?.effect.flag ? [[choice.effect.flag, true] as const] : [])
                ]),
                updated_at: nowIso()
              }
            : item
        );
        const updatedSession = nextSessions.find((item) => item.id === sessionId) ?? currentSession;
        const nextEnvironmentStates = syncEnvironmentState(
          current.sessionEnvironmentStates,
          updatedSession,
          bundle,
          current.userId
        );
        return {
          ...current,
          messages: displayedAiMessages ? current.messages : [...current.messages, ...aiMessages],
          memoryCandidates: [...current.memoryCandidates, ...candidateRows],
          foreshadowingItems,
          usageLogs: [...current.usageLogs, usage],
          relationships: patchedRelationships,
          sessions: nextSessions,
          sessionEnvironmentStates: nextEnvironmentStates,
          scenarios: current.scenarios.map((scenario) =>
            scenario.id === session.scenario_id
              ? {
                  ...scenario,
                  progress_percent: clamp(scenario.progress_percent + ai.storyUpdate.progressDelta + directorProgressDelta(ai), 0, 100),
                  last_played_at: nowIso(),
                  updated_at: nowIso()
                }
              : scenario
          )
        };
      });
      void runBackgroundJobs(
        sessionId,
        sessionForRequest,
        bundle,
        localMessages.filter((message) => message.session_id === sessionId).slice(-30),
        aiMessages,
        ai,
        userMessage.id,
        requestSettings,
        state.userId
      );
      void runConversationSummary(sessionId, sessionForRequest, bundle, messagesAfterTurn, requestSettings, state.userId);
      void runQualityCheck(
        sessionId, sessionForRequest, bundle, messagesForQuality, aiMessages.at(-1)?.id ?? null, requestSettings, state.userId,
        state.foreshadowingItems.filter((item) => item.scenario_id === sessionForRequest.scenario_id)
      );
      setCurrentSmartReplies(ai.smartReplies ?? []);
      setCurrentContinueSuggestion(ai.continueSuggestion ?? null);
      setCurrentCharacterControl(ai.characterControl ?? null);
    },
    [getBundle, runBackgroundJobs, runConversationSummary, runQualityCheck, setCurrentSmartReplies, state]
  );

  const continueAutoTurn = useCallback(
    async (sessionId: ID, options?: { allowNonAuto?: boolean }) => {
      const session = state.sessions.find((item) => item.id === sessionId);
      const allowNonAuto = options?.allowNonAuto ?? false;
      if (!session || (!allowNonAuto && session.play_pace_mode !== "auto") || !session.auto_continue_allowed) return;
      const bundle = getBundle(session.scenario_id);
      if (!bundle) return;

      const maxAuto = getMaxAutoCount(bundle.style);
      if (session.auto_continue_count >= maxAuto || isMonthlyBudgetNearLimit(state)) {
        setState((current) => ({
          ...current,
          sessions: current.sessions.map((item) =>
            item.id === sessionId
              ? { ...item, needs_user_input: true, auto_continue_allowed: false, updated_at: nowIso() }
              : item
          )
        }));
        return;
      }

      const userInput = "（オート進行: ユーザー入力なしで、現在の場面を安全に自然進行してください）";
      activeTurnControl.current?.abortController?.abort();
      activeTurnControl.current?.resolveDelay?.();
      const control: TurnControl = { skipRequested: false, abortController: null, resolveDelay: null };
      activeTurnControl.current = control;
      const profile = bundle.userProfiles.find((item) => item.id === session.user_profile_id) ?? bundle.userProfiles[0];
      const sessionForRequest: PlaySession = {
        ...session,
        needs_user_input: false,
        auto_continue_allowed: false
      };

      setState((current) => ({
        ...current,
        sessions: current.sessions.map((item) =>
          item.id === sessionId
            ? { ...item, needs_user_input: false, auto_continue_allowed: false, updated_at: nowIso() }
            : item
        )
      }));

      const requestSettings = effectiveTurnSettings(state);
      const conversationStartedAt = performance.now();
      const revealOptions = getTypewriterRevealOptions(requestSettings);
      const environmentState = state.sessionEnvironmentStates.find((item) => item.session_id === sessionId) ?? null;
      const characterStates = state.sessionCharacterStates.filter((item) => item.session_id === sessionId);
      const usageTotalCostJpy = state.usageLogs.reduce((sum, log) => sum + log.estimated_cost_jpy, 0);
      const requestPayload = {
        bundle,
        session: sessionForRequest,
        messages: state.messages.filter((message) => message.session_id === sessionId).slice(-20),
        userInput,
        settings: requestSettings,
        environmentState,
        characterStates,
        inputType: "auto_continue" as const,
        selectedChoice: null,
        relationships: state.relationships.filter((relationship) => relationship.scenario_id === session.scenario_id),
        lorebook: state.lorebook.filter((entry) => entry.scenario_id === session.scenario_id),
        linkedLorebookEntries: getLinkedLorebookEntries(state, session.scenario_id),
        memories: state.memories.filter((memory) => memory.scenario_id === session.scenario_id),
        storySummaries: state.storySummaries.filter((summary) => summary.session_id === sessionId).slice(-3),
        foreshadowingItems: state.foreshadowingItems.filter(
          (item) => item.scenario_id === session.scenario_id && (!item.session_id || item.session_id === sessionId)
        ),
        usageTotalCostJpy,
        choicePreferences: state.scenarioChoicePreferences?.[session.scenario_id] ?? state.choicePreferences ?? null
      };
      let displayedAiMessages = false;
      let revealResult: TypewriterRevealResult | null = null;
      let aiMessages: Message[] = [];
      let ai: ConversationResponse | null = null;
      try {
        const response = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload)
        });

        if (!response.ok) {
          setState((current) => ({
            ...current,
            sessions: current.sessions.map((item) =>
              item.id === sessionId
                ? { ...item, needs_user_input: true, auto_continue_allowed: false, updated_at: nowIso() }
                : item
            )
          }));
          throw new Error("オート進行に失敗しました。");
        }

        ai = (await response.json()) as ConversationResponse;
        aiMessages = aiResponseToMessages(ai, sessionId, bundle.characters, profile, { allowAiGeneratedUser: false });

        if (revealOptions.intervalMs > 0) {
          revealResult = await displayMessagesSequentially(aiMessages, control, revealOptions, (updateMessages) => {
            setState((current) => ({ ...current, messages: updateMessages(current.messages) }));
          });
        } else {
          setState((current) => ({ ...current, messages: [...current.messages, ...aiMessages] }));
        }

        displayedAiMessages = true;
      } finally {
        if (activeTurnControl.current === control && !ai?.suggestedReplies.length) activeTurnControl.current = null;
      }
      if (!ai) throw new Error("オート進行に失敗しました。");
      const conversationLatencyMs = Math.round(performance.now() - conversationStartedAt);
      if (ai.suggestedReplies.length) await waitForTurnDelay(800, control);
      if (activeTurnControl.current === control) activeTurnControl.current = null;
      const candidateRows = ai.memoryCandidates.map((candidate): MemoryCandidate => ({
        id: newId("memcand"),
        user_id: state.userId,
        scenario_id: session.scenario_id,
        character_id: null,
        session_id: sessionId,
        source_message_id: null,
        type: candidate.type,
        content: candidate.content,
        importance: candidate.importance,
        sensitivity: candidate.sensitivity,
        reason: candidate.reason,
        status: "pending",
        created_at: nowIso(),
        updated_at: nowIso()
      }));
      const usage = usageFromConversation(state.userId, ai, conversationLatencyMs, requestSettings, revealResult);
      const messagesForQuality = [...state.messages.filter((message) => message.session_id === sessionId), ...aiMessages].slice(-18);
      const messagesAfterTurn = [...state.messages.filter((message) => message.session_id === sessionId), ...aiMessages];

      setState((current) => {
        const currentSession = current.sessions.find((item) => item.id === sessionId) ?? session;
        const nextCount = Math.min(currentSession.auto_continue_count + 1, maxAuto);
        const immediateAi = withQualityCheck(ai, qualityFromSession(currentSession));
        const autoState = computeAutoState(immediateAi, currentSession, bundle.style, nextCount, isMonthlyBudgetNearLimit({ ...current, usageLogs: [...current.usageLogs, usage] }));
        const foreshadowingItems = applyForeshadowingUpdates(
          current.foreshadowingItems,
          immediateAi,
          currentSession,
          bundle,
          aiMessages
        );
        const patchedRelationships = applyRelationshipDelta(
          ensureRelationships(current.relationships, state.userId, session.scenario_id, bundle.characters.map((item) => item.id)),
          session.scenario_id,
          bundle.characters[0]?.id,
          ai.relationshipDelta
        );
        const nextSessions = current.sessions.map((item) =>
          item.id === sessionId
            ? {
                ...item,
                pending_choices: ai.suggestedReplies,
                needs_user_input: autoState.needsUserInput,
                auto_continue_allowed: autoState.autoContinueAllowed,
                auto_continue_count: autoState.autoContinueCount,
                ...applyDirectorSessionUpdate(item, immediateAi, bundle.storyScenes),
                story_flags: Object.fromEntries([
                  ...Object.entries(item.story_flags),
                  ...ai.storyUpdate.newFlags.map((flag) => [flag.key, flag.value] as const)
                ]),
                updated_at: nowIso()
              }
            : item
        );
        const updatedSession = nextSessions.find((item) => item.id === sessionId) ?? currentSession;
        const nextEnvironmentStates = syncEnvironmentState(
          current.sessionEnvironmentStates,
          updatedSession,
          bundle,
          current.userId
        );

        return {
          ...current,
          messages: displayedAiMessages ? current.messages : [...current.messages, ...aiMessages],
          memoryCandidates: [...current.memoryCandidates, ...candidateRows],
          foreshadowingItems,
          usageLogs: [...current.usageLogs, usage],
          relationships: patchedRelationships,
          sessions: nextSessions,
          sessionEnvironmentStates: nextEnvironmentStates,
          scenarios: current.scenarios.map((scenario) =>
            scenario.id === session.scenario_id
              ? {
                  ...scenario,
                  progress_percent: clamp(scenario.progress_percent + ai.storyUpdate.progressDelta + directorProgressDelta(ai), 0, 100),
                  last_played_at: nowIso(),
                  updated_at: nowIso()
                }
              : scenario
          )
        };
      });
      void runBackgroundJobs(
        sessionId,
        sessionForRequest,
        bundle,
        state.messages.filter((message) => message.session_id === sessionId).slice(-30),
        aiMessages,
        ai,
        null,
        requestSettings,
        state.userId
      );
      void runConversationSummary(sessionId, sessionForRequest, bundle, messagesAfterTurn, requestSettings, state.userId);
      void runQualityCheck(
        sessionId, sessionForRequest, bundle, messagesForQuality, aiMessages.at(-1)?.id ?? null, requestSettings, state.userId,
        state.foreshadowingItems.filter((item) => item.scenario_id === sessionForRequest.scenario_id)
      );
      setCurrentSmartReplies(ai.smartReplies ?? []);
      setCurrentContinueSuggestion(ai.continueSuggestion ?? null);
      setCurrentCharacterControl(ai.characterControl ?? null);
    },
    [getBundle, runBackgroundJobs, runConversationSummary, runQualityCheck, setCurrentSmartReplies, state]
  );

  const setSessionPlayPaceMode = useCallback((sessionId: ID, mode: PlayPaceMode) => {
    setState((current) => ({
      ...current,
      sessions: current.sessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              play_pace_mode: mode,
              auto_continue_count: 0,
              needs_user_input: true,
              auto_continue_allowed: false,
              updated_at: nowIso()
            }
          : session
      )
    }));
  }, []);

  // ── Silent Continue (続きを見る) ─────────────────────────────────────────
  const sendSilentContinue = useCallback(
    async (sessionId: ID) => {
      const session = state.sessions.find((item) => item.id === sessionId);
      if (!session) return;
      const bundle = getBundle(session.scenario_id);
      if (!bundle) return;

      // Block if over auto count limit
      if ((session.auto_continue_count ?? 0) >= 3) return;

      const profile = bundle.userProfiles.find((item) => item.id === session.user_profile_id) ?? bundle.userProfiles[0];
      activeTurnControl.current?.abortController?.abort();
      activeTurnControl.current?.resolveDelay?.();
      const control: TurnControl = { skipRequested: false, abortController: null, resolveDelay: null };
      activeTurnControl.current = control;

      const silentInput = "ユーザーは今は発言せず、相手の反応や状況を見守る。";
      const eventMessageId = newId("msg");
      const eventMessage: Message = {
        id: eventMessageId,
        session_id: sessionId,
        role: "system",
        message_type: "event",
        speaker_type: "system",
        speaker_name: "システム",
        speaker_avatar_url: null,
        content: "── あなたは黙って様子を見る。",
        metadata: { action: "continue_without_user_speech" },
        created_at: nowIso()
      };

      const sessionForRequest: PlaySession = {
        ...session,
        needs_user_input: false,
        auto_continue_allowed: false
      };

      setState((current) => ({
        ...current,
        messages: [...current.messages, eventMessage],
        sessions: current.sessions.map((item) =>
          item.id === sessionId
            ? { ...item, needs_user_input: false, auto_continue_allowed: false, updated_at: nowIso() }
            : item
        )
      }));

      const requestSettings = effectiveTurnSettings(state);
      const conversationStartedAt = performance.now();
      const revealOptions = getTypewriterRevealOptions(requestSettings);
      const environmentState = state.sessionEnvironmentStates.find((item) => item.session_id === sessionId) ?? null;
      const characterStates = state.sessionCharacterStates.filter((item) => item.session_id === sessionId);
      const usageTotalCostJpy = state.usageLogs.reduce((sum, log) => sum + log.estimated_cost_jpy, 0);
      const requestPayload = {
        bundle,
        session: sessionForRequest,
        messages: [...state.messages, eventMessage].filter((message) => message.session_id === sessionId).slice(-20),
        userInput: silentInput,
        settings: requestSettings,
        environmentState,
        characterStates,
        inputType: "continue_without_user_speech" as const,
        selectedChoice: null,
        relationships: state.relationships.filter((relationship) => relationship.scenario_id === session.scenario_id),
        lorebook: state.lorebook.filter((entry) => entry.scenario_id === session.scenario_id),
        linkedLorebookEntries: getLinkedLorebookEntries(state, session.scenario_id),
        memories: state.memories.filter((memory) => memory.scenario_id === session.scenario_id),
        storySummaries: state.storySummaries.filter((summary) => summary.session_id === sessionId).slice(-3),
        foreshadowingItems: state.foreshadowingItems.filter(
          (item) => item.scenario_id === session.scenario_id && (!item.session_id || item.session_id === sessionId)
        ),
        usageTotalCostJpy,
        choicePreferences: state.scenarioChoicePreferences?.[session.scenario_id] ?? state.choicePreferences ?? null
      };

      let displayedAiMessages = false;
      let revealResult: TypewriterRevealResult | null = null;
      let aiMessages: Message[] = [];
      let ai: ConversationResponse | null = null;
      try {
        const response = await fetch("/api/conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload)
        });
        if (!response.ok) {
          setState((current) => ({
            ...current,
            sessions: current.sessions.map((item) =>
              item.id === sessionId
                ? { ...item, needs_user_input: true, auto_continue_allowed: false, updated_at: nowIso() }
                : item
            )
          }));
          throw new Error("続きの生成に失敗しました。");
        }

        ai = (await response.json()) as ConversationResponse;
        aiMessages = aiResponseToMessages(ai, sessionId, bundle.characters, profile, { allowAiGeneratedUser: false });

        if (revealOptions.intervalMs > 0) {
          revealResult = await displayMessagesSequentially(aiMessages, control, revealOptions, (updateMessages) => {
            setState((current) => ({ ...current, messages: updateMessages(current.messages) }));
          });
        } else {
          setState((current) => ({ ...current, messages: [...current.messages, ...aiMessages] }));
        }
        displayedAiMessages = true;
      } finally {
        if (activeTurnControl.current === control && !ai?.suggestedReplies.length) activeTurnControl.current = null;
      }
      if (!ai) throw new Error("続きの生成に失敗しました。");
      const conversationLatencyMs = Math.round(performance.now() - conversationStartedAt);
      if (activeTurnControl.current === control) activeTurnControl.current = null;
      const usage = usageFromConversation(state.userId, ai, conversationLatencyMs, requestSettings, revealResult);
      const messagesForQuality = [...state.messages, eventMessage, ...aiMessages].filter((m) => m.session_id === sessionId).slice(-18);
      const messagesAfterTurn = [...state.messages, eventMessage, ...aiMessages].filter((m) => m.session_id === sessionId);

      setState((current) => {
        const currentSession = current.sessions.find((item) => item.id === sessionId) ?? sessionForRequest;
        const immediateAi = withQualityCheck(ai, qualityFromSession(currentSession));
        const nextCount = Math.min((currentSession.auto_continue_count ?? 0) + 1, 3);
        const autoState = computeAutoState(immediateAi, currentSession, bundle.style, nextCount, isMonthlyBudgetNearLimit({ ...current, usageLogs: [...current.usageLogs, usage] }));
        const foreshadowingItems = applyForeshadowingUpdates(
          current.foreshadowingItems,
          immediateAi,
          currentSession,
          bundle,
          aiMessages
        );
        const patchedRelationships = applyRelationshipDelta(
          ensureRelationships(current.relationships, state.userId, session.scenario_id, bundle.characters.map((item) => item.id)),
          session.scenario_id,
          bundle.characters[0]?.id,
          ai.relationshipDelta
        );
        const nextSessions = current.sessions.map((item) =>
          item.id === sessionId
            ? {
                ...item,
                pending_choices: ai.suggestedReplies,
                needs_user_input: autoState.needsUserInput,
                auto_continue_allowed: autoState.autoContinueAllowed,
                auto_continue_count: nextCount,
                ...applyDirectorSessionUpdate(item, immediateAi, bundle.storyScenes),
                story_flags: Object.fromEntries([
                  ...Object.entries(item.story_flags),
                  ...ai.storyUpdate.newFlags.map((flag) => [flag.key, flag.value] as const)
                ]),
                updated_at: nowIso()
              }
            : item
        );
        const updatedSession = nextSessions.find((item) => item.id === sessionId) ?? currentSession;
        const nextEnvironmentStates = syncEnvironmentState(current.sessionEnvironmentStates, updatedSession, bundle, current.userId);

        return {
          ...current,
          messages: displayedAiMessages ? current.messages : [...current.messages, ...aiMessages],
          foreshadowingItems,
          usageLogs: [...current.usageLogs, usage],
          relationships: patchedRelationships,
          sessions: nextSessions,
          sessionEnvironmentStates: nextEnvironmentStates,
          scenarios: current.scenarios.map((scenario) =>
            scenario.id === session.scenario_id
              ? {
                  ...scenario,
                  progress_percent: clamp(scenario.progress_percent + ai.storyUpdate.progressDelta + directorProgressDelta(ai), 0, 100),
                  last_played_at: nowIso(),
                  updated_at: nowIso()
                }
              : scenario
          )
        };
      });

      void runBackgroundJobs(
        sessionId,
        sessionForRequest,
        bundle,
        [...state.messages, eventMessage].filter((m) => m.session_id === sessionId).slice(-30),
        aiMessages,
        ai,
        null,
        requestSettings,
        state.userId
      );
      void runConversationSummary(sessionId, sessionForRequest, bundle, messagesAfterTurn, requestSettings, state.userId);
      void runQualityCheck(
        sessionId, sessionForRequest, bundle, messagesForQuality, aiMessages.at(-1)?.id ?? null, requestSettings, state.userId,
        state.foreshadowingItems.filter((item) => item.scenario_id === sessionForRequest.scenario_id)
      );
      setCurrentSmartReplies(ai.smartReplies ?? []);
      setCurrentContinueSuggestion(ai.continueSuggestion ?? null);
      setCurrentCharacterControl(ai.characterControl ?? null);
    },
    [getBundle, runBackgroundJobs, runConversationSummary, runQualityCheck, setCurrentSmartReplies, state]
  );

  // ── Scene Visual Resolver ─────────────────────────────────────────────────
  const resolveVisualCue = useCallback(
    async (sessionId: ID, cue: VisualCue, bundle: StoryBundle) => {
      // Prevent duplicate concurrent generation for the same session
      if (sceneGeneratingIdsRef.current.has(sessionId)) return;
      const settings = state.settings;
      if (settings.visual_mode === "off") return;
      if (settings.visual_mode === "manual") return;

      // Budget check: if image budget is 100% spent, skip auto generation
      const imageLogs = state.usageLogs.filter((l) => l.kind === "image");
      const imageSpentJpy = imageLogs.reduce((sum, l) => sum + l.estimated_cost_jpy, 0);
      const monthlyBudget = settings.image_monthly_budget_jpy || 1400;
      if (imageSpentJpy >= monthlyBudget) return;

      // major_events_only: only generate for high-priority or eventCg
      if (settings.visual_mode === "major_events_only" && cue.priority === "low" && !cue.eventCg) return;

      const sceneKey = cue.sceneKey || "default_scene";

      // Check for existing bundle with same sceneKey
      const existingBundle = state.sceneVisualBundles.find(
        (b) => b.session_id === sessionId && b.scene_key === sceneKey
      );

      if (cue.updateType === "expression_variant" && existingBundle?.base_image_id) {
        // Look for existing variant
        const normalizedExpr = normalizeExpression(cue.expression);
        const existingVariant = state.sceneVisualVariants.find(
          (v) =>
            v.bundle_id === existingBundle.id &&
            v.variant_type === "expression" &&
            v.expression === normalizedExpr &&
            v.generation_status === "completed" &&
            v.image_id
        );
        if (existingVariant?.image_id) {
          // Use existing variant image – update visual state only
          updateSceneVisualState(sessionId, existingVariant.image_id, cue);
          return;
        }

        // Budget check at 80%: skip expression pre-gen if over threshold
        if (imageSpentJpy >= monthlyBudget * 0.8 && !cue.eventCg) return;

        // Generate expression variant using same bundle's base image as reference
        void generateSceneBackground(sessionId, { ...cue, sceneKey }, existingBundle.id);
        return;
      }

      // New scene or base_scene update
      if (cue.updateType === "base_scene" || !existingBundle) {
        void generateSceneBackground(sessionId, { ...cue, sceneKey }, null);
        return;
      }

      // event_cg
      if (cue.updateType === "event_cg" || cue.eventCg) {
        void generateSceneBackground(sessionId, { ...cue, sceneKey, eventCg: true }, null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.settings, state.usageLogs, state.sceneVisualBundles, state.sceneVisualVariants]
  );

  // Keep ref in sync so runBackgroundJobs always calls the latest resolveVisualCue
  resolveVisualCueRef.current = resolveVisualCue;
  sceneGeneratingIdsRef.current = sceneGeneratingIds;

  const updateSceneVisualState = useCallback(
    (sessionId: ID, imageId: ID, cue: VisualCue) => {
      const now = nowIso();
      setState((current) => {
        const existing = current.sessionSceneVisualStates.find((s) => s.session_id === sessionId);
        const next: SessionSceneVisualState = {
          id: existing?.id ?? newId("svs"),
          session_id: sessionId,
          current_background_image_id: imageId,
          location: cue.location ?? existing?.location ?? "",
          time_of_day: cue.timeOfDay ?? existing?.time_of_day ?? "",
          weather: cue.weather ?? existing?.weather ?? "",
          active_characters_json: cue.activeCharacters.length ? cue.activeCharacters : (existing?.active_characters_json ?? []),
          character_outfits_json: existing?.character_outfits_json ?? {},
          character_emotions_json: existing?.character_emotions_json ?? {},
          scene_mood: existing?.scene_mood ?? "",
          camera_distance: cue.cameraDistance,
          pov_type: cue.pov,
          last_prompt_summary: cue.promptSummary ?? existing?.last_prompt_summary ?? "",
          scene_key: cue.sceneKey ?? existing?.scene_key ?? "",
          updated_at: now
        };
        return {
          ...current,
          sessionSceneVisualStates: upsertSessionVisualState(current.sessionSceneVisualStates, next)
        };
      });
    },
    []
  );

  const generateSceneBackground = useCallback(
    async (sessionId: ID, cue: VisualCue, existingBundleId?: ID | null) => {
      const session = state.sessions.find((item) => item.id === sessionId);
      if (!session || !state.settings.image_generation_enabled) return;
      if (!isAllowedImageTrigger("major_event")) return;

      const bundle = getBundle(session.scenario_id);
      if (!bundle) return;

      const sceneKey = cue.sceneKey ?? "default_scene";
      const isEventCg = cue.eventCg;
      const imageKind: GeneratedImage["image_kind"] = isEventCg
        ? "event_cg"
        : cue.updateType === "expression_variant"
          ? "expression_variant"
          : "background";
      const quality: ImageQualityPreset = isEventCg
        ? (state.settings.event_cg_quality || "high")
        : cue.updateType === "expression_variant"
          ? (state.settings.expression_variant_quality || "draft")
          : (state.settings.base_image_quality || "standard");

      const prompt = buildSceneBackgroundPrompt(cue, bundle, state.sessionCharacterStates.filter((s) => s.session_id === sessionId));

      const resolvedBundleId = existingBundleId ?? null;
      const bundleId = resolvedBundleId ?? newId("svbundle");
      const variantId = newId("svvariant");
      const now = nowIso();
      const nsfwEnabled = state.settings.adult_confirmed && state.settings.nsfw_image_enabled && session.nsfw_image_enabled;
      const backend = nsfwEnabled ? state.settings.nsfw_image_backend : state.settings.standard_image_backend;

      // Register bundle if new
      if (!resolvedBundleId) {
        const newBundle: SceneVisualBundle = {
          id: bundleId,
          session_id: sessionId,
          scenario_id: session.scenario_id,
          scene_key: sceneKey,
          location: cue.location ?? "",
          time_of_day: cue.timeOfDay ?? "",
          weather: cue.weather ?? "",
          active_character_ids: bundle.characters.filter((c) => cue.activeCharacters.includes(c.name)).map((c) => c.id),
          base_image_id: null,
          continuity_group_id: newId("cgroup"),
          style_preset: null,
          created_at: now,
          updated_at: now
        };
        setState((current) => ({
          ...current,
          sceneVisualBundles: [...current.sceneVisualBundles, newBundle]
        }));
      }

      // Register variant as pending
      const variantType: VariantType = isEventCg ? "event_cg" : cue.updateType === "expression_variant" ? "expression" : "base";
      const newVariant: SceneVisualVariant = {
        id: variantId,
        bundle_id: bundleId,
        image_id: null,
        variant_type: variantType,
        expression: cue.expression,
        pose: cue.pose,
        emotion_tone: null,
        quality_preset: quality,
        generation_status: "generating",
        created_at: now
      };
      setState((current) => ({
        ...current,
        sceneVisualVariants: [...current.sceneVisualVariants, newVariant]
      }));

      // Mark as generating
      setSceneGeneratingIds((prev) => new Set([...prev, sessionId]));

      try {
        const imageId = newId("img");
        const response = await fetch("/api/images/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            sessionId,
            scenarioId: session.scenario_id,
            triggerType: "major_event",
            adultConfirmed: state.settings.adult_confirmed,
            nsfwImageEnabled: nsfwEnabled,
            isNsfwRequested: false,
            standardImageBackend: state.settings.standard_image_backend,
            nsfwImageBackend: state.settings.nsfw_image_backend,
            standardImageProvider: state.settings.standard_image_provider,
            standardImageModel: state.settings.standard_image_model,
            nsfwImageProvider: state.settings.nsfw_image_provider,
            nsfwImageModel: state.settings.nsfw_image_model,
            quality,
            size: "portrait"
          })
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "背景画像生成に失敗しました。");
        }

        const result = (await response.json()) as {
          jobId: string;
          imageUrl: string;
          promptSummary: string;
          isNsfw: boolean;
          blurByDefault: boolean;
          usage: { backend: string; provider: string; model: string; image_count: number; estimated_cost_jpy: number };
        };

        const { uploadGeneratedImageFromUrl } = await import("@/lib/supabase/storage");
        const stored = await uploadGeneratedImageFromUrl(result.imageUrl, state.userId, sessionId, imageId);
        const image: GeneratedImage = {
          id: imageId,
          user_id: state.userId,
          session_id: sessionId,
          scenario_id: session.scenario_id,
          job_id: result.jobId,
          public_url: stored.public_url,
          thumbnail_url: stored.thumbnail_url,
          storage_path: stored.storage_path,
          is_nsfw: result.isNsfw,
          blur_by_default: false,
          prompt_summary: result.promptSummary,
          image_kind: imageKind,
          scene_key: sceneKey,
          bundle_id: bundleId,
          variant_type: variantType,
          expression: cue.expression,
          quality_preset: quality,
          created_at: nowIso()
        };

        const usageLog: UsageLog = {
          id: newId("usage"),
          user_id: state.userId,
          kind: "image",
          backend: result.usage.backend,
          provider: result.usage.provider,
          model: result.usage.model,
          input_tokens: estimateTokenLikeCount(prompt),
          output_tokens: 0,
          image_count: result.usage.image_count,
          estimated_cost_jpy: result.usage.estimated_cost_jpy,
          quality_preset: quality,
          meta: { imageKind, sceneKey, bundleId, variantType },
          created_at: nowIso()
        };

        setState((current) => ({
          ...current,
          images: [...current.images, image],
          usageLogs: [...current.usageLogs, usageLog],
          sceneVisualBundles: current.sceneVisualBundles.map((b) =>
            b.id === bundleId && variantType === "base"
              ? { ...b, base_image_id: imageId, updated_at: nowIso() }
              : b
          ),
          sceneVisualVariants: current.sceneVisualVariants.map((v) =>
            v.id === variantId
              ? { ...v, image_id: imageId, generation_status: "completed" }
              : v
          )
        }));

        // Update the visual state to show the new image
        updateSceneVisualState(sessionId, imageId, cue);
      } catch (error) {
        console.warn("[SceneBackground] Background image generation failed", error);
        setState((current) => ({
          ...current,
          // 今回の呼び出しで新規作成したバンドルのみ削除（既存バンドルへの更新だった場合は触らない）
          sceneVisualBundles: resolvedBundleId
            ? current.sceneVisualBundles
            : current.sceneVisualBundles.filter((b) => b.id !== bundleId),
          sceneVisualVariants: current.sceneVisualVariants.map((v) =>
            v.id === variantId ? { ...v, generation_status: "failed" } : v
          )
        }));
      } finally {
        setSceneGeneratingIds((prev) => {
          const next = new Set(prev);
          next.delete(sessionId);
          return next;
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getBundle, state, updateSceneVisualState]
  );

  const getSessionBackground = useCallback(
    (sessionId: ID): string | null => {
      const visualState = state.sessionSceneVisualStates.find((s) => s.session_id === sessionId);
      if (!visualState?.current_background_image_id) return null;
      const image = state.images.find((img) => img.id === visualState.current_background_image_id);
      return image?.public_url ?? null;
    },
    [state.sessionSceneVisualStates, state.images]
  );

  const isSceneGenerating = useCallback(
    (sessionId: ID): boolean => sceneGeneratingIds.has(sessionId),
    [sceneGeneratingIds]
  );

  const generateImage = useCallback(
    async (sessionId: ID, prompt: string, triggerType: ImageTriggerType, isNsfwRequested: boolean) => {
      const session = state.sessions.find((item) => item.id === sessionId);
      if (!session) return;
      if (!isAllowedImageTrigger(triggerType)) throw new Error("この画像生成トリガーは許可されていません。");
      if (!state.settings.image_generation_enabled) throw new Error("画像生成がOFFです。");
      if (triggerType === "manual" && !state.settings.allow_manual_image_generation) throw new Error("手動画像生成がOFFです。");

      const jobId = newId("job");
      const eventMessageId = newId("msg");
      const nsfwEnabled = isNsfwRequested && state.settings.adult_confirmed && state.settings.nsfw_image_enabled && session.nsfw_image_enabled;
      const backend = nsfwEnabled ? state.settings.nsfw_image_backend : state.settings.standard_image_backend;
      const now = nowIso();
      const job: ImageGenerationJob = {
        id: jobId,
        user_id: state.userId,
        session_id: sessionId,
        scenario_id: session.scenario_id,
        prompt,
        backend,
        nsfw_enabled: nsfwEnabled,
        trigger_type: triggerType,
        status: "queued",
        estimated_cost_jpy: 0,
        created_at: now,
        updated_at: now
      };
      const eventMessage: Message = {
        id: eventMessageId,
        session_id: sessionId,
        role: "system",
        message_type: "event",
        speaker_type: "system",
        speaker_name: "画像生成ジョブ",
        speaker_avatar_url: null,
        content: `${triggerLabel(triggerType)}の画像生成をキューに追加しました。`,
        metadata: { imageJobId: jobId, triggerType, status: "queued" },
        created_at: now
      };

      setState((current) => ({
        ...current,
        imageJobs: [...current.imageJobs, job],
        messages: [...current.messages, eventMessage]
      }));
      setState((current) => ({
        ...current,
        imageJobs: current.imageJobs.map((item) => item.id === jobId ? { ...item, status: "generating", updated_at: nowIso() } : item),
        messages: current.messages.map((message) =>
          message.id === eventMessageId
            ? { ...message, content: `${triggerLabel(triggerType)}の画像を生成中です。`, metadata: { ...message.metadata, status: "generating" } }
            : message
        )
      }));

      try {
        const response = await fetch("/api/images/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            sessionId,
            scenarioId: session.scenario_id,
            triggerType,
            adultConfirmed: state.settings.adult_confirmed,
            nsfwImageEnabled: state.settings.nsfw_image_enabled && session.nsfw_image_enabled,
            isNsfwRequested,
            standardImageBackend: state.settings.standard_image_backend,
            nsfwImageBackend: state.settings.nsfw_image_backend,
            standardImageProvider: state.settings.standard_image_provider,
            standardImageModel: state.settings.standard_image_model,
            nsfwImageProvider: state.settings.nsfw_image_provider,
            nsfwImageModel: state.settings.nsfw_image_model,
            quality: state.settings.image_quality,
            size: state.settings.image_size
          })
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "画像生成に失敗しました。");
        }

        const result = (await response.json()) as {
          jobId: string;
          imageUrl: string;
          promptSummary: string;
          isNsfw: boolean;
          blurByDefault: boolean;
          usage: { backend: string; provider: string; model: string; image_count: number; estimated_cost_jpy: number };
        };
        const imageId = newId("img");
        const stored = await uploadGeneratedImageFromUrl(result.imageUrl, state.userId, sessionId, imageId);
        const image: GeneratedImage = {
          id: imageId,
          user_id: state.userId,
          session_id: sessionId,
          scenario_id: session.scenario_id,
          job_id: jobId,
          public_url: stored.public_url,
          thumbnail_url: stored.thumbnail_url,
          storage_path: stored.storage_path,
          is_nsfw: result.isNsfw,
          blur_by_default: result.blurByDefault && state.settings.blur_nsfw_images,
          prompt_summary: result.promptSummary,
          created_at: nowIso()
        };
        const imageMessage: Message = {
          id: newId("msg"),
          session_id: sessionId,
          role: "assistant",
          message_type: "image",
          speaker_type: "system",
          speaker_name: "イベント画像",
          speaker_avatar_url: null,
          content: result.promptSummary,
          metadata: { imageId: image.id, imageJobId: jobId, triggerType },
          created_at: nowIso()
        };
        const usage: UsageLog = {
          id: newId("usage"),
          user_id: state.userId,
          kind: "image",
          backend: result.usage.backend,
          provider: result.usage.provider,
          model: result.usage.model,
          input_tokens: estimateTokenLikeCount(prompt),
          output_tokens: 0,
          image_count: result.usage.image_count,
          estimated_cost_jpy: result.usage.estimated_cost_jpy,
          meta: { triggerType, isNsfwRequested, backendJobId: result.jobId },
          created_at: nowIso()
        };

        setState((current) => ({
          ...current,
          imageJobs: current.imageJobs.map((item) =>
            item.id === jobId
              ? { ...item, status: "completed", backend: result.usage.backend, estimated_cost_jpy: result.usage.estimated_cost_jpy, updated_at: nowIso() }
              : item
          ),
          images: [...current.images, image],
          messages: [
            ...current.messages.map((message) =>
              message.id === eventMessageId
                ? { ...message, content: `${triggerLabel(triggerType)}の画像生成が完了しました。`, metadata: { ...message.metadata, status: "completed", imageId: image.id } }
                : message
            ),
            imageMessage
          ],
          usageLogs: [...current.usageLogs, usage]
        }));
      } catch (error) {
        setState((current) => ({
          ...current,
          imageJobs: current.imageJobs.map((item) => item.id === jobId ? { ...item, status: "failed", updated_at: nowIso() } : item),
          messages: current.messages.map((message) =>
            message.id === eventMessageId
              ? {
                  ...message,
                  content: error instanceof Error ? `画像生成に失敗しました: ${error.message}` : "画像生成に失敗しました。",
                  metadata: { ...message.metadata, status: "failed" }
                }
              : message
          )
        }));
        throw error;
      }
    },
    [state]
  );

  const generateVoice = useCallback(
    async (sessionId: ID, messageId: ID, characterId: ID | null, content: string) => {
      const session = state.sessions.find((item) => item.id === sessionId);
      if (!session || !state.settings.voice_enabled) return;

      // 同一メッセージの音声が既に生成済み・生成中の場合はスキップ（重複生成防止）
      const existingJob = state.voiceJobs.find(
        (job) => job.message_id === messageId && (job.status === "completed" || job.status === "generating")
      );
      if (existingJob) return;

      // 音声月間予算チェック: voice_budget_jpy が設定されている場合、超過時は生成しない
      const voiceBudgetJpy = state.settings.voice_budget_jpy ?? 0;
      if (voiceBudgetJpy > 0) {
        const voiceSpentJpy = state.usageLogs
          .filter((l) => l.kind === "voice")
          .reduce((sum, l) => sum + l.estimated_cost_jpy, 0);
        if (voiceSpentJpy >= voiceBudgetJpy) {
          console.warn("[Voice] Monthly voice budget exceeded. Skipping generation.");
          return;
        }
      }

      const character = characterId ? state.characters.find((item) => item.id === characterId) : null;
      const provider = character?.voice_provider || state.settings.voice_provider || "mock";
      const voiceId = character?.voice_id ?? undefined;
      const voiceModel = character?.voice_model ?? undefined;
      const speed = character?.voice_speed ?? undefined;
      const pitch = character?.voice_pitch ?? undefined;
      const text = extractVoiceText(content);
      if (!text.trim()) return;

      const jobId = newId("voice");
      const now = nowIso();
      const job: VoiceGenerationJob = {
        id: jobId,
        user_id: state.userId,
        session_id: sessionId,
        message_id: messageId,
        character_id: characterId,
        text,
        voice_provider: provider,
        voice_id: voiceId ?? null,
        voice_model: voiceModel ?? null,
        status: "queued",
        audio_data_uri: null,
        duration_ms: null,
        estimated_cost_jpy: 0,
        error: null,
        created_at: now,
        updated_at: now
      };

      setState((current) => ({ ...current, voiceJobs: [...current.voiceJobs, job] }));

      try {
        setState((current) => ({
          ...current,
          voiceJobs: current.voiceJobs.map((item) =>
            item.id === jobId ? { ...item, status: "generating", updated_at: nowIso() } : item
          )
        }));

        const response = await fetch("/api/voice/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, provider, voiceId, model: voiceModel, speed, pitch })
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? "音声生成に失敗しました。");
        }

        const result = (await response.json()) as {
          audioDataUri?: string | null;
          audioUrl?: string | null;
          durationMs: number;
          estimatedCostJpy: number;
          provider: string;
          model: string;
        };

        const voiceUsageLog: UsageLog = {
          id: newId("usage"),
          user_id: state.userId,
          kind: "voice",
          backend: `voice:${result.provider}:${result.model}`,
          provider: result.provider,
          model: result.model,
          input_tokens: 0,
          output_tokens: 0,
          latency_ms: null,
          image_count: 0,
          estimated_cost_jpy: result.estimatedCostJpy,
          prompt_chars: text.length,
          meta: { durationMs: result.durationMs },
          created_at: nowIso()
        };
        // Storage への非同期保存（失敗してもプレイに影響しない）
        const audioUri = result.audioDataUri ?? null;
        let storagePath: string | null = null;
        let publicUrl: string | null = null;
        if (audioUri) {
          try {
            const uploaded = await uploadVoiceAudio(audioUri, state.userId, sessionId, jobId);
            storagePath = uploaded.storage_path;
            publicUrl = uploaded.public_url;
          } catch {
            // Storage が使えない場合は data URI のまま保持
          }
        }

        setState((current) => ({
          ...current,
          voiceJobs: current.voiceJobs.map((item) =>
            item.id === jobId
              ? {
                  ...item,
                  status: "completed",
                  audio_data_uri: audioUri,
                  storage_path: storagePath,
                  public_url: publicUrl,
                  duration_ms: result.durationMs,
                  estimated_cost_jpy: result.estimatedCostJpy,
                  voice_provider: result.provider,
                  voice_model: result.model,
                  updated_at: nowIso()
                }
              : item
          ),
          usageLogs: [...current.usageLogs, voiceUsageLog]
        }));

        // generated_audio テーブルにキャッシュレコードを保存（失敗しても続行）
        saveGeneratedAudio({
          id: jobId,
          userId: state.userId,
          sessionId,
          messageId,
          characterId: characterId ?? null,
          provider: result.provider,
          model: result.model,
          voiceId: voiceId ?? null,
          audioDataUri: audioUri,
          storagePath,
          publicUrl,
          durationMs: result.durationMs
        }).catch(() => {/* migration 未適用時は無視 */});
      } catch (error) {
        setState((current) => ({
          ...current,
          voiceJobs: current.voiceJobs.map((item) =>
            item.id === jobId
              ? {
                  ...item,
                  status: "failed",
                  error: error instanceof Error ? error.message : "音声生成に失敗しました。",
                  updated_at: nowIso()
                }
              : item
          )
        }));
      }
    },
    [state.sessions, state.characters, state.settings.voice_enabled, state.settings.voice_provider, state.userId]
  );

  const approveMemoryCandidate = useCallback((candidateId: ID) => {
    setState((current) => {
      const candidate = current.memoryCandidates.find((item) => item.id === candidateId);
      if (!candidate || candidate.status !== "pending") return current;
      const memory: Memory = {
        id: newId("mem"),
        user_id: candidate.user_id,
        scenario_id: candidate.scenario_id,
        character_id: candidate.character_id,
        session_id: candidate.session_id,
        source_message_id: candidate.source_message_id,
        type: candidate.type,
        content: candidate.content,
        importance: candidate.importance,
        sensitivity: candidate.sensitivity,
        include_in_prompt: true,
        created_at: nowIso(),
        updated_at: nowIso()
      };
      return {
        ...current,
        memories: [...current.memories, memory],
        memoryCandidates: current.memoryCandidates.map((item) =>
          item.id === candidateId ? { ...item, status: "approved", updated_at: nowIso() } : item
        )
      };
    });
  }, []);

  const rejectMemoryCandidate = useCallback((candidateId: ID) => {
    setState((current) => ({
      ...current,
      memoryCandidates: current.memoryCandidates.map((item) =>
        item.id === candidateId ? { ...item, status: "rejected", updated_at: nowIso() } : item
      )
    }));
  }, []);

  const updateMemory = useCallback((memoryId: ID, patch: Partial<Memory>) => {
    setState((current) => ({
      ...current,
      memories: current.memories.map((memory) => (memory.id === memoryId ? { ...memory, ...patch, updated_at: nowIso() } : memory))
    }));
  }, []);

  const deleteMemory = useCallback((memoryId: ID) => {
    setState((current) => ({
      ...current,
      memories: current.memories.filter((memory) => memory.id !== memoryId)
    }));
  }, []);

  const resetLocalState = useCallback(() => {
    const fresh = createSampleState();
    setState(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  const resetChoicePreferences = useCallback(() => {
    setState((current) => ({ ...current, choiceEvents: [], choicePreferences: null, scenarioChoicePreferences: {} }));
  }, []);

  const listLorebooks = useCallback(() => {
    return state.lorebooks ?? [];
  }, [state.lorebooks]);

  const createLorebook = useCallback(() => {
    const now = nowIso();
    const id = newId("lore");
    const lorebook: import("@/lib/domain/types").Lorebook = {
      id,
      user_id: state.userId,
      title: "新しいロアブック",
      short_description: "",
      cover_image_url: null,
      visibility: "private",
      entries: [],
      created_at: now,
      updated_at: now
    };
    setState((current) => ({ ...current, lorebooks: [...(current.lorebooks ?? []), lorebook] }));
    return id;
  }, [state.userId]);

  const saveLorebook = useCallback((lorebook: import("@/lib/domain/types").Lorebook) => {
    const now = nowIso();
    setState((current) => {
      const existing = current.lorebooks ?? [];
      const index = existing.findIndex((item) => item.id === lorebook.id);
      const updated = { ...lorebook, updated_at: now };
      const next = index === -1 ? [...existing, updated] : existing.map((item) => (item.id === lorebook.id ? updated : item));
      return { ...current, lorebooks: next };
    });
  }, []);

  const deleteLorebook = useCallback((id: ID) => {
    setState((current) => ({
      ...current,
      lorebooks: (current.lorebooks ?? []).filter((item) => item.id !== id),
      lorebookLinks: (current.lorebookLinks ?? []).filter((item) => item.lorebook_id !== id)
    }));
  }, []);

  const addLorebookLink = useCallback((plotId: ID, lorebookId: ID) => {
    setState((current) => {
      const links = current.lorebookLinks ?? [];
      if (links.some((item) => item.plot_id === plotId && item.lorebook_id === lorebookId)) return current;
      const link: import("@/lib/domain/types").PlotLorebookLink = {
        id: newId("link"),
        plot_id: plotId,
        lorebook_id: lorebookId,
        enabled: true,
        priority: links.filter((item) => item.plot_id === plotId).length,
        created_at: nowIso()
      };
      return { ...current, lorebookLinks: [...links, link] };
    });
  }, []);

  const removeLorebookLink = useCallback((linkId: ID) => {
    setState((current) => ({
      ...current,
      lorebookLinks: (current.lorebookLinks ?? []).filter((item) => item.id !== linkId)
    }));
  }, []);

  const toggleLorebookLink = useCallback((linkId: ID, enabled: boolean) => {
    setState((current) => ({
      ...current,
      lorebookLinks: (current.lorebookLinks ?? []).map((item) => (item.id === linkId ? { ...item, enabled } : item))
    }));
  }, []);

  const value = useMemo<AppStoreValue>(
    () => ({
      state,
      hydrated,
      remote,
      remoteSaving,
      updateSettings,
      signInRemoteAnonymously,
      signInRemoteWithEmail,
      signOutRemote,
      syncRemoteNow,
      createScenario,
      saveBundle,
      getBundle,
      startOrResumeScenario,
      toggleScenarioBookmark,
      sendTurn,
      continueAutoTurn,
      skipCurrentTurn,
      setSessionPlayPaceMode,
      generateImage,
      generateSceneBackground,
      generateVoice,
      currentSmartReplies,
      currentContinueSuggestion,
      currentCharacterControl,
      sendSilentContinue,
      getSessionBackground,
      isSceneGenerating,
      approveMemoryCandidate,
      rejectMemoryCandidate,
      updateMemory,
      deleteMemory,
      resetLocalState,
      resetChoicePreferences,
      listLorebooks,
      createLorebook,
      saveLorebook,
      deleteLorebook,
      addLorebookLink,
      removeLorebookLink,
      toggleLorebookLink
    }),
    [
      approveMemoryCandidate,
      createScenario,
      currentSmartReplies,
      currentContinueSuggestion,
      currentCharacterControl,
      deleteMemory,
      continueAutoTurn,
      generateImage,
      generateSceneBackground,
      generateVoice,
      getBundle,
      getSessionBackground,
      isSceneGenerating,
      hydrated,
      rejectMemoryCandidate,
      resetChoicePreferences,
      resetLocalState,
      remote,
      remoteSaving,
      saveBundle,
      sendSilentContinue,
      sendTurn,
      setSessionPlayPaceMode,
      skipCurrentTurn,
      signInRemoteAnonymously,
      signInRemoteWithEmail,
      signOutRemote,
      startOrResumeScenario,
      toggleScenarioBookmark,
      state,
      syncRemoteNow,
      updateMemory,
      updateSettings,
      listLorebooks,
      createLorebook,
      saveLorebook,
      deleteLorebook,
      addLorebookLink,
      removeLorebookLink,
      toggleLorebookLink
    ]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore() {
  const value = useContext(AppStoreContext);
  if (!value) throw new Error("useAppStore must be used inside AppStoreProvider");
  return value;
}

function normalizeState(state: AppState): AppState {
  const fresh = createSampleState(state.userId);
  const scenarios = mergeSeededById(fresh.scenarios, state.scenarios ?? []);
  const styles = mergeSeededById(fresh.styles, state.styles ?? []);
  const storyScenes = mergeSeededById(fresh.storyScenes, state.storyScenes ?? []);
  const foreshadowingItems = mergeSeededById(fresh.foreshadowingItems, state.foreshadowingItems ?? []);
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    ...state.settings,
    streaming_display_enabled: state.settings?.streaming_display_enabled ?? state.settings?.timeline_reveal_enabled ?? DEFAULT_SETTINGS.streaming_display_enabled,
    typewriter_enabled: state.settings?.typewriter_enabled ?? state.settings?.timeline_reveal_enabled ?? DEFAULT_SETTINGS.typewriter_enabled,
    typewriter_speed: state.settings?.typewriter_speed ?? state.settings?.timeline_reveal_speed ?? DEFAULT_SETTINGS.typewriter_speed
  };
  return {
    ...fresh,
    ...state,
    scenarios: scenarios.map((scenario) => ({
      ...scenario,
      cover_image_url: scenario.cover_image_url ?? null,
      genre: scenario.genre ?? "",
      content_warnings: scenario.content_warnings ?? "",
      estimated_play_time: scenario.estimated_play_time ?? "",
      recommended_tone: scenario.recommended_tone ?? ""
    })),
    bookmarkedScenarioIds: state.bookmarkedScenarioIds ?? [],
    characters: mergeSeededById(fresh.characters, state.characters ?? []),
    userProfiles: mergeSeededById(fresh.userProfiles, state.userProfiles ?? []),
    lorebook: mergeSeededById(fresh.lorebook, state.lorebook ?? []),
    intros: mergeSeededById(fresh.intros, state.intros ?? []),
    lorebooks: state.lorebooks ?? [],
    lorebookLinks: state.lorebookLinks ?? [],
    styles: styles.map((style) => ({
      ...style,
      play_pace_mode: isPlayPaceMode(style.play_pace_mode) ? style.play_pace_mode : "normal",
      auto_advance_message_count: clamp(Number(style.auto_advance_message_count ?? 3), 1, 3),
      choice_frequency: style.choice_frequency === "high" ? "high" : "normal",
      allow_continue_button: style.allow_continue_button ?? true,
      mode_optimization: (["none", "girlfriend", "story"] as const).includes(style.mode_optimization as "none") ? style.mode_optimization : "none"
    })),
    sessions: (state.sessions ?? []).map((session) => ({
      ...session,
      play_pace_mode: isPlayPaceMode(session.play_pace_mode) ? session.play_pace_mode : "normal",
      auto_continue_count: clamp(Number(session.auto_continue_count ?? 0), 0, 3),
      needs_user_input: session.needs_user_input ?? true,
      auto_continue_allowed: session.auto_continue_allowed ?? false,
      current_beat_index: Math.max(0, Number(session.current_beat_index ?? 0)),
      scene_turn_count: Math.max(0, Number(session.scene_turn_count ?? 0)),
      stall_count: Math.max(0, Number(session.stall_count ?? 0)),
      last_conflict: session.last_conflict ?? "",
      last_hook: session.last_hook ?? "",
      objective_completed: session.objective_completed ?? false,
      last_director_reason: session.last_director_reason ?? null,
      last_quality_score: session.last_quality_score ?? null,
      quality_stall_count: Math.max(0, Number(session.quality_stall_count ?? 0)),
      last_quality_problem: session.last_quality_problem ?? null,
      last_improvement_hint: session.last_improvement_hint ?? null
    })),
    storyScenes,
    foreshadowingItems: foreshadowingItems.map((item) => ({
      ...item,
      reveal_condition_json: item.reveal_condition_json ?? {},
      status: item.status ?? "planned",
      visibility: item.visibility ?? "hidden_to_user",
      reveal_readiness: resolveRevealReadiness(item.status ?? "planned", Math.max(0, Number(item.turns_since_introduced ?? 0))),
      reinforcement_count: Math.max(0, Number(item.reinforcement_count ?? 0)),
      turns_since_introduced: Math.max(0, Number(item.turns_since_introduced ?? 0)),
      overdue_score: Math.max(0, Number(item.overdue_score ?? 0))
    })),
    storySummaries: (state.storySummaries ?? []).map((summary) => ({
      ...summary,
      start_turn_index: Math.max(1, Number(summary.start_turn_index ?? 1)),
      end_turn_index: Math.max(1, Number(summary.end_turn_index ?? summary.start_turn_index ?? 1)),
      updated_at: summary.updated_at ?? summary.created_at ?? nowIso()
    })),
    narrativeQualityLogs: state.narrativeQualityLogs ?? [],
    sessionEnvironmentStates: (state.sessionEnvironmentStates ?? []).map((item) => ({
      ...item,
      date: item.date ?? "",
      time: item.time ?? "",
      location: item.location ?? "",
      weather: item.weather ?? "",
      scene: item.scene ?? "",
      current_objective: item.current_objective ?? "",
      recent_event: item.recent_event ?? "",
      next_pressure: item.next_pressure ?? "",
      chapter: item.chapter ?? "",
      scene_key: item.scene_key ?? "",
      updated_at: item.updated_at ?? item.created_at ?? nowIso()
    })),
    sessionCharacterStates: (state.sessionCharacterStates ?? []).map((item) => ({
      ...item,
      mood: item.mood ?? "",
      condition: item.condition ?? "",
      outfit: item.outfit ?? "",
      pose: item.pose ?? "",
      goal: item.goal ?? "",
      relationship: item.relationship ?? "",
      inner_thoughts: item.inner_thoughts ?? "",
      inventory: item.inventory ?? "",
      hidden_intent: item.hidden_intent ?? "",
      last_action: item.last_action ?? "",
      updated_at: item.updated_at ?? item.created_at ?? nowIso()
    })),
    imageJobs: state.imageJobs ?? [],
    images: state.images ?? [],
    voiceJobs: state.voiceJobs ?? [],
    settings,
    choiceEvents: state.choiceEvents ?? [],
    choicePreferences: state.choicePreferences ?? null,
    scenarioChoicePreferences: state.scenarioChoicePreferences ?? {},
    sceneVisualBundles: state.sceneVisualBundles ?? [],
    sceneVisualVariants: state.sceneVisualVariants ?? [],
    sessionSceneVisualStates: state.sessionSceneVisualStates ?? [],
    usageLogs: (state.usageLogs ?? []).map((usage) => ({
      ...usage,
      provider: usage.provider ?? usage.backend.split(":")[0] ?? usage.backend,
      model: usage.model ?? (usage.backend.includes(":") ? usage.backend.split(":").slice(1).join(":") : usage.backend),
      latency_ms: usage.latency_ms ?? (typeof usage.meta?.latency_ms === "number" ? usage.meta.latency_ms : null),
      image_count: usage.image_count ?? (usage.kind === "image" ? 1 : 0)
    }))
  };
}

function mergeLocalOnlyState(remoteState: AppState): AppState {
  return {
    ...remoteState,
    bookmarkedScenarioIds: Array.from(new Set([
      ...(remoteState.bookmarkedScenarioIds ?? []),
      ...readLocalBookmarkedScenarioIds()
    ]))
  };
}

function readLocalBookmarkedScenarioIds() {
  if (typeof localStorage === "undefined") return [] as ID[];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [] as ID[];
    const parsed = JSON.parse(stored) as Partial<AppState>;
    return Array.isArray(parsed.bookmarkedScenarioIds) ? parsed.bookmarkedScenarioIds.filter((id): id is ID => typeof id === "string") : [];
  } catch {
    return [] as ID[];
  }
}

function mergeSeededById<T extends { id: string }>(seedItems: T[], stateItems: T[]) {
  const existing = new Set(stateItems.map((item) => item.id));
  return [...stateItems, ...seedItems.filter((item) => !existing.has(item.id))];
}

function upsertById<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) return [...items, item];
  return items.map((candidate) => (candidate.id === item.id ? item : candidate));
}

function createRelationship(userId: ID, scenarioId: ID, characterId: ID): RelationshipState {
  return {
    id: newId("rel"),
    user_id: userId,
    scenario_id: scenarioId,
    character_id: characterId,
    ...DEFAULT_RELATIONSHIP,
    relationship_label: "初対面",
    updated_at: nowIso()
  };
}

function createEnvironmentState(userId: ID, session: PlaySession, bundle: StoryBundle, now: string): SessionEnvironmentState {
  return {
    id: newId("env"),
    user_id: userId,
    scenario_id: session.scenario_id,
    session_id: session.id,
    date: "",
    time: "",
    location: bundle.intro.start_location ?? "",
    weather: "",
    scene: bundle.intro.start_situation || bundle.scenario.situation || "",
    current_objective: session.scene_objective || bundle.scenario.objective || "",
    recent_event: "",
    next_pressure: "",
    chapter: `第${session.chapter_index}章`,
    scene_key: session.current_scene_key,
    created_at: now,
    updated_at: now
  };
}

function createCharacterState(
  userId: ID,
  session: PlaySession,
  characterId: ID,
  character: StoryBundle["characters"][number] | undefined,
  now: string
): SessionCharacterState {
  return {
    id: newId("cstate"),
    user_id: userId,
    scenario_id: session.scenario_id,
    session_id: session.id,
    character_id: characterId,
    mood: "",
    condition: "",
    outfit: character?.appearance ?? "",
    pose: "",
    goal: "",
    relationship: "初対面",
    inner_thoughts: "",
    inventory: "",
    hidden_intent: "",
    last_action: "",
    created_at: now,
    updated_at: now
  };
}

function syncEnvironmentState(
  environmentStates: SessionEnvironmentState[],
  session: PlaySession,
  bundle: StoryBundle,
  userId: ID
) {
  const now = nowIso();
  const existing = environmentStates.find((item) => item.session_id === session.id);
  const base = existing ?? createEnvironmentState(userId, session, bundle, now);
  const patched: SessionEnvironmentState = {
    ...base,
    chapter: `第${session.chapter_index}章`,
    scene_key: session.current_scene_key,
    current_objective: session.scene_objective || bundle.scenario.objective || base.current_objective,
    updated_at: now
  };
  return upsertById(environmentStates, patched);
}

function applyInfoBoxUpdate(
  environmentStates: SessionEnvironmentState[],
  characterStates: SessionCharacterState[],
  update: BackgroundJobsResponse["infoboxUpdate"] | undefined,
  session: PlaySession,
  bundle: StoryBundle,
  userId: ID
) {
  if (!update) return { environmentStates, characterStates };

  const now = nowIso();
  let nextEnvironmentStates = environmentStates;
  if (update.environment && Object.keys(update.environment).length > 0) {
    const existing = environmentStates.find((item) => item.session_id === session.id);
    const base = existing ?? createEnvironmentState(userId, session, bundle, now);
    const merged = mergeEnvironmentUpdate(base, update.environment);
    nextEnvironmentStates = upsertById(environmentStates, { ...merged, updated_at: now });
  }

  let nextCharacterStates = characterStates;
  if (update.characterStates && update.characterStates.length > 0) {
    let working = [...characterStates];
    update.characterStates.forEach((entry) => {
      if (!entry.characterId) return;
      const existing = working.find((item) => item.session_id === session.id && item.character_id === entry.characterId);
      const character = bundle.characters.find((item) => item.id === entry.characterId);
      const base = existing ?? createCharacterState(userId, session, entry.characterId, character, now);
      const merged = mergeCharacterUpdate(base, entry.updates ?? {});
      working = upsertById(working, { ...merged, updated_at: now });
    });
    nextCharacterStates = working;
  }

  return { environmentStates: nextEnvironmentStates, characterStates: nextCharacterStates };
}

function mergeEnvironmentUpdate(
  base: SessionEnvironmentState,
  updates: Partial<Record<
    "date" | "time" | "location" | "weather" | "scene" | "current_objective" | "recent_event" | "next_pressure" | "chapter" | "scene_key",
    string | null
  >>
): SessionEnvironmentState {
  return {
    ...base,
    date: applyTextUpdate(base.date, updates.date),
    time: applyTextUpdate(base.time, updates.time),
    location: applyTextUpdate(base.location, updates.location),
    weather: applyTextUpdate(base.weather, updates.weather),
    scene: applyTextUpdate(base.scene, updates.scene),
    current_objective: applyTextUpdate(base.current_objective, updates.current_objective),
    recent_event: applyTextUpdate(base.recent_event, updates.recent_event),
    next_pressure: applyTextUpdate(base.next_pressure, updates.next_pressure),
    chapter: applyTextUpdate(base.chapter, updates.chapter),
    scene_key: applyTextUpdate(base.scene_key, updates.scene_key)
  };
}

function mergeCharacterUpdate(
  base: SessionCharacterState,
  updates: Partial<Record<
    "mood" | "condition" | "outfit" | "pose" | "goal" | "relationship" | "inner_thoughts" | "inventory" | "hidden_intent" | "last_action",
    string | null
  >>
): SessionCharacterState {
  return {
    ...base,
    mood: applyTextUpdate(base.mood, updates.mood),
    condition: applyTextUpdate(base.condition, updates.condition),
    outfit: applyTextUpdate(base.outfit, updates.outfit),
    pose: applyTextUpdate(base.pose, updates.pose),
    goal: applyTextUpdate(base.goal, updates.goal),
    relationship: applyTextUpdate(base.relationship, updates.relationship),
    inner_thoughts: applyTextUpdate(base.inner_thoughts, updates.inner_thoughts),
    inventory: applyTextUpdate(base.inventory, updates.inventory),
    hidden_intent: applyTextUpdate(base.hidden_intent, updates.hidden_intent),
    last_action: applyTextUpdate(base.last_action, updates.last_action)
  };
}

function applyTextUpdate(current: string, next: unknown) {
  if (typeof next === "string") return next;
  if (next === null) return "";
  return current;
}

function ensureRelationships(relationships: RelationshipState[], userId: ID, scenarioId: ID, characterIds: ID[]) {
  const next = [...relationships];
  characterIds.forEach((characterId) => {
    if (!next.some((item) => item.scenario_id === scenarioId && item.character_id === characterId)) {
      next.push(createRelationship(userId, scenarioId, characterId));
    }
  });
  return next;
}

function applyRelationshipDelta(
  relationships: RelationshipState[],
  scenarioId: ID,
  characterId: ID | undefined,
  delta: RelationshipValues
) {
  if (!characterId) return relationships;
  return relationships.map((relationship) => {
    if (relationship.scenario_id !== scenarioId || relationship.character_id !== characterId) return relationship;
    const next = {
      ...relationship,
      trust: clamp(relationship.trust + delta.trust, -20, 50),
      affection: clamp(relationship.affection + delta.affection, -20, 50),
      comfort: clamp(relationship.comfort + delta.comfort, -20, 50),
      curiosity: clamp(relationship.curiosity + delta.curiosity, -20, 50),
      tension: clamp(relationship.tension + delta.tension, -20, 50),
      updated_at: nowIso()
    };
    return { ...next, relationship_label: relationshipLabel(next) };
  });
}

function relationshipLabel(values: RelationshipValues) {
  const score = values.trust + values.affection + values.comfort + values.curiosity - Math.max(0, values.tension);
  return [...RELATIONSHIP_LABELS].reverse().find((item) => score >= item.min)?.label ?? "初対面";
}

function mergeDelta(aiDelta: RelationshipValues, choiceDelta?: Partial<RelationshipValues>) {
  return {
    trust: aiDelta.trust + (choiceDelta?.trust ?? 0),
    affection: aiDelta.affection + (choiceDelta?.affection ?? 0),
    comfort: aiDelta.comfort + (choiceDelta?.comfort ?? 0),
    curiosity: aiDelta.curiosity + (choiceDelta?.curiosity ?? 0),
    tension: aiDelta.tension + (choiceDelta?.tension ?? 0)
  };
}

async function displayMessagesSequentially(
  messages: Message[],
  control: TurnControl,
  options: TypewriterRevealOptions,
  updateMessages: (updater: (messages: Message[]) => Message[]) => void
): Promise<TypewriterRevealResult> {
  const startedAt = performance.now();
  let skipped = false;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (control.skipRequested) {
      skipped = true;
      updateMessages((current) => [...current, ...messages.slice(index)]);
      break;
    }

    if (!shouldTypewriterReveal(message) || !message.content || options.intervalMs <= 0) {
      updateMessages((current) => [...current, message]);
      continue;
    }

    updateMessages((current) => [...current, { ...message, content: "" }]);

    let cursor = 0;
    while (cursor < message.content.length) {
      await waitForTurnDelay(options.intervalMs, control);
      if (control.skipRequested) {
        skipped = true;
        updateMessages((current) => [
          ...replaceMessageById(current, message),
          ...messages.slice(index + 1)
        ]);
        return {
          skipped,
          totalRevealTimeMs: Math.round(performance.now() - startedAt)
        };
      }

      cursor = Math.min(message.content.length, cursor + options.chunkSize);
      const partialMessage = { ...message, content: message.content.slice(0, cursor) };
      updateMessages((current) => replaceMessageById(current, partialMessage));
    }

    updateMessages((current) => replaceMessageById(current, message));
  }
  return {
    skipped,
    totalRevealTimeMs: Math.round(performance.now() - startedAt)
  };
}

function shouldTypewriterReveal(message: Message) {
  if (message.role === "user" && !message.metadata?.aiGeneratedUser) return false;
  return ["narration", "character", "event", "system", "user"].includes(message.message_type);
}

function replaceMessageById(messages: Message[], nextMessage: Message) {
  return messages.map((message) => (message.id === nextMessage.id ? nextMessage : message));
}

function getTypewriterRevealOptions(settings: AppSettings): TypewriterRevealOptions {
  if (!settings.timeline_reveal_enabled) return { intervalMs: 0, chunkSize: Number.MAX_SAFE_INTEGER };
  if (settings.streaming_display_enabled === false) return { intervalMs: 0, chunkSize: Number.MAX_SAFE_INTEGER };
  if (settings.typewriter_enabled === false) return { intervalMs: 0, chunkSize: Number.MAX_SAFE_INTEGER };
  const speed = settings.typewriter_speed ?? settings.timeline_reveal_speed ?? "normal";
  if (speed === "instant") return { intervalMs: 0, chunkSize: Number.MAX_SAFE_INTEGER };
  if (speed === "fast") return { intervalMs: 12, chunkSize: 3 };
  if (speed === "slow") return { intervalMs: 48, chunkSize: 1 };
  return { intervalMs: 24, chunkSize: 2 };
}

function waitForTurnDelay(ms: number, control: TurnControl) {
  if (control.skipRequested || ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      if (control.resolveDelay === done) control.resolveDelay = null;
      resolve();
    }
    control.resolveDelay = done;
  });
}

function aiResponseToMessages(
  response: ConversationResponse,
  sessionId: ID,
  characters: Array<{ id: ID; name: string; avatar_url?: string | null }>,
  userProfile?: { id: ID; display_name: string; avatar_url?: string | null } | null,
  options: { allowAiGeneratedUser?: boolean } = {}
) {
  const now = nowIso();
  const messages: Message[] = [];
  const timeline = response.timeline?.length
    ? response.timeline
    : [
        ...(response.narration
          ? [{ type: "narration" as const, characterName: null, content: response.narration }]
          : []),
        ...response.characterMessages.map((item) => ({
          type: "character" as const,
          characterName: item.characterName,
          content: item.content
        }))
      ];

  timeline.forEach((item) => {
    if (!options.allowAiGeneratedUser && isGeneratedUserTimelineItem(item, userProfile)) return;
    messages.push(timelineItemToMessage(item, sessionId, characters, userProfile, response.imageCue, now));
  });
  if (response.imageCue.shouldSuggestImage) {
    messages.push({
      id: newId("msg"),
      session_id: sessionId,
      role: "system",
      message_type: "event",
      speaker_type: "system",
      speaker_name: "画像候補",
      speaker_avatar_url: null,
      content: response.imageCue.reason ?? "この場面を画像化できます。",
      metadata: { imageCue: response.imageCue },
      created_at: nowIso()
    });
  }
  return messages;
}

function timelineItemToMessage(
  item: TimelineItem,
  sessionId: ID,
  characters: Array<{ id: ID; name: string; avatar_url?: string | null }>,
  userProfile?: { id: ID; display_name: string; avatar_url?: string | null } | null,
  metadata: Record<string, unknown> = {},
  createdAt = nowIso()
): Message {
  if (item.type === "narration") {
    return {
      id: newId("msg"),
      session_id: sessionId,
      role: "assistant",
      message_type: "narration",
      speaker_type: "narrator",
      speaker_name: "ナレーション",
      speaker_avatar_url: null,
      content: item.content,
      metadata,
      created_at: createdAt
    };
  }

  if (item.type === "system" || item.type === "event") {
    return {
      id: newId("msg"),
      session_id: sessionId,
      role: "system",
      message_type: item.type,
      speaker_type: "system",
      speaker_name: item.type === "event" ? "イベント" : "システム",
      speaker_avatar_url: null,
      content: item.content,
      metadata,
      created_at: createdAt
    };
  }

  if (isGeneratedUserTimelineItem(item, userProfile)) {
    return {
      id: newId("msg"),
      session_id: sessionId,
      role: "assistant",
      message_type: "user",
      speaker_type: "user",
      speaker_id: userProfile?.id ?? null,
      speaker_name: userProfile?.display_name ?? "あなた",
      speaker_avatar_url: userProfile?.avatar_url ?? null,
      content: item.content,
      metadata: { ...metadata, aiGeneratedUser: true },
      created_at: createdAt
    };
  }

  const character = characters.find((candidate) => candidate.name === item.characterName);
  return {
    id: newId("msg"),
    session_id: sessionId,
    role: "assistant",
    message_type: "character",
    speaker_type: "character",
    speaker_id: character?.id ?? null,
    speaker_name: character?.name ?? item.characterName ?? "語り手",
    speaker_avatar_url: character?.avatar_url ?? null,
    content: item.content,
    metadata,
    created_at: createdAt
  };
}

function isGeneratedUserTimelineItem(item: TimelineItem, userProfile?: { display_name: string } | null) {
  const name = item.characterName?.trim();
  if (!name) return false;
  const userNames = new Set(["{{user}}", "{user}", "user", "ユーザー", "あなた", userProfile?.display_name ?? ""].filter(Boolean));
  return userNames.has(name);
}

function qualityLogFromConversation(sessionId: ID, response: ConversationResponse, messageId: ID | null): NarrativeQualityLog {
  return qualityLogFromQualityCheck(sessionId, response.qualityCheck, messageId);
}

function qualityLogFromQualityCheck(sessionId: ID, quality: QualityCheck, messageId: ID | null): NarrativeQualityLog {
  return {
    id: newId("quality"),
    session_id: sessionId,
    message_id: messageId,
    quality_score: quality.qualityScore,
    is_repetitive: quality.isRepetitive,
    is_stalling: quality.isStalling,
    has_new_information: quality.hasNewInformation,
    has_character_action: quality.hasCharacterAction,
    has_emotional_change: quality.hasEmotionalChange,
    has_relationship_change: quality.hasRelationshipChange,
    has_scene_change: quality.hasSceneChange,
    has_foreshadowing: quality.hasForeshadowing,
    has_choice_pressure: quality.hasChoicePressure,
    has_forward_motion: quality.hasForwardMotion,
    scene_objective_progress: quality.sceneObjectiveProgress,
    problem: quality.problem,
    improvement_hint: quality.improvementHint,
    created_at: nowIso()
  };
}

function shouldSampleQuality(session: PlaySession) {
  return (session.scene_turn_count + 1) % 3 === 0;
}

function selectSummaryRange(messages: Message[], summaries: StorySummary[]) {
  const turnMessages = annotateTurnIndexes(messages);
  const maxSummarizedTurn = summaries.reduce((max, summary) => Math.max(max, summary.end_turn_index), 0);
  const totalTurns = turnMessages.reduce((max, item) => Math.max(max, item.turnIndex), 0);
  const minRecentTurns = 12;
  const minSummaryTurns = 20;
  const maxSummaryTurns = 30;
  if (totalTurns - maxSummarizedTurn <= minRecentTurns + minSummaryTurns - 1) return null;

  const startTurn = maxSummarizedTurn + 1;
  const endLimit = totalTurns - minRecentTurns;
  const endTurn = Math.min(startTurn + maxSummaryTurns - 1, endLimit);
  if (endTurn - startTurn + 1 < minSummaryTurns) return null;
  const selected = turnMessages
    .filter((item) => item.turnIndex >= startTurn && item.turnIndex <= endTurn)
    .map((item) => item.message);
  return selected.length ? { startTurn, endTurn, messages: selected } : null;
}

function annotateTurnIndexes(messages: Message[]) {
  let turnIndex = 0;
  return messages.map((message) => {
    if (message.role === "user") turnIndex += 1;
    return {
      message,
      turnIndex: Math.max(1, turnIndex)
    };
  });
}

function compactStorySummaries(summaries: StorySummary[], sessionId: ID) {
  const sessionSummaries = summaries
    .filter((summary) => summary.session_id === sessionId)
    .sort((a, b) => a.start_turn_index - b.start_turn_index);
  const others = summaries.filter((summary) => summary.session_id !== sessionId);
  if (sessionSummaries.length <= 3) return [...others, ...sessionSummaries];

  const [first, second, ...rest] = sessionSummaries;
  const merged: StorySummary = {
    ...second,
    id: first.id,
    start_turn_index: first.start_turn_index,
    end_turn_index: second.end_turn_index,
    summary: [
      `[${first.start_turn_index}〜${first.end_turn_index}ターンのサマリー]`,
      first.summary,
      "",
      `[${second.start_turn_index}〜${second.end_turn_index}ターンのサマリー]`,
      second.summary
    ].join("\n"),
    updated_at: nowIso()
  };
  return [...others, merged, ...rest].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

function formatStructuredSummary(summary: string) {
  const labels = [
    "現在地",
    "重要イベント",
    "関係性変化",
    "未回収伏線",
    "約束",
    "重要選択",
    "次の目的",
    "{{user}}が話したこと"
  ];
  if (labels.every((label) => summary.includes(label))) return summary.trim();
  return [
    "現在地:",
    summary.trim() || "- なし",
    "重要イベント:",
    "- なし",
    "関係性変化:",
    "- なし",
    "未回収伏線:",
    "- なし",
    "約束:",
    "- なし",
    "重要選択:",
    "- なし",
    "次の目的:",
    "- なし",
    "{{user}}が話したこと:",
    "- なし"
  ].join("\n");
}

function qualityFromSession(session: PlaySession): QualityCheck {
  const score = clamp(Number(session.last_quality_score ?? 7), 0, 10);
  const low = score <= 4;
  return {
    isRepetitive: false,
    hasNewInformation: !low,
    hasCharacterAction: !low,
    hasEmotionalChange: false,
    hasRelationshipChange: false,
    hasSceneChange: !low,
    hasForeshadowing: false,
    hasChoicePressure: !low,
    hasForwardMotion: !low,
    isStalling: low,
    sceneObjectiveProgress: low ? "low" : "medium",
    qualityScore: score,
    problem: low ? session.last_quality_problem ?? null : null,
    improvementHint: low ? session.last_improvement_hint ?? null : null
  };
}

function withQualityCheck(response: ConversationResponse, qualityCheck: QualityCheck): ConversationResponse {
  return { ...response, qualityCheck };
}

function withBackgroundResult(response: ConversationResponse, background: BackgroundJobsResponse): ConversationResponse {
  return {
    ...response,
    foreshadowingUpdates: background.foreshadowingUpdates ?? [],
    memoryCandidates: background.memoryCandidates ?? [],
    relationshipDelta: background.relationshipDelta ?? DEFAULT_RELATIONSHIP,
    imageCue: background.imageCue ?? {
      shouldSuggestImage: false,
      reason: null,
      sceneType: null,
      nsfwLevel: "none"
    },
    ...(background.infoboxUpdate ? { infoboxUpdate: background.infoboxUpdate } : {})
  };
}

function memoryCandidatesFromBackground(
  background: BackgroundJobsResponse,
  userId: ID,
  scenarioId: ID,
  sessionId: ID,
  sourceMessageId: ID | null
): MemoryCandidate[] {
  return (background.memoryCandidates ?? []).map((candidate): MemoryCandidate => ({
    id: newId("memcand"),
    user_id: userId,
    scenario_id: scenarioId,
    character_id: null,
    session_id: sessionId,
    source_message_id: sourceMessageId,
    type: candidate.type,
    content: candidate.content,
    importance: candidate.importance,
    sensitivity: candidate.sensitivity,
    reason: candidate.reason,
    status: "pending",
    created_at: nowIso(),
    updated_at: nowIso()
  }));
}

function imageCueToMessage(sessionId: ID, imageCue: ConversationResponse["imageCue"]): Message | null {
  if (!imageCue.shouldSuggestImage) return null;
  return {
    id: newId("msg"),
    session_id: sessionId,
    role: "system",
    message_type: "event",
    speaker_type: "system",
    speaker_name: "画像候補",
    speaker_avatar_url: null,
    content: imageCue.reason ?? "この場面を画像化できます。",
    metadata: { imageCue, generatedBy: "background" },
    created_at: nowIso()
  };
}

function applyQualitySessionUpdate(session: PlaySession, quality: QualityCheck): Partial<PlaySession> {
  return {
    last_quality_score: quality.qualityScore,
    quality_stall_count: computeNextQualityStallCountFromQuality(session, quality),
    last_quality_problem: quality.qualityScore <= 4 ? quality.problem : null,
    last_improvement_hint: quality.qualityScore <= 4 ? quality.improvementHint : null
  };
}

function applyDirectorSessionUpdate(session: PlaySession, response: ConversationResponse, scenes: StoryScene[]): Partial<PlaySession> {
  const currentScene = scenes.find((scene) => scene.scene_key === session.current_scene_key);
  const explicitNext = response.storyUpdate.nextSceneKey;
  const turnCount = session.scene_turn_count + 1;
  const overMax = currentScene ? turnCount >= currentScene.max_turns : false;
  const shouldAdvance = response.directorUpdate.shouldAdvanceScene || response.storyUpdate.shouldAdvance || overMax;
  const nextSceneKey = explicitNext ?? (shouldAdvance ? currentScene?.next_scene_key ?? null : null);
  const nextScene = nextSceneKey ? scenes.find((scene) => scene.scene_key === nextSceneKey) : null;
  const advanced = Boolean(nextScene && nextScene.scene_key !== session.current_scene_key);
  const nextStall = advanced ? 0 : computeNextStallCount(session, response);
  const beatCount = advanced ? nextScene?.beats.length ?? 0 : currentScene?.beats.length ?? 0;
  const requestedBeat = response.directorUpdate.currentBeatIndex;
  const nextBeatIndex = advanced ? 0 : clamp(requestedBeat, 0, Math.max(0, beatCount - 1));
  const objectiveCompleted = response.directorUpdate.objectiveCompleted;
  if (!advanced && currentScene && turnCount >= currentScene.max_turns) {
    console.warn("[Story Director] Turn Budget exhausted; next prompt will force scene movement", {
      sessionId: session.id,
      sceneKey: session.current_scene_key,
      sceneTurnCount: turnCount,
      maxTurns: currentScene.max_turns
    });
  }

  return {
    current_scene_key: advanced ? nextScene!.scene_key : session.current_scene_key,
    scene_objective: (advanced ? nextScene?.objective : currentScene?.objective) || session.scene_objective,
    current_beat_index: nextBeatIndex,
    scene_turn_count: advanced ? 0 : turnCount,
    stall_count: nextStall,
    last_conflict: (advanced ? nextScene?.conflict : currentScene?.conflict) || session.last_conflict,
    last_hook: response.directorUpdate.introducedHook ?? (advanced ? nextScene?.hook : currentScene?.hook) ?? session.last_hook,
    objective_completed: objectiveCompleted,
    last_director_reason: response.directorUpdate.reason,
    progress_percent: clamp(session.progress_percent + response.storyUpdate.progressDelta + directorProgressDelta(response), 0, 100)
  };
}

function directorProgressDelta(response: ConversationResponse) {
  if (response.directorUpdate.objectiveCompleted || response.qualityCheck.sceneObjectiveProgress === "high") return 4;
  if (response.qualityCheck.hasForwardMotion && response.qualityCheck.sceneObjectiveProgress === "medium") return 2;
  return response.qualityCheck.hasForwardMotion ? 1 : 0;
}

function computeNextStallCount(session: PlaySession, response: ConversationResponse) {
  const quality = response.qualityCheck;
  const shouldIncrease =
    quality.isRepetitive ||
    quality.isStalling ||
    !quality.hasForwardMotion ||
    quality.qualityScore <= 4 ||
    response.directorUpdate.stallRisk === "high" ||
    (quality.sceneObjectiveProgress === "low" && session.quality_stall_count >= 1);
  if (shouldIncrease) return session.stall_count + 1;
  const shouldDecrease =
    quality.hasForwardMotion ||
    quality.hasNewInformation ||
    quality.hasCharacterAction ||
    quality.hasForeshadowing ||
    quality.sceneObjectiveProgress === "high";
  return shouldDecrease ? Math.max(0, session.stall_count - 1) : session.stall_count;
}

function computeNextQualityStallCountFromQuality(session: PlaySession, quality: QualityCheck) {
  const poorQuality =
    quality.qualityScore <= 4 ||
    quality.isRepetitive ||
    quality.isStalling ||
    !quality.hasForwardMotion ||
    quality.sceneObjectiveProgress === "low";
  if (poorQuality) return session.quality_stall_count + 1;
  return Math.max(0, session.quality_stall_count - 1);
}

function applyForeshadowingUpdates(
  items: ForeshadowingItem[],
  response: ConversationResponse,
  session: PlaySession,
  bundle: StoryBundle,
  aiMessages: Message[],
  options?: { advanceTurnState?: boolean }
) {
  const now = nowIso();
  const firstAssistantMessageId = aiMessages.find((message) => message.role === "assistant" || message.role === "system")?.id ?? null;
  let next = items.map((item) => ({ ...item }));

  const updates = Array.isArray(response.foreshadowingUpdates) ? response.foreshadowingUpdates : [];
  updates.forEach((update) => {
    const existingIndex = findForeshadowingIndex(next, update.foreshadowingId, update.title, session);
    const characterId = update.relatedCharacterName
      ? bundle.characters.find((character) => character.name === update.relatedCharacterName)?.id ?? null
      : null;

    if (existingIndex === -1) {
      if (!["create", "introduce"].includes(update.action)) return;
      const item: ForeshadowingItem = {
        id: update.foreshadowingId ?? newId("foreshadow"),
        scenario_id: session.scenario_id,
        session_id: session.id,
        title: update.title || "未題の伏線",
        clue_text: update.clueText || update.revealedText || "まだ形になっていない違和感。",
        hidden_truth: update.hiddenTruth,
        related_character_id: characterId,
        related_lore_entry_id: null,
        introduced_at_message_id: update.action === "introduce" ? firstAssistantMessageId : null,
        introduced_scene_key: update.action === "introduce" ? session.current_scene_key : null,
        planned_reveal_scene_key: update.plannedRevealSceneKey,
        reveal_condition_json: update.revealCondition,
        importance: clamp(update.importance, 1, 5),
        status: update.action === "introduce" ? "introduced" : "planned",
        visibility: "hidden_to_user",
        last_reinforced_at: update.action === "introduce" ? now : null,
        revealed_at: null,
        reveal_readiness: resolveRevealReadiness(update.action === "introduce" ? "introduced" : "planned", 0),
        reinforcement_count: 0,
        turns_since_introduced: 0,
        overdue_score: 0,
        created_at: now,
        updated_at: now
      };
      next.push(item);
      return;
    }

    const item = next[existingIndex];
    const targetStatus = targetForeshadowingStatus(item.status, update.action);
    if (!isAllowedForeshadowingTransition(item.status, targetStatus)) {
      console.warn("[Foreshadowing] Rejected invalid status transition", {
        id: item.id,
        title: item.title,
        action: update.action,
        from: item.status,
        to: targetStatus,
        sessionId: session.id
      });
      return;
    }

    const patch: Partial<ForeshadowingItem> = {
      title: update.title || item.title,
      clue_text: update.clueText || item.clue_text,
      hidden_truth: update.hiddenTruth ?? item.hidden_truth,
      related_character_id: characterId ?? item.related_character_id,
      planned_reveal_scene_key: update.plannedRevealSceneKey ?? item.planned_reveal_scene_key,
      reveal_condition_json: update.revealCondition,
      importance: clamp(update.importance || item.importance, 1, 5),
      last_reinforced_at: ["introduce", "reinforce", "mark_ready", "reveal"].includes(update.action) ? now : item.last_reinforced_at,
      updated_at: now
    };

    if (update.action === "introduce") {
      patch.status = "introduced";
      patch.introduced_at_message_id = item.introduced_at_message_id ?? firstAssistantMessageId;
      patch.introduced_scene_key = item.introduced_scene_key ?? session.current_scene_key;
    }
    if (update.action === "reinforce") {
      patch.status = item.status === "ready" ? "ready" : item.status === "planned" ? "introduced" : "developing";
      patch.introduced_at_message_id = item.introduced_at_message_id ?? firstAssistantMessageId;
      patch.introduced_scene_key = item.introduced_scene_key ?? session.current_scene_key;
      patch.reinforcement_count = item.reinforcement_count + 1;
    }
    if (update.action === "mark_ready") {
      patch.status = "ready";
      patch.reveal_readiness = "ready";
    }
    if (update.action === "reveal") {
      patch.status = "revealed";
      patch.revealed_at = now;
      patch.reveal_readiness = "ready";
    }
    if (update.action === "discard") {
      patch.status = "discarded";
    }

    const patched = { ...item, ...patch };
    next[existingIndex] = {
      ...patched,
      reveal_readiness: resolveRevealReadiness(patched.status, patched.turns_since_introduced)
    };
  });

  if (options?.advanceTurnState !== false) {
    next = next.map((item) => updateForeshadowingTurnState(item, session, response));
  }
  return next;
}

function targetForeshadowingStatus(current: ForeshadowingStatus, action: ConversationResponse["foreshadowingUpdates"][number]["action"]): ForeshadowingStatus {
  if (action === "introduce") return "introduced";
  if (action === "reinforce") return current === "ready" ? "ready" : current === "planned" ? "introduced" : "developing";
  if (action === "mark_ready") return "ready";
  if (action === "reveal") return "revealed";
  if (action === "discard") return "discarded";
  return current;
}

function isAllowedForeshadowingTransition(from: ForeshadowingStatus, to: ForeshadowingStatus) {
  if (from === to) return true;
  if (to === "discarded") return true;
  const order: ForeshadowingStatus[] = ["planned", "introduced", "developing", "ready", "revealed"];
  const fromIndex = order.indexOf(from);
  const toIndex = order.indexOf(to);
  return fromIndex !== -1 && toIndex === fromIndex + 1;
}

function findForeshadowingIndex(items: ForeshadowingItem[], id: ID | null, title: string, session: PlaySession) {
  if (id) {
    const byId = items.findIndex((item) => item.id === id);
    if (byId !== -1) return byId;
  }
  const normalizedTitle = title.trim().toLowerCase();
  if (!normalizedTitle) return -1;
  return items.findIndex(
    (item) =>
      item.scenario_id === session.scenario_id &&
      (!item.session_id || item.session_id === session.id) &&
      item.title.trim().toLowerCase() === normalizedTitle
  );
}

function updateForeshadowingTurnState(item: ForeshadowingItem, session: PlaySession, response: ConversationResponse): ForeshadowingItem {
  if (!["introduced", "developing", "ready"].includes(item.status)) return item;
  const turns = item.turns_since_introduced + 1;
  const overdueScore =
    (item.overdue_score ?? 0) +
    (item.importance >= 4 && turns >= 20 ? 2 : 0) +
    (item.status === "developing" && turns >= 12 ? 1 : 0) +
    (response.directorUpdate.shouldIntroduceEvent || session.stall_count >= 2 ? 1 : 0);
  return {
    ...item,
    turns_since_introduced: turns,
    overdue_score: overdueScore,
    reveal_readiness: resolveRevealReadiness(item.status, turns),
    updated_at: nowIso()
  };
}

function resolveRevealReadiness(status: ForeshadowingStatus, turnsSinceIntroduced: number) {
  if (status === "planned") return "not_ready";
  if (status === "introduced" || status === "developing") return "warming_up";
  if (status === "ready" && turnsSinceIntroduced >= 20) return "overdue";
  if (status === "ready" || status === "revealed") return "ready";
  return "not_ready";
}

function usageFromConversation(
  userId: ID,
  response: ConversationResponse,
  latencyMs: number,
  settings?: AppSettings,
  revealResult?: TypewriterRevealResult | null
): UsageLog {
  return {
    id: newId("usage"),
    user_id: userId,
    kind: "conversation",
    backend: response.usage.backend,
    provider: response.usage.provider,
    model: response.usage.model,
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    latency_ms: latencyMs,
    image_count: 0,
    estimated_cost_jpy: response.usage.estimated_cost_jpy,
    prompt_chars: response.usage.prompt_chars ?? null,
    meta: {
      ...(response.error ? { error: response.error } : {}),
      directorUpdate: response.directorUpdate,
      mainResponse: true,
      latency_ms: latencyMs,
      model_role: response.usage.routeHint ?? "normal",
      streaming_enabled: settings?.streaming_display_enabled ?? settings?.timeline_reveal_enabled ?? true,
      real_streaming_enabled: settings?.real_streaming_enabled ?? false,
      typewriter_enabled: settings?.typewriter_enabled ?? settings?.timeline_reveal_enabled ?? true,
      typewriter_speed: settings?.typewriter_speed ?? settings?.timeline_reveal_speed ?? "normal",
      first_token_latency_ms: latencyMs,
      total_generation_latency_ms: latencyMs,
      total_reveal_time_ms: revealResult?.totalRevealTimeMs ?? 0,
      reveal_skipped: revealResult?.skipped ?? false
    },
    created_at: nowIso()
  };
}

function usageFromQualityCheck(
  userId: ID,
  usage: {
    backend: string;
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    estimated_cost_jpy: number;
    latency_ms?: number | null;
    error?: string;
  },
  qualityCheck: QualityCheck
): UsageLog {
  return {
    id: newId("usage"),
    user_id: userId,
    kind: "conversation",
    backend: usage.backend,
    provider: usage.provider,
    model: usage.model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    latency_ms: usage.latency_ms ?? null,
    image_count: 0,
    estimated_cost_jpy: usage.estimated_cost_jpy,
    meta: {
      qualityCheck,
      sampled: true,
      latency_ms: usage.latency_ms ?? null,
      ...(usage.error ? { error: usage.error } : {})
    },
    created_at: nowIso()
  };
}

function usageFromBackgroundJobs(
  userId: ID,
  usage: NonNullable<BackgroundJobsResponse["usage"]>,
  result: BackgroundJobsResponse
): UsageLog {
  return {
    id: newId("usage"),
    user_id: userId,
    kind: "conversation",
    backend: usage.backend,
    provider: usage.provider,
    model: usage.model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    latency_ms: usage.latency_ms ?? null,
    image_count: 0,
    estimated_cost_jpy: usage.estimated_cost_jpy,
    meta: {
      background: true,
      foreshadowingUpdateCount: result.foreshadowingUpdates.length,
      memoryCandidateCount: result.memoryCandidates.length,
      relationshipDelta: result.relationshipDelta,
      imageCue: result.imageCue,
      latency_ms: usage.latency_ms ?? null,
      ...(usage.error ? { error: usage.error } : {})
    },
    created_at: nowIso()
  };
}

function usageFromSummary(
  userId: ID,
  usage: {
    backend: string;
    provider: string;
    model: string;
    input_tokens: number;
    output_tokens: number;
    estimated_cost_jpy: number;
    latency_ms?: number | null;
    error?: string;
  },
  summary: StorySummary
): UsageLog {
  return {
    id: newId("usage"),
    user_id: userId,
    kind: "conversation",
    backend: usage.backend,
    provider: usage.provider,
    model: usage.model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    latency_ms: usage.latency_ms ?? null,
    image_count: 0,
    estimated_cost_jpy: usage.estimated_cost_jpy,
    meta: {
      summary: true,
      summaryId: summary.id,
      startTurn: summary.start_turn_index,
      endTurn: summary.end_turn_index,
      latency_ms: usage.latency_ms ?? null,
      ...(usage.error ? { error: usage.error } : {})
    },
    created_at: nowIso()
  };
}

function computeAutoState(
  response: ConversationResponse,
  session: PlaySession,
  style: StyleSettings,
  autoContinueCount: number,
  budgetNearLimit: boolean
) {
  const maxAuto = getMaxAutoCount(style);
  const count = clamp(autoContinueCount, 0, maxAuto);
  const forceStop =
    response.needsUserInput ||
    response.imageCue.shouldSuggestImage ||
    response.imageCue.nsfwLevel !== "none" ||
    response.storyUpdate.shouldAdvance ||
    count >= maxAuto ||
    budgetNearLimit;
  const canContinue = response.autoContinueAllowed && !forceStop;
  const allowAuto = session.play_pace_mode === "auto" && canContinue;

  return {
    needsUserInput: session.play_pace_mode === "auto" ? forceStop || !allowAuto : true,
    autoContinueAllowed: canContinue,
    autoContinueCount: canContinue ? count : 0
  };
}

function getMaxAutoCount(style: StyleSettings) {
  return clamp(Number(style.auto_advance_message_count ?? 3), 1, 3);
}

function isMonthlyBudgetNearLimit(state: AppState) {
  const total = state.usageLogs.reduce((sum, usage) => sum + usage.estimated_cost_jpy, 0);
  const budget = state.settings.monthly_budget_jpy;
  return budget > 0 && budget - total <= Math.max(200, budget * 0.1);
}

function effectiveTurnSettings(state: AppState): AppSettings {
  if (!state.settings.auto_switch_when_budget_low || !isMonthlyBudgetNearLimit(state)) return state.settings;
  return { ...state.settings, low_cost_mode: true };
}

function isPlayPaceMode(value: unknown): value is PlayPaceMode {
  return value === "auto" || value === "normal" || value === "choice_heavy";
}

function isAllowedImageTrigger(triggerType: ImageTriggerType) {
  return ["manual", "major_event", "chapter_start", "special_branch"].includes(triggerType);
}

function triggerLabel(triggerType: ImageTriggerType) {
  if (triggerType === "major_event") return "重要イベント";
  if (triggerType === "chapter_start") return "章開始";
  if (triggerType === "special_branch") return "特別な分岐";
  return "手動操作";
}

function upsertSessionVisualState(states: SessionSceneVisualState[], next: SessionSceneVisualState): SessionSceneVisualState[] {
  const index = states.findIndex((s) => s.session_id === next.session_id);
  if (index === -1) return [...states, next];
  return states.map((s) => (s.session_id === next.session_id ? next : s));
}

function normalizeExpression(expr: ExpressionType | null | undefined): ExpressionType | null {
  if (!expr) return null;
  const map: Partial<Record<string, ExpressionType>> = {
    embarrassed: "blush",
    soft_smile: "smile",
    happy: "smile",
    angry: "annoyed",
    fear: "worried",
    sad: "worried",
    shocked: "surprised",
    stern: "serious",
    calm: "neutral"
  };
  return map[expr] ?? expr as ExpressionType;
}

function buildSceneBackgroundPrompt(
  cue: VisualCue,
  bundle: StoryBundle,
  characterStates: SessionCharacterState[]
): string {
  const parts: string[] = [];

  // POV and camera
  const povLabel = cue.pov === "first_person" ? "first-person POV" : "third-person view";
  const distanceLabel = cue.cameraDistance === "close" ? "close-up" : cue.cameraDistance === "wide" ? "wide shot" : "medium shot";
  parts.push(`${povLabel}, ${distanceLabel}`);

  // Location / atmosphere
  if (cue.location) parts.push(`scene: ${cue.location}`);
  if (cue.timeOfDay) parts.push(cue.timeOfDay);
  if (cue.weather) parts.push(cue.weather);

  // Active characters
  if (cue.activeCharacters.length > 0) {
    const characterDescs = cue.activeCharacters.map((name) => {
      const character = bundle.characters.find((c) => c.name === name);
      const state = characterStates.find((s) => bundle.characters.find((c) => c.id === s.character_id)?.name === name);
      const parts: string[] = [name];
      if (character?.appearance) parts.push(character.appearance);
      if (state?.outfit) parts.push(`wearing ${state.outfit}`);
      if (cue.expression) parts.push(`expression: ${cue.expression}`);
      if (cue.pose) parts.push(`pose: ${cue.pose}`);
      return parts.join(", ");
    });
    parts.push(`characters: ${characterDescs.join("; ")}`);
  }

  // Style hints from scenario prose style
  if (bundle.style.prose_style) parts.push(`style: ${bundle.style.prose_style}`);

  // AI-provided prompt summary
  if (cue.promptSummary) parts.push(cue.promptSummary);

  // Quality markers
  parts.push("visual novel background, detailed illustration, high quality");

  return parts.filter(Boolean).join(", ");
}

function trackChoiceSelection(
  current: AppState,
  sessionId: ID,
  scenarioId: ID,
  choice: SuggestedReply
): Partial<AppState> {
  const event: ChoiceEventRecord = {
    id: newId("cevt"),
    sessionId,
    scenarioId,
    characterId: null,
    choiceLabel: choice.label,
    choiceType: choice.type,
    intent: (choice.intent ?? null) as ChoiceEventRecord["intent"],
    tone: (choice.tone ?? null) as ChoiceEventRecord["tone"],
    agency: (choice.agency ?? null) as ChoiceEventRecord["agency"],
    choiceStyle: (choice.choiceStyle ?? null) as ChoiceEventRecord["choiceStyle"],
    progression: (choice.progression ?? null) as ChoiceEventRecord["progression"],
    romanceLevel: choice.romanceLevel ?? 0,
    intimacyLevel: choice.intimacyLevel ?? 0,
    riskLevel: choice.riskLevel ?? "low",
    createdAt: nowIso()
  };
  const events = [...(current.choiceEvents ?? []).slice(-49), event];
  const scenarioPrev = (current.scenarioChoicePreferences ?? {})[scenarioId] ?? null;
  return {
    choiceEvents: events,
    choicePreferences: computeChoicePreferences(current.choicePreferences ?? null, event),
    scenarioChoicePreferences: {
      ...(current.scenarioChoicePreferences ?? {}),
      [scenarioId]: computeChoicePreferences(scenarioPrev, event)
    }
  };
}

function computeChoicePreferences(
  prev: UserChoicePreferences | null,
  event: ChoiceEventRecord
): UserChoicePreferences {
  const base: UserChoicePreferences = prev ?? {
    preferredIntents: {},
    preferredTones: {},
    preferredAgency: {},
    preferredChoiceStyles: {},
    preferredProgression: {},
    romancePreferenceScore: 0,
    intimacyPreferenceScore: 0,
    storyProgressPreferenceScore: 0,
    slowBurnPreferenceScore: 0,
    sampleCount: 0,
    updatedAt: ""
  };
  const decay = base.sampleCount < 10 ? 0.9 : 0.95;

  function addToMap(map: Record<string, number>, key: string | null | undefined): Record<string, number> {
    const decayed = Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v * decay]));
    if (!key) return decayed;
    return { ...decayed, [key]: (decayed[key] ?? 0) + 1 };
  }

  return {
    preferredIntents: addToMap(base.preferredIntents, event.intent),
    preferredTones: addToMap(base.preferredTones, event.tone),
    preferredAgency: addToMap(base.preferredAgency, event.agency),
    preferredChoiceStyles: addToMap(base.preferredChoiceStyles, event.choiceStyle),
    preferredProgression: addToMap(base.preferredProgression, event.progression),
    romancePreferenceScore: base.romancePreferenceScore * decay + event.romanceLevel,
    intimacyPreferenceScore: base.intimacyPreferenceScore * decay + event.intimacyLevel,
    storyProgressPreferenceScore: base.storyProgressPreferenceScore * decay + (event.progression === "story_forward" ? 1 : 0),
    slowBurnPreferenceScore: base.slowBurnPreferenceScore * decay + (event.progression === "slow_burn" ? 1 : 0),
    sampleCount: base.sampleCount + 1,
    updatedAt: nowIso()
  };
}

/**
 * シナリオに連動中の enabled ロアブックのエントリー一覧を取得する。
 * hidden_truth は呼び出し元で除外する（ここでは渡すだけ）。
 */
function getLinkedLorebookEntries(state: AppState, scenarioId: ID): import("@/lib/domain/types").LorebookEntry[] {
  const links = (state.lorebookLinks ?? []).filter((link) => link.plot_id === scenarioId && link.enabled);
  const lorebooks = state.lorebooks ?? [];
  return links.flatMap((link) => {
    const lb = lorebooks.find((item) => item.id === link.lorebook_id);
    return lb ? lb.entries : [];
  });
}
