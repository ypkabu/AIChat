import type { User } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS } from "@/lib/domain/constants";
import { createSampleState } from "@/lib/domain/sampleData";
import type {
  AppSettings,
  AppState,
  ChoiceEventRecord,
  ForeshadowingItem,
  GeneratedImage,
  ImageGenerationJob,
  MemoryCandidate,
  NarrativeQualityLog,
  PlaySession,
  StorySummary,
  UserChoicePreferences
} from "@/lib/domain/types";
import { createBrowserSupabaseClient, isSupabaseConfigured } from "./client";

export { isSupabaseConfigured };

const TABLES = {
  users: "users",
  appSettings: "app_settings",
  scenarios: "scenarios",
  characters: "scenario_characters",
  userProfiles: "user_profiles",
  lorebook: "lorebook_entries",
  styles: "style_settings",
  intros: "intro_settings",
  storyScenes: "story_scenes",
  storySummaries: "story_summaries",
  sessions: "play_sessions",
  messages: "messages",
  memories: "memories",
  memoryCandidates: "memory_candidates",
  foreshadowingItems: "foreshadowing_items",
  narrativeQualityLogs: "narrative_quality_logs",
  relationships: "relationship_states",
  sessionEnvironmentState: "session_environment_state",
  sessionCharacterStates: "session_character_states",
  imageJobs: "image_generation_jobs",
  images: "generated_images",
  galleryItems: "gallery_items",
  usageLogs: "usage_logs",
  choiceEvents: "choice_events",
  choicePreferences: "user_choice_preferences",
  generatedAudio: "generated_audio",
  lorebooks: "lorebooks",
  lorebookLinks: "plot_lorebook_links"
} as const;

export type SupabaseRemoteState = {
  configured: boolean;
  user: User | null;
  loading: boolean;
  error: string | null;
};

export function getSupabaseClientOrNull() {
  return createBrowserSupabaseClient();
}

type BrowserSupabaseClient = NonNullable<ReturnType<typeof getSupabaseClientOrNull>>;
type SupabaseClientAny = {
  auth: BrowserSupabaseClient["auth"];
  storage: BrowserSupabaseClient["storage"];
  from: (table: string) => any;
};

export async function getAuthenticatedUser() {
  const supabase = getSupabaseClientOrNull();
  if (!supabase) return null;
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) return null;
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user ?? sessionData.session.user ?? null;
}

export async function signInAnonymously() {
  const supabase = requireSupabase();
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}

export async function signInWithEmailOtp(email: string) {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });
  if (error) throw error;
}

export async function signOutSupabase() {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function loadAppStateFromSupabase(user: User): Promise<AppState | null> {
  const supabase = requireSupabase();
  await ensureUserRow(user);

  const [
    settingsResult,
    scenariosResult,
    charactersResult,
    userProfilesResult,
    lorebookResult,
    stylesResult,
    introsResult,
    storyScenesResult,
    storySummariesResult,
    sessionsResult,
    messagesResult,
    memoriesResult,
    memoryCandidatesResult,
    foreshadowingItemsResult,
    narrativeQualityLogsResult,
    relationshipsResult,
    sessionEnvironmentResult,
    sessionCharacterStatesResult,
    imageJobsResult,
    imagesResult,
    galleryItemsResult,
    usageLogsResult,
    choiceEventsResult,
    choicePreferencesResult,
    lorebooksResult,
    lorebookLinksResult,
    scenarioChoicePreferencesResult
  ] = await Promise.all([
    supabase.from(TABLES.appSettings).select("*").eq("user_id", user.id).maybeSingle(),
    supabase.from(TABLES.scenarios).select("*").eq("user_id", user.id).order("updated_at", { ascending: false }),
    supabase.from(TABLES.characters).select("*").order("sort_order", { ascending: true }),
    supabase.from(TABLES.userProfiles).select("*").eq("user_id", user.id),
    supabase.from(TABLES.lorebook).select("*"),
    supabase.from(TABLES.styles).select("*"),
    supabase.from(TABLES.intros).select("*"),
    supabase.from(TABLES.storyScenes).select("*"),
    supabase.from(TABLES.storySummaries).select("*").eq("user_id", user.id).order("start_turn_index", { ascending: true }),
    supabase.from(TABLES.sessions).select("*").eq("user_id", user.id),
    supabase.from(TABLES.messages).select("*").order("created_at", { ascending: true }),
    supabase.from(TABLES.memories).select("*").eq("user_id", user.id),
    supabase.from(TABLES.memoryCandidates).select("*").eq("user_id", user.id),
    supabase.from(TABLES.foreshadowingItems).select("*"),
    supabase.from(TABLES.narrativeQualityLogs).select("*").order("created_at", { ascending: true }),
    supabase.from(TABLES.relationships).select("*").eq("user_id", user.id),
    supabase.from(TABLES.sessionEnvironmentState).select("*").eq("user_id", user.id),
    supabase.from(TABLES.sessionCharacterStates).select("*").eq("user_id", user.id),
    supabase.from(TABLES.imageJobs).select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    supabase.from(TABLES.images).select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    supabase.from(TABLES.galleryItems).select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    supabase.from(TABLES.usageLogs).select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    // Choice Learning — 直近50件のみ取得（計算は AppStore 側で行う）
    supabase.from(TABLES.choiceEvents).select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
    // global スコープの preference を取得
    supabase.from(TABLES.choicePreferences).select("*").eq("user_id", user.id).eq("scope", "global").maybeSingle(),
    // lorebooks (user-level reusable lore)
    supabase.from(TABLES.lorebooks).select("*").eq("user_id", user.id),
    // plot_lorebook_links
    supabase.from(TABLES.lorebookLinks).select("*"),
    // scenario-scoped choice preferences
    supabase.from(TABLES.choicePreferences).select("*").eq("user_id", user.id).eq("scope", "scenario")
  ]);

  throwFirstError([
    settingsResult,
    scenariosResult,
    charactersResult,
    userProfilesResult,
    lorebookResult,
    stylesResult,
    introsResult,
    storyScenesResult,
    storySummariesResult,
    sessionsResult,
    messagesResult,
    memoriesResult,
    memoryCandidatesResult,
    foreshadowingItemsResult,
    narrativeQualityLogsResult,
    relationshipsResult,
    sessionEnvironmentResult,
    sessionCharacterStatesResult,
    imageJobsResult,
    imagesResult,
    galleryItemsResult,
    usageLogsResult
    // choice_events / user_choice_preferences はテーブル未適用時にエラーになるためここでは throw しない
  ]);

  const scenarios = (scenariosResult.data ?? []) as Array<Record<string, unknown> & { id: string }>;
  if (scenarios.length === 0) return null;

  const scenarioIds = new Set(scenarios.map((scenario) => scenario.id));
  const sessions = (sessionsResult.data ?? []) as Array<Record<string, unknown> & { id: string }>;
  const sessionIds = new Set(sessions.map((session) => session.id));
  const images = galleryItemsResult.data?.length ? galleryItemsResult.data.map(fromDbGalleryItem) : imagesResult.data ?? [];
  const refreshedImages = await refreshGeneratedImageUrls(images);

  return {
    userId: user.id,
    scenarios: scenarios as AppState["scenarios"],
    bookmarkedScenarioIds: [],
    characters: rows(charactersResult.data).filter((item) => scenarioIds.has(String(item.scenario_id))) as AppState["characters"],
    userProfiles: rows(userProfilesResult.data).filter((item) => !item.scenario_id || scenarioIds.has(String(item.scenario_id))) as AppState["userProfiles"],
    lorebook: rows(lorebookResult.data).filter((item) => scenarioIds.has(String(item.scenario_id))) as AppState["lorebook"],
    styles: rows(stylesResult.data).filter((item) => scenarioIds.has(String(item.scenario_id))) as AppState["styles"],
    intros: rows(introsResult.data).filter((item) => scenarioIds.has(String(item.scenario_id))) as AppState["intros"],
    storyScenes: rows(storyScenesResult.data)
      .filter((item) => scenarioIds.has(String(item.scenario_id)))
      .map(fromDbStoryScene),
    storySummaries: rows(storySummariesResult.data)
      .filter((item) => sessionIds.has(String(item.session_id)))
      .map(fromDbStorySummary),
    sessions: sessions.map(fromDbSession),
    messages: rows(messagesResult.data).filter((item) => sessionIds.has(String(item.session_id))) as AppState["messages"],
    memories: memoriesResult.data ?? [],
    memoryCandidates: (memoryCandidatesResult.data ?? []).map(fromDbMemoryCandidate),
    foreshadowingItems: rows(foreshadowingItemsResult.data)
      .filter((item) => scenarioIds.has(String(item.scenario_id)))
      .map(fromDbForeshadowingItem),
    narrativeQualityLogs: rows(narrativeQualityLogsResult.data)
      .filter((item) => sessionIds.has(String(item.session_id)))
      .map(fromDbNarrativeQualityLog),
    relationships: relationshipsResult.data ?? [],
    sessionEnvironmentStates: rows(sessionEnvironmentResult.data)
      .filter((item) => sessionIds.has(String(item.session_id))) as AppState["sessionEnvironmentStates"],
    sessionCharacterStates: rows(sessionCharacterStatesResult.data)
      .filter((item) => sessionIds.has(String(item.session_id))) as AppState["sessionCharacterStates"],
    imageJobs: imageJobsResult.data ?? [],
    images: refreshedImages,
    voiceJobs: [],
    usageLogs: usageLogsResult.data ?? [],
    settings: fromDbSettings(settingsResult.data),
    // choice_events は DB 側が降順のため再度昇順に並べ直す
    choiceEvents: ((choiceEventsResult.data ?? []) as Array<Record<string, unknown>>)
      .reverse()
      .map(fromDbChoiceEvent),
    choicePreferences: fromDbChoicePreferences(choicePreferencesResult.data ?? null),
    scenarioChoicePreferences: buildScenarioChoicePreferences(
      (scenarioChoicePreferencesResult.data ?? []) as Array<Record<string, unknown>>
    ),
    lorebooks: buildLorebooks(
      (lorebooksResult.data ?? []) as Array<Record<string, unknown>>,
      rows(lorebookResult.data)
    ),
    lorebookLinks: (lorebookLinksResult.data ?? []) as AppState["lorebookLinks"],
    sceneVisualBundles: [],
    sceneVisualVariants: [],
    sessionSceneVisualStates: []
  };
}

/**
 * 完了した音声ジョブを generated_audio テーブルに保存する。
 * migration 未適用時はエラーを握りつぶしてスキップする。
 */
export async function saveGeneratedAudio(params: {
  id: string;
  userId: string;
  sessionId: string;
  messageId: string;
  characterId: string | null;
  provider: string;
  model: string | null;
  voiceId: string | null;
  audioDataUri: string | null;
  storagePath: string | null;
  publicUrl: string | null;
  durationMs: number | null;
}) {
  const supabase = getSupabaseClientOrNull();
  if (!supabase) return;
  try {
    // supabase-js の型推論が generated_audio テーブルを認識しないため as any でキャスト
    await (supabase as SupabaseClientAny).from(TABLES.generatedAudio).upsert({
      id: params.id,
      user_id: params.userId,
      session_id: params.sessionId,
      message_id: params.messageId,
      character_id: params.characterId ?? null,
      provider: params.provider,
      model: params.model ?? null,
      voice_id: params.voiceId ?? null,
      // Storage保存済みならDBには巨大な data URI を持たない
      audio_data_uri: params.storagePath ? null : params.audioDataUri,
      storage_path: params.storagePath ?? null,
      public_url: params.publicUrl ?? null,
      duration_ms: params.durationMs ?? null,
      is_nsfw: false,
      created_at: new Date().toISOString()
    });
  } catch {
    // テーブル未作成時のフォールバック
  }
}

export async function seedRemoteWithSample(user: User) {
  const state = createSampleState(user.id);
  await saveAppStateToSupabase(state, user);
  return state;
}

export async function saveAppStateToSupabase(state: AppState, user: User) {
  if (!isSupabaseConfigured) return;
  const supabase = requireSupabase();
  await ensureUserRow(user);

  const normalized = normalizeStateForUser(state, user);

  await deleteMissingRemoteRows(supabase, normalized, user.id);

  await upsert(TABLES.appSettings, { user_id: user.id, ...normalized.settings });
  await upsertMany(TABLES.scenarios, normalized.scenarios);
  await upsertMany(TABLES.userProfiles, normalized.userProfiles);
  await upsertMany(TABLES.characters, normalized.characters);
  await upsertMany(TABLES.lorebook, normalized.lorebook);
  await upsertMany(TABLES.styles, normalized.styles);
  await upsertMany(TABLES.intros, normalized.intros);
  await upsertMany(TABLES.storyScenes, normalized.storyScenes.map(toDbStoryScene));
  await upsertMany(TABLES.storySummaries, normalized.storySummaries.map(toDbStorySummary));
  await upsertMany(TABLES.sessions, normalized.sessions.map(toDbSession));
  await upsertMany(TABLES.messages, normalized.messages);
  await upsertMany(TABLES.relationships, normalized.relationships);
  await upsertMany(TABLES.sessionEnvironmentState, normalized.sessionEnvironmentStates);
  await upsertMany(TABLES.sessionCharacterStates, normalized.sessionCharacterStates);
  await upsertMany(TABLES.memories, normalized.memories);
  await upsertMany(TABLES.memoryCandidates, normalized.memoryCandidates.map(toDbMemoryCandidate));
  await upsertMany(TABLES.foreshadowingItems, normalized.foreshadowingItems.map(toDbForeshadowingItem));
  await upsertMany(TABLES.narrativeQualityLogs, normalized.narrativeQualityLogs.map(toDbNarrativeQualityLog));
  await upsertMany(TABLES.imageJobs, normalized.imageJobs);
  await upsertMany(TABLES.images, normalized.images.map(toDbImage));
  await upsertMany(TABLES.galleryItems, normalized.images.map(toDbGalleryItem));
  await upsertMany(TABLES.usageLogs, normalized.usageLogs);

  // Choice Learning — テーブル未適用時はエラーを握りつぶす
  try {
    await upsertMany(TABLES.choiceEvents, normalized.choiceEvents.map((e) => toDbChoiceEvent(e, user.id)));
    if (normalized.choicePreferences) {
      await upsert(TABLES.choicePreferences, toDbChoicePreferences(normalized.choicePreferences, user.id, "global", null));
    }
    // scenario-scoped preferences
    const scenarioPrefs = Object.entries(normalized.scenarioChoicePreferences ?? {});
    if (scenarioPrefs.length > 0) {
      await upsertMany(
        TABLES.choicePreferences,
        scenarioPrefs.map(([scenarioId, prefs]) => toDbChoicePreferences(prefs, user.id, "scenario", scenarioId))
      );
    }
  } catch (error) {
    // テーブル未適用 (42P01 / relation does not exist) のみ許容、それ以外は警告
    const msg = error instanceof Error ? error.message : String(error);
    if (!msg.includes("does not exist") && !msg.includes("42P01")) {
      console.warn("[ChoiceLearning] Sync failed (not a missing-table error)", error);
    }
  }

  // Lorebooks — 未適用テーブルだけ後方互換でスキップし、それ以外は保存失敗として扱う
  try {
    const lorebooks = normalized.lorebooks ?? [];
    if (lorebooks.length > 0) {
      await upsertMany(TABLES.lorebooks, lorebooks.map((lb) => ({
        id: lb.id,
        user_id: user.id,
        title: lb.title,
        short_description: lb.short_description ?? null,
        cover_image_url: lb.cover_image_url ?? null,
        visibility: lb.visibility ?? "private",
        created_at: lb.created_at,
        updated_at: lb.updated_at
      })));
      // Lorebook entries (entries belonging to a lorebook, not scenario-embedded)
      const lorebookEntries = lorebooks.flatMap((lb) =>
        (lb.entries ?? []).map((entry) => ({
          ...entry,
          lorebook_id: lb.id,
          scenario_id: entry.scenario_id || null  // 空文字列 → null
        }))
      );
      if (lorebookEntries.length > 0) {
        await upsertMany(TABLES.lorebook, lorebookEntries);
      }
    }
    const lorebookLinks = normalized.lorebookLinks ?? [];
    if (lorebookLinks.length > 0) {
      await upsertMany(TABLES.lorebookLinks, lorebookLinks);
    }
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[Lorebooks] Sync skipped because lorebook tables are not applied yet.", error);
      return;
    }
    throw error;
  }

  async function upsert(table: string, row: Record<string, unknown>) {
    const { error } = await supabase.from(table).upsert(row);
    if (error) throw error;
  }

  async function upsertMany(table: string, rows: Array<Record<string, unknown>>) {
    if (rows.length === 0) return;
    const { error } = await supabase.from(table).upsert(rows);
    if (error) throw error;
  }
}

async function deleteMissingRemoteRows(
  supabase: ReturnType<typeof requireSupabase>,
  state: AppState,
  userId: string
) {
  const scenarioIds = collectIds(state.scenarios);
  const sessionIds = collectIds(state.sessions);

  await deleteMissingBySession(supabase, TABLES.messages, sessionIds, collectIds(state.messages));
  await deleteMissingBySession(supabase, TABLES.storySummaries, sessionIds, collectIds(state.storySummaries));
  await deleteMissingBySession(supabase, TABLES.narrativeQualityLogs, sessionIds, collectIds(state.narrativeQualityLogs));
  await deleteMissingBySession(supabase, TABLES.sessionEnvironmentState, sessionIds, collectIds(state.sessionEnvironmentStates));
  await deleteMissingBySession(supabase, TABLES.sessionCharacterStates, sessionIds, collectIds(state.sessionCharacterStates));
  await deleteMissingByUser(supabase, TABLES.galleryItems, userId, collectIds(state.images));
  await deleteMissingByUser(supabase, TABLES.images, userId, collectIds(state.images));
  await deleteMissingByUser(supabase, TABLES.imageJobs, userId, collectIds(state.imageJobs));
  await deleteMissingByUser(supabase, TABLES.memoryCandidates, userId, collectIds(state.memoryCandidates));
  await deleteMissingByUser(supabase, TABLES.memories, userId, collectIds(state.memories));
  await deleteMissingByUser(supabase, TABLES.relationships, userId, collectIds(state.relationships));
  await deleteMissingByUser(supabase, TABLES.sessions, userId, collectIds(state.sessions));

  await deleteMissingByScenario(supabase, TABLES.characters, scenarioIds, collectIds(state.characters));
  await deleteMissingByScenario(supabase, TABLES.lorebook, scenarioIds, collectIds(state.lorebook));
  await deleteMissingByScenario(supabase, TABLES.styles, scenarioIds, collectIds(state.styles));
  await deleteMissingByScenario(supabase, TABLES.intros, scenarioIds, collectIds(state.intros));
  await deleteMissingByScenario(supabase, TABLES.storyScenes, scenarioIds, collectIds(state.storyScenes));
  await deleteMissingByScenario(supabase, TABLES.foreshadowingItems, scenarioIds, collectIds(state.foreshadowingItems));

  await deleteMissingByUser(supabase, TABLES.userProfiles, userId, collectIds(state.userProfiles));
  await deleteMissingByUser(supabase, TABLES.usageLogs, userId, collectIds(state.usageLogs));
  await deleteMissingByUser(supabase, TABLES.scenarios, userId, scenarioIds);

  // Lorebooks — 未適用テーブルだけ後方互換でスキップし、それ以外は保存失敗として扱う
  try {
    const lorebooks = state.lorebooks ?? [];
    const lorebookIds = collectIds(lorebooks);
    await deleteMissingByUser(supabase, TABLES.lorebooks, userId, lorebookIds);

    // lorebook に属する entries の孤立削除（scenario_id が null のスタンドアロン entries 対応）
    const allLorebookEntryIds = lorebooks.flatMap((lb) => ((lb as Record<string, unknown>).entries as Array<{ id: string }> ?? []).map((e) => e.id));
    const lorebookIdList = lorebooks.map((lb) => lb.id);
    if (lorebookIdList.length > 0) {
      let entryQuery = supabase.from(TABLES.lorebook).delete().in("lorebook_id", lorebookIdList);
      entryQuery = filterOutKeptIds(entryQuery, allLorebookEntryIds);
      const { error } = await entryQuery;
      if (error) throw error;
    }

    // plot_lorebook_links は user_id カラムを持たないため、plot_id (= scenario_id) ベースで削除
    const linkIds = collectIds(state.lorebookLinks ?? []);
    if (scenarioIds.length > 0) {
      let query = supabase.from(TABLES.lorebookLinks).delete().in("plot_id", scenarioIds);
      query = filterOutKeptIds(query, linkIds);
      const { error } = await query;
      if (error) throw error;
    }
  } catch (error) {
    if (isMissingTableError(error)) {
      console.warn("[Lorebooks] Delete sync skipped because lorebook tables are not applied yet.", error);
      return;
    }
    throw error;
  }
}

async function deleteMissingByUser(
  supabase: ReturnType<typeof requireSupabase>,
  table: string,
  userId: string,
  keepIds: string[]
) {
  let query = supabase.from(table).delete().eq("user_id", userId);
  query = filterOutKeptIds(query, keepIds);
  const { error } = await query;
  if (error) throw error;
}

async function deleteMissingByScenario(
  supabase: ReturnType<typeof requireSupabase>,
  table: string,
  scenarioIds: string[],
  keepIds: string[]
) {
  if (scenarioIds.length === 0) return;
  let query = supabase.from(table).delete().in("scenario_id", scenarioIds);
  query = filterOutKeptIds(query, keepIds);
  const { error } = await query;
  if (error) throw error;
}

async function deleteMissingBySession(
  supabase: ReturnType<typeof requireSupabase>,
  table: string,
  sessionIds: string[],
  keepIds: string[]
) {
  if (sessionIds.length === 0) return;
  let query = supabase.from(table).delete().in("session_id", sessionIds);
  query = filterOutKeptIds(query, keepIds);
  const { error } = await query;
  if (error) throw error;
}

function filterOutKeptIds<T extends { not: (column: string, operator: string, value: string) => T }>(
  query: T,
  keepIds: string[]
) {
  if (keepIds.length === 0) return query;
  return query.not("id", "in", toPostgrestInList(keepIds));
}

function toPostgrestInList(values: string[]) {
  return `(${values.map((value) => `"${value.replaceAll('"', '\\"')}"`).join(",")})`;
}

function collectIds(rows: Array<{ id: string }>) {
  return rows.map((row) => row.id);
}

function rows(data: unknown): Array<Record<string, unknown>> {
  return Array.isArray(data) ? data as Array<Record<string, unknown>> : [];
}

function isMissingTableError(error: unknown) {
  const record = isRecord(error) ? error : {};
  const code = String(record.code ?? "");
  const message = error instanceof Error ? error.message : String(record.message ?? error);
  return code === "42P01" || message.includes("42P01") || message.includes("does not exist");
}

async function refreshGeneratedImageUrls(images: GeneratedImage[]) {
  const supabase = requireSupabase();
  return Promise.all(
    images.map(async (image) => {
      if (!image.storage_path) return image;
      const { data, error } = await supabase.storage.from("generated-images").createSignedUrl(image.storage_path, 60 * 60 * 24 * 7);
      if (error) return image;
      return {
        ...image,
        public_url: data.signedUrl,
        thumbnail_url: data.signedUrl
      };
    })
  );
}

async function ensureUserRow(user: User) {
  const supabase = requireSupabase();
  const { error: userError } = await supabase.from(TABLES.users).upsert({
    id: user.id,
    display_name: user.email ?? user.user_metadata?.display_name ?? "User"
  });
  if (userError) throw userError;

  const { error: settingsError } = await supabase.from(TABLES.appSettings).upsert({
    user_id: user.id,
    ...DEFAULT_SETTINGS
  }, { onConflict: "user_id", ignoreDuplicates: true });
  if (settingsError) throw settingsError;
}

function requireSupabase(): SupabaseClientAny {
  const supabase = getSupabaseClientOrNull();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase as SupabaseClientAny;
}

function throwFirstError(results: Array<{ error: unknown }>) {
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}

function fromDbSettings(row: Record<string, unknown> | null): AppSettings {
  if (!row) return DEFAULT_SETTINGS;
  const settings = { ...row };
  delete settings.user_id;
  return { ...DEFAULT_SETTINGS, ...settings } as AppSettings;
}

function fromDbSession(row: Record<string, unknown>): PlaySession {
  const storyState = isRecord(row.story_state) ? row.story_state : {};
  const storyFlags = isRecord(storyState.story_flags) ? storyState.story_flags : {};
  return {
    ...(row as unknown as PlaySession),
    pending_choices: Array.isArray(row.pending_choices) ? row.pending_choices as PlaySession["pending_choices"] : [],
    play_pace_mode: row.play_pace_mode === "auto" || row.play_pace_mode === "choice_heavy" ? row.play_pace_mode : "normal",
    auto_continue_count: typeof row.auto_continue_count === "number" ? row.auto_continue_count : 0,
    needs_user_input: typeof storyState.needs_user_input === "boolean" ? storyState.needs_user_input : true,
    auto_continue_allowed: typeof storyState.auto_continue_allowed === "boolean" ? storyState.auto_continue_allowed : false,
    story_flags: storyFlags,
    scene_objective: typeof storyState.scene_objective === "string" ? storyState.scene_objective : "",
    current_beat_index: asNumber(row.current_beat_index, storyState.current_beat_index, 0),
    scene_turn_count: asNumber(row.scene_turn_count, storyState.scene_turn_count, 0),
    stall_count: asNumber(row.stall_count, storyState.stall_count, 0),
    last_conflict: typeof row.last_conflict === "string" ? row.last_conflict : "",
    last_hook: typeof row.last_hook === "string" ? row.last_hook : "",
    objective_completed: typeof row.objective_completed === "boolean" ? row.objective_completed : false,
    last_director_reason: typeof row.last_director_reason === "string" ? row.last_director_reason : null,
    last_quality_score: typeof row.last_quality_score === "number" ? row.last_quality_score : null,
    quality_stall_count: asNumber(row.quality_stall_count, storyState.quality_stall_count, 0),
    last_quality_problem: typeof row.last_quality_problem === "string" ? row.last_quality_problem : null,
    last_improvement_hint: typeof row.last_improvement_hint === "string" ? row.last_improvement_hint : null
  };
}

function toDbSession(session: PlaySession) {
  const { story_flags, scene_objective, needs_user_input, auto_continue_allowed, ...row } = session;
  return {
    ...row,
    story_state: {
      story_flags,
      scene_objective,
      needs_user_input,
      auto_continue_allowed
    }
  };
}

function fromDbStoryScene(row: Record<string, unknown>): AppState["storyScenes"][number] {
  return {
    ...(row as unknown as AppState["storyScenes"][number]),
    beats: Array.isArray(row.beats) ? row.beats.map(String) : []
  };
}

function toDbStoryScene(scene: AppState["storyScenes"][number]) {
  return scene;
}

function fromDbStorySummary(row: Record<string, unknown>): StorySummary {
  return {
    ...(row as unknown as StorySummary),
    start_turn_index: asNumber(row.start_turn_index, null, 1),
    end_turn_index: asNumber(row.end_turn_index, row.start_turn_index, 1),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : String(row.created_at ?? "")
  };
}

function toDbStorySummary(summary: StorySummary) {
  return summary;
}

function fromDbForeshadowingItem(row: Record<string, unknown>): ForeshadowingItem {
  return {
    ...(row as unknown as ForeshadowingItem),
    reveal_condition_json: isRecord(row.reveal_condition_json) ? row.reveal_condition_json : {},
    reinforcement_count: asNumber(row.reinforcement_count, null, 0),
    turns_since_introduced: asNumber(row.turns_since_introduced, null, 0),
    overdue_score: asNumber(row.overdue_score, null, 0)
  };
}

function toDbForeshadowingItem(item: ForeshadowingItem) {
  return item;
}

function fromDbNarrativeQualityLog(row: Record<string, unknown>): NarrativeQualityLog {
  return row as unknown as NarrativeQualityLog;
}

function toDbNarrativeQualityLog(log: NarrativeQualityLog) {
  return log;
}

function fromDbMemoryCandidate(row: Record<string, unknown>): MemoryCandidate {
  return row as unknown as MemoryCandidate;
}

function toDbMemoryCandidate(candidate: MemoryCandidate) {
  return candidate;
}

function toDbImage(image: GeneratedImage) {
  return image;
}

function fromDbGalleryItem(row: Record<string, unknown>): GeneratedImage {
  const image = { ...row };
  delete image.image_id;
  return image as unknown as GeneratedImage;
}

function toDbGalleryItem(image: GeneratedImage) {
  return {
    ...image,
    image_id: image.id
  };
}

function normalizeStateForUser(state: AppState, user: User): AppState {
  return {
    ...state,
    userId: user.id,
    scenarios: state.scenarios.map((item) => ({ ...item, user_id: user.id })),
    userProfiles: state.userProfiles.map((item) => ({ ...item, user_id: user.id })),
    sessions: state.sessions.map((item) => ({ ...item, user_id: user.id })),
    memories: state.memories.map((item) => ({ ...item, user_id: user.id })),
    memoryCandidates: state.memoryCandidates.map((item) => ({ ...item, user_id: user.id })),
    foreshadowingItems: state.foreshadowingItems.map((item) => ({ ...item })),
    storyScenes: state.storyScenes.map((item) => ({ ...item })),
    storySummaries: state.storySummaries.map((item) => ({ ...item, user_id: user.id })),
    narrativeQualityLogs: state.narrativeQualityLogs.map((item) => ({ ...item })),
    relationships: state.relationships.map((item) => ({ ...item, user_id: user.id })),
    sessionEnvironmentStates: state.sessionEnvironmentStates.map((item) => ({ ...item, user_id: user.id })),
    sessionCharacterStates: state.sessionCharacterStates.map((item) => ({ ...item, user_id: user.id })),
    imageJobs: state.imageJobs.map((item: ImageGenerationJob) => ({ ...item, user_id: user.id })),
    images: state.images.map((item) => ({ ...item, user_id: user.id })),
    usageLogs: state.usageLogs.map((item) => ({ ...item, user_id: user.id })),
    choiceEvents: state.choiceEvents,
    choicePreferences: state.choicePreferences
  };
}

// ---------------------------------------------------------------------------
// Choice Learning: DB ↔ AppState 変換
// DB カラム名は snake_case、AppState フィールドは camelCase
// ---------------------------------------------------------------------------

function fromDbChoiceEvent(row: Record<string, unknown>): ChoiceEventRecord {
  return {
    id: String(row.id ?? ""),
    sessionId: String(row.session_id ?? ""),
    scenarioId: String(row.scenario_id ?? ""),
    characterId: row.character_id ? String(row.character_id) : null,
    choiceLabel: String(row.choice_label ?? ""),
    choiceType: (row.choice_type ?? "talk") as ChoiceEventRecord["choiceType"],
    intent: (row.intent ?? null) as ChoiceEventRecord["intent"],
    tone: (row.tone ?? null) as ChoiceEventRecord["tone"],
    agency: (row.agency ?? null) as ChoiceEventRecord["agency"],
    choiceStyle: (row.choice_style ?? null) as ChoiceEventRecord["choiceStyle"],
    progression: (row.progression ?? null) as ChoiceEventRecord["progression"],
    romanceLevel: typeof row.romance_level === "number" ? row.romance_level : 0,
    intimacyLevel: typeof row.intimacy_level === "number" ? row.intimacy_level : 0,
    riskLevel: (row.risk_level === "medium" || row.risk_level === "high") ? row.risk_level : "low",
    createdAt: String(row.created_at ?? new Date().toISOString())
  };
}

function toDbChoiceEvent(event: ChoiceEventRecord, userId: string): Record<string, unknown> {
  return {
    id: event.id,
    user_id: userId,
    session_id: event.sessionId,
    scenario_id: event.scenarioId,
    character_id: event.characterId ?? null,
    choice_label: event.choiceLabel,
    choice_type: event.choiceType,
    intent: event.intent ?? null,
    tone: event.tone ?? null,
    agency: event.agency ?? null,
    choice_style: event.choiceStyle ?? null,
    progression: event.progression ?? null,
    romance_level: event.romanceLevel,
    intimacy_level: event.intimacyLevel,
    risk_level: event.riskLevel,
    created_at: event.createdAt
  };
}

function fromDbChoicePreferences(row: Record<string, unknown> | null): UserChoicePreferences | null {
  if (!row) return null;
  return {
    preferredIntents: isRecord(row.preferred_intents) ? (row.preferred_intents as Record<string, number>) : {},
    preferredTones: isRecord(row.preferred_tones) ? (row.preferred_tones as Record<string, number>) : {},
    preferredAgency: isRecord(row.preferred_agency) ? (row.preferred_agency as Record<string, number>) : {},
    preferredChoiceStyles: isRecord(row.preferred_choice_styles) ? (row.preferred_choice_styles as Record<string, number>) : {},
    preferredProgression: isRecord(row.preferred_progression) ? (row.preferred_progression as Record<string, number>) : {},
    romancePreferenceScore: typeof row.romance_preference_score === "number" ? row.romance_preference_score : 0,
    intimacyPreferenceScore: typeof row.intimacy_preference_score === "number" ? row.intimacy_preference_score : 0,
    storyProgressPreferenceScore: typeof row.story_progress_preference_score === "number" ? row.story_progress_preference_score : 0,
    slowBurnPreferenceScore: typeof row.slow_burn_preference_score === "number" ? row.slow_burn_preference_score : 0,
    sampleCount: typeof row.sample_count === "number" ? row.sample_count : 0,
    updatedAt: String(row.updated_at ?? new Date().toISOString())
  };
}

function toDbChoicePreferences(prefs: UserChoicePreferences, userId: string, scope: "global" | "scenario" = "global", scenarioId: string | null = null): Record<string, unknown> {
  return {
    user_id: userId,
    scope,
    scenario_id: scenarioId,
    character_id: null,
    preferred_intents: prefs.preferredIntents,
    preferred_tones: prefs.preferredTones,
    preferred_agency: prefs.preferredAgency,
    preferred_choice_styles: prefs.preferredChoiceStyles,
    preferred_progression: prefs.preferredProgression,
    romance_preference_score: prefs.romancePreferenceScore,
    intimacy_preference_score: prefs.intimacyPreferenceScore,
    story_progress_preference_score: prefs.storyProgressPreferenceScore,
    slow_burn_preference_score: prefs.slowBurnPreferenceScore,
    sample_count: prefs.sampleCount,
    updated_at: prefs.updatedAt
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function asNumber(primary: unknown, fallback: unknown, defaultValue: number) {
  if (typeof primary === "number" && Number.isFinite(primary)) return primary;
  if (typeof fallback === "number" && Number.isFinite(fallback)) return fallback;
  return defaultValue;
}

// ---------------------------------------------------------------------------
// Lorebook helpers
// ---------------------------------------------------------------------------

function buildLorebooks(
  lorebookRows: Array<Record<string, unknown>>,
  allEntryRows: Array<Record<string, unknown>>
): AppState["lorebooks"] {
  return lorebookRows.map((row) => ({
    id: String(row.id ?? ""),
    user_id: String(row.user_id ?? ""),
    title: String(row.title ?? ""),
    short_description: row.short_description ? String(row.short_description) : null,
    cover_image_url: row.cover_image_url ? String(row.cover_image_url) : null,
    visibility: (row.visibility === "public" ? "public" : "private") as "private" | "public",
    entries: allEntryRows
      .filter((e) => e.lorebook_id === row.id)
      .map((e) => e as unknown as AppState["lorebook"][number]),
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? new Date().toISOString())
  }));
}

// ---------------------------------------------------------------------------
// Scenario-scoped choice preference helpers
// ---------------------------------------------------------------------------

function buildScenarioChoicePreferences(
  rows: Array<Record<string, unknown>>
): Record<string, UserChoicePreferences> {
  const result: Record<string, UserChoicePreferences> = {};
  for (const row of rows) {
    const scenarioId = row.scenario_id ? String(row.scenario_id) : null;
    if (!scenarioId) continue;
    const prefs = fromDbChoicePreferences(row);
    if (prefs) result[scenarioId] = prefs;
  }
  return result;
}
