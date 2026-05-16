/**
 * Visual State Resolver
 *
 * 会話AIが返したvisualCueは間違っていることがあるため
 * - DBに保存された現在シーン状態 (session_environment_state)
 * - DBに保存された現在キャラ状態 (session_character_states)
 * を信頼源として visualCue を補正/解決する。
 *
 * 補正ルール:
 *   - cue.location が DB側と違う場合、DB側を優先（DBが空でcueがあればcueを採用）
 *   - cue.activeCharacters が現在登場キャラと違う場合、DB側を優先
 *   - 各キャラの outfit / mood は session_character_states を優先
 *   - cue.pov が "first_person" 以外なら "first_person" に強制
 *   - cue.eventCg = true でも重要イベント条件 (priority=high) を満たさないなら eventCg=false
 */

import type {
  ScenarioCharacter,
  SessionCharacterState,
  SessionEnvironmentState,
  VisualCue
} from "@/lib/domain/types";
import {
  buildVisualPrompt,
  fallbackForExpression,
  normalizeExpression,
  type BuildVisualPromptInput,
  type BuiltVisualPrompt,
  type ImageKind,
  type VisualActiveCharacter,
  type VisualStyle
} from "./visualPromptBuilder";

export type ResolvedVisualState = {
  sceneKey: string;
  location: string;
  timeOfDay: string;
  weather: string;
  sceneSummary: string;
  activeCharacters: VisualActiveCharacter[];
  cameraDistance: "close" | "medium" | "far" | "wide";
  pov: "first_person";
  eventCg: boolean;
  promptSummary: string | null;
  // 元のcueをトレース用に残す
  cueRaw: VisualCue;
  diagnostics: string[];
};

export type ResolveOptions = {
  cue: VisualCue;
  environment: SessionEnvironmentState | null;
  characterStates: SessionCharacterState[];
  characters: ScenarioCharacter[];
  /** 既存variantで持っている expression 一覧（差分fallback用） */
  availableExpressions?: import("@/lib/domain/types").ExpressionType[];
};

export function resolveVisualState(opts: ResolveOptions): ResolvedVisualState {
  const { cue, environment, characterStates, characters } = opts;
  const diagnostics: string[] = [];

  // POV強制
  if (cue.pov !== "first_person") {
    diagnostics.push(`pov_forced_to_first_person (was=${cue.pov})`);
  }

  // sceneKey
  const sceneKey = cue.sceneKey?.trim() || environment?.scene_key || "default_scene";

  // location: DBが入っていればそれを優先、空ならcueを使う
  let location = (environment?.location ?? "").trim();
  if (!location && cue.location) location = cue.location;
  if (cue.location && environment?.location && cue.location !== environment.location) {
    diagnostics.push(`location_overridden_by_db (cue=${cue.location}, db=${environment.location})`);
  }

  const timeOfDay = (environment?.time ?? cue.timeOfDay ?? "").toString();
  const weather = (environment?.weather ?? cue.weather ?? "").toString();
  const sceneSummary = environment?.scene || environment?.recent_event || cue.promptSummary || "";

  // active characters: DB側の現在登場キャラを優先
  // session_character_states に存在し、かつ characters (scenario_characters) に存在するものをアクティブとみなす
  const activeStates = characterStates.filter((cs) => {
    const meta = characters.find((c) => c.id === cs.character_id);
    return Boolean(meta);
  });

  // 「cue が言っている activeCharacters」と「DB側」のすり合わせ
  const cueCharNames = new Set(cue.activeCharacters.map((n) => n.trim().toLowerCase()));
  const dbActive: SessionCharacterState[] = activeStates.filter((cs) => {
    const meta = characters.find((c) => c.id === cs.character_id);
    if (!meta) return false;
    if (cueCharNames.size === 0) return true; // cueが空なら全部使う
    return cueCharNames.has(meta.name.trim().toLowerCase());
  });

  // cueにあるがDBにいないキャラは無視（=幻覚なので入れない）
  const cueButNotInDb = [...cueCharNames].filter((n) => {
    return !activeStates.some((cs) => {
      const meta = characters.find((c) => c.id === cs.character_id);
      return meta && meta.name.trim().toLowerCase() === n;
    });
  });
  if (cueButNotInDb.length > 0) {
    diagnostics.push(`dropped_cue_characters_not_in_db=${cueButNotInDb.join(",")}`);
  }

  // 万一 dbActive が0件で、cueにキャラ名がある場合は、characters から名前で引いてfallback
  const fallbackList: VisualActiveCharacter[] =
    dbActive.length === 0 && cueCharNames.size > 0
      ? characters
          .filter((c) => cueCharNames.has(c.name.trim().toLowerCase()))
          .map((c) => ({
            id: c.id,
            name: c.name,
            appearance: c.appearance,
            outfit: null,
            expression: cue.expression,
            mood: null,
            pose: cue.pose,
            relationshipToUser: null
          }))
      : [];

  let activeCharacters: VisualActiveCharacter[] = dbActive.map((cs) => {
    const meta = characters.find((c) => c.id === cs.character_id)!;
    const desiredExpr = normalizeExpression(cue.expression);
    let expr: string | null = (cs.mood && normalizeExpression(cs.mood)) || desiredExpr || null;
    // 表情差分fallback
    if (desiredExpr && opts.availableExpressions && opts.availableExpressions.length > 0) {
      const chosen = fallbackForExpression(desiredExpr, opts.availableExpressions);
      if (chosen) expr = chosen;
    }
    return {
      id: meta.id,
      name: meta.name,
      appearance: meta.appearance,
      outfit: cs.outfit || null,
      expression: expr,
      mood: cs.mood || null,
      pose: cs.pose || cue.pose || null,
      relationshipToUser: cs.relationship || null
    };
  });

  if (activeCharacters.length === 0 && fallbackList.length > 0) {
    activeCharacters = fallbackList;
    diagnostics.push("active_characters_fallback_from_cue_names");
  }

  // cameraDistance — VisualCueは "close" | "medium" | "wide" の3値、builderは"far"も受ける
  const cameraDistance: ResolvedVisualState["cameraDistance"] = cue.cameraDistance || "medium";

  // eventCg 補正: priority=high か updateType=event_cg のときだけ event_cg を許可
  const eventCgOk = cue.eventCg && (cue.priority === "high" || cue.updateType === "event_cg");
  if (cue.eventCg && !eventCgOk) {
    diagnostics.push("event_cg_demoted_priority_not_high");
  }

  return {
    sceneKey,
    location,
    timeOfDay,
    weather,
    sceneSummary,
    activeCharacters,
    cameraDistance,
    pov: "first_person",
    eventCg: eventCgOk,
    promptSummary: cue.promptSummary,
    cueRaw: cue,
    diagnostics
  };
}

export type BuildFromResolvedOptions = {
  resolved: ResolvedVisualState;
  imageKind: ImageKind;
  qualityPreset: import("@/lib/domain/types").ImageQualityPreset;
  visualStyle?: VisualStyle;
  nsfwAllowed?: boolean;
  previousImagePromptSummary?: string | null;
  /** OpenAI等の自然言語モデル用プロンプトを使うか */
  useNaturalLanguagePrompt?: boolean;
};

export function buildPromptFromResolved(opts: BuildFromResolvedOptions): BuiltVisualPrompt {
  const input: BuildVisualPromptInput = {
    sceneKey: opts.resolved.sceneKey,
    location: opts.resolved.location,
    timeOfDay: opts.resolved.timeOfDay,
    weather: opts.resolved.weather,
    sceneSummary: opts.resolved.sceneSummary || opts.resolved.promptSummary || "",
    activeCharacters: opts.resolved.activeCharacters,
    pov: "first_person",
    cameraDistance: opts.resolved.cameraDistance,
    visualStyle: opts.visualStyle ?? "visual_novel",
    imageKind: opts.imageKind,
    qualityPreset: opts.qualityPreset,
    nsfwAllowed: opts.nsfwAllowed,
    previousImagePromptSummary: opts.previousImagePromptSummary ?? null,
    useNaturalLanguagePrompt: opts.useNaturalLanguagePrompt
  };
  return buildVisualPrompt(input);
}
