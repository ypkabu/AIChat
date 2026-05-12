import { buildForbiddenRulesPrompt } from "./contentSafety";
import type {
  AppSettings,
  ForeshadowingItem,
  LorebookEntry,
  Memory,
  Message,
  PlaySession,
  RelationshipState,
  ScenarioCharacter,
  SessionCharacterState,
  SessionEnvironmentState,
  StorySummary,
  StoryBundle,
  UserChoicePreferences
} from "./domain/types";

export type PromptBuildInput = {
  bundle: StoryBundle;
  session: PlaySession;
  relationships: RelationshipState[];
  lorebook: LorebookEntry[];
  linkedLorebookEntries?: LorebookEntry[];
  memories: Memory[];
  recentMessages: Message[];
  latestUserInput: string;
  settings: AppSettings;
  environmentState?: SessionEnvironmentState | null;
  characterStates?: SessionCharacterState[];
  inputType?: "free_text" | "choice_selected" | "auto_continue" | "continue_without_user_speech";
  selectedChoice?: { label: string; type: string } | null;
  outputMode?: "json" | "ndjson";
  foreshadowingItems?: ForeshadowingItem[];
  storySummaries?: StorySummary[];
  choicePreferences?: UserChoicePreferences | null;
};

export type PromptBuildResult = {
  systemPrompt: string;
  compactContext: Record<string, unknown>;
  selectedLore: LorebookEntry[];
  selectedMemories: Memory[];
  selectedForeshadowing: ForeshadowingItem[];
};

export function buildConversationPrompt(input: PromptBuildInput): PromptBuildResult {
  const { bundle, session, relationships, recentMessages, latestUserInput, settings } = input;
  const outputMode = input.outputMode ?? "json";
  const inputType = input.inputType ?? (input.selectedChoice ? "choice_selected" : "free_text");
  const latestUserPrompt = buildLatestUserMessage(latestUserInput, inputType, input.selectedChoice);
  const playPaceMode = session.play_pace_mode ?? bundle.style.play_pace_mode ?? "normal";
  const maxAutoCount = Math.min(3, Math.max(1, bundle.style.auto_advance_message_count ?? 3));
  const maxRecentMessages = 12;
  const maxLoreItems = settings.low_cost_mode ? 3 : 5;
  const maxMemoryItems = settings.low_cost_mode ? 4 : 8;
  const maxForeshadowingItems = 5;
  const userProfile = bundle.userProfiles?.[0];
  const moods = Array.isArray(bundle.style.moods) ? bundle.style.moods : [];
  const currentScene = findCurrentScene(bundle.storyScenes, session.current_scene_key);
  const currentBeats = currentScene?.beats ?? [];
  const currentBeatIndex = clampIndex(session.current_beat_index ?? 0, currentBeats.length);
  const currentBeat = currentBeats[currentBeatIndex] ?? "現在の場面目的に沿って小さく進行する";
  const currentSceneCharacterIds = getCurrentSceneCharacterIds(bundle, session, recentMessages);
  const currentSceneCharacters = bundle.characters.filter((character) => currentSceneCharacterIds.includes(character.id));
  const currentSceneKeywords = buildCurrentSceneKeywords(currentScene, currentBeat, currentSceneCharacters, latestUserPrompt, recentMessages);
  // シナリオ専用ロア + 連動ロアブックのエントリーを結合（hidden_truth は除外してから渡す）
  const allLoreEntries = [
    ...input.lorebook,
    ...(input.linkedLorebookEntries ?? []).map((e) => ({ ...e, hidden_truth: "" }))
  ];
  const selectedLore = selectRelevantLore(allLoreEntries, currentSceneKeywords, maxLoreItems);
  const selectedMemories = selectRelevantMemories(input.memories, currentSceneKeywords, currentSceneCharacters, maxMemoryItems, session.id);
  const recentPromptMessages = recentMessages.slice(-maxRecentMessages);
  const selectedSummaries = selectRecentSummaries(input.storySummaries ?? [], session.id);
  const targetTurns = currentScene?.target_turns ?? 4;
  const maxTurns = currentScene?.max_turns ?? 7;
  const remainingTurns = Math.max(0, maxTurns - (session.scene_turn_count ?? 0));
  const forceSceneTransition = remainingTurns <= 0;
  const antiStallTriggered = shouldTriggerAntiStall(session, recentMessages);
  const selectedForeshadowing = selectRelevantForeshadowing(
    input.foreshadowingItems ?? bundle.foreshadowingItems ?? [],
    currentSceneCharacterIds,
    maxForeshadowingItems
  );
  const infoBoxEnvironment = buildEnvironmentSummary(input.environmentState ?? null, session, bundle);
  const infoBoxCharacters = buildCharacterStateSummary(
    input.characterStates ?? [],
    currentSceneCharacters.length ? currentSceneCharacters : bundle.characters.slice(0, 3)
  );
  const situationSummary = buildSituationSummary(infoBoxEnvironment, session, bundle);
  const moodSummary = moods.slice(0, 3).join(" / ");

  if (antiStallTriggered) {
    console.warn("[Story Director] Anti-Stall triggered", {
      sessionId: session.id,
      sceneKey: session.current_scene_key,
      stallCount: session.stall_count,
      qualityStallCount: session.quality_stall_count,
      lastQualityScore: session.last_quality_score
    });
  }

  const experienceMode = settings.experience_mode ?? "story";
  const isGirlfriendMode = experienceMode === "girlfriend";

  const systemPrompt = [
    isGirlfriendMode ? "[AI彼女モード - 優先指示]" : "[STORY DIRECTOR - 最優先指示]",
    isGirlfriendMode
      ? "このセッションはAI彼女モードです。日常会話・恋愛会話を中心に、キャラクターとの関係構築を重視してください。章・伏線・ビートの厳格な管理より、自然な感情表現と会話の流れを優先してください。"
      : `Scene Objective: ${currentScene?.objective || session.scene_objective || bundle.scenario.objective}`,
    ...(!isGirlfriendMode ? [
    `Turn Budget: 残り ${remainingTurns} ターン`,
    `Current Conflict: ${currentScene?.conflict || session.last_conflict || "軽い葛藤を維持する"}`,
    `Hook: ${currentScene?.hook || session.last_hook || "次を読みたくなる小さなフックを残す"}`,
    ] : []),
    `Current Scene: ${session.current_scene_key}`,
    ...(!isGirlfriendMode ? [
    `Current Beat: ${currentBeat}`,
    `Beat List: ${currentBeats.join(" -> ") || "未設定"}`,
    `Scene Turns: ${session.scene_turn_count ?? 0} / target=${targetTurns} / max=${maxTurns}`,
    ] : []),
    `Stall Count: ${session.stall_count ?? 0}（連続停滞ターン数）`,
    `Play Pace: ${playPaceMode}`,
    `Anti-Stall: ${antiStallTriggered ? "展開を進めろ。同じ会話を繰り返すな。" : "同じ質問・感情確認・逡巡を繰り返さず、小さな新情報か行動で場面目的へ寄せる。"}`,
    ...(!isGirlfriendMode ? [
    forceSceneTransition ? "Scene Transition: Turn Budget が 0。次の返信でシーン遷移、または次シーンへつながる明確なフックを必ず入れる。" : "Scene Transition: まだ自然進行。ただし残りターン内に目的達成へ近づける。",
    buildDirectorRule(session, targetTurns, { forceSceneTransition, antiStallTriggered, remainingTurns }),
    ...(selectedForeshadowing.length > 0
      ? [`Unresolved Foreshadowing (${selectedForeshadowing.length}): ${selectedForeshadowing.map((item) => item.title).join(", ")}`]
      : []),
    ] : []),
    ...((session.last_quality_score ?? 10) <= 4 && session.last_quality_problem
      ? [`Previous Quality Problem: ${session.last_quality_problem}`]
      : []),
    "",
    "あなたはインタラクティブストーリーの語り手です。",
    buildOutputStyleRules(outputMode, inputType),
    "アプリ側が人格、関係値、メモリ、ストーリー状態を保持します。あなたは必要な生成だけを行います。",
    "Info Box の hidden_intent / inner_thoughts は非公開情報。本文、台詞、選択肢に直接出さず、背景理解のみに使う。",
    "NSFW は成人確認済みかつ該当トグル ON の時だけ許可されます。禁止カテゴリは NSFW ON でも扱いません。",
    "",
    "禁止カテゴリ:",
    buildForbiddenRulesPrompt(),
    "",
    `シナリオ: ${bundle.scenario.title} / ${shorten(bundle.scenario.description, 90)}`,
    `状況: ${shorten(bundle.scenario.situation, 120)}`,
    `目的: ${shorten(bundle.scenario.objective, 120)}`,
    `関係性: ${shorten(bundle.scenario.relationship_setup, 120)}`,
    `避けたい展開: ${shorten(bundle.scenario.forbidden_content, 120)}`,
    "",
    `スタイル: 視点=${bundle.style.narration_perspective}, 時制=${bundle.style.tense}, 長さ=${bundle.style.response_length}, 文体=${bundle.style.prose_style}, 雰囲気=${moodSummary || "なし"}`,
    `進行: mode=${playPaceMode}, 難易度=${bundle.style.difficulty}, 速度=${bundle.style.pacing}, 選択肢=${bundle.style.provide_choices ? "あり" : "なし"}`,
    `オート進行状態: auto_continue_count=${session.auto_continue_count ?? 0}, max_auto_continue=${maxAutoCount}`,
    "",
    "進行モード指示:",
    buildPaceModePrompt(playPaceMode, maxAutoCount),
    "Narrative Quality Guidance:",
    buildQualityRule(session),
    "",
    buildResponseFormatPrompt(outputMode, playPaceMode, input.choicePreferences, settings),
    "",
    "キャラクター:",
    (currentSceneCharacters.length ? currentSceneCharacters : bundle.characters.slice(0, 3))
      .map(
        (character) =>
          `- ${character.name}: 役割=${shorten(character.role, 70)}; 性格=${shorten(character.personality, 90)}; 口調=${shorten(character.speaking_style, 70)}; 一人称=${character.first_person}; 呼称=${character.user_call_name}`
      )
      .join("\n"),
    "",
    `ユーザー: ${userProfile?.display_name ?? "ユーザー"} / ${shorten(userProfile?.role ?? "", 60)} / ${shorten(userProfile?.personality ?? "", 60)} / ${shorten(userProfile?.speaking_style ?? "", 60)}`,
    "",
    `ストーリー状態: scene=${session.current_scene_key}, chapter=${session.chapter_index}, progress=${session.progress_percent}, objective=${shorten(session.scene_objective, 80)}`,
    `短い状況: ${situationSummary}`,
    `関係値: ${relationships
      .map((rel) => {
        const character = bundle.characters.find((item) => item.id === rel.character_id);
        return `${character?.name ?? rel.character_id}: trust=${rel.trust}, affection=${rel.affection}, comfort=${rel.comfort}, curiosity=${rel.curiosity}, tension=${rel.tension}, label=${rel.relationship_label}`;
      })
      .join(" / ")}`,
    "",
    ...buildOptionalSection("Info Box: キャラ状態", infoBoxCharacters),
    ...buildOptionalSection(
      "関連ロアブック",
      selectedLore.map((lore) => {
        const typeLabel = lore.entry_type && lore.entry_type !== "other" ? ` [${lore.entry_type}]` : "";
        const prefix = `- ${lore.title}${typeLabel}`;
        // hidden エントリーは content のみ投入（hidden_truth は絶対に含めない）
        const body = lore.is_hidden ? shorten(lore.content, 400) : shorten(lore.content, lore.always_include ? 1200 : 360);
        return `${prefix}: ${body}`;
      })
    ),
    ...buildOptionalSection(
      "関連伏線",
      selectedForeshadowing.length ? [buildForeshadowingPrompt(selectedForeshadowing, session.current_scene_key)] : []
    ),
    ...buildOptionalSection(
      "User Choice Preference Summary",
      buildChoicePreferenceSummary(input.choicePreferences, settings)
    ),
    ...buildOptionalSection(
      "関連メモリ",
      selectedMemories.map((memory) => `- ${memory.type}/importance=${memory.importance}: ${shorten(memory.content, 220)}`)
    ),
    ...buildOptionalSection(
      "以前の会話の要約",
      selectedSummaries.map((summary) => `[${summary.start_turn_index}〜${summary.end_turn_index}ターンのサマリー]\n${summary.summary}`)
    ),
    "",
    "直近会話:",
    recentPromptMessages
      .map((message) => `${message.speaker_name ?? message.speaker_type}: ${message.content}`)
      .join("\n"),
    "",
    `ユーザー最新入力: ${latestUserPrompt}`
  ].join("\n");
  const promptSectionApproxTokens = estimatePromptSectionTokens(systemPrompt);

  if (process.env.NODE_ENV !== "production") {
    console.debug("[Prompt Builder] section token estimate", promptSectionApproxTokens);
  }

  return {
    systemPrompt,
    compactContext: {
      scenarioId: bundle.scenario.id,
      sessionId: session.id,
      latestUserInput: latestUserPrompt,
      inputType,
      outputMode,
      responseLength: bundle.style.response_length,
      nsfwChatEnabled: settings.adult_confirmed && settings.nsfw_chat_enabled,
      playPaceMode,
      autoContinueCount: session.auto_continue_count ?? 0,
      maxAutoCount,
      selectedLoreIds: selectedLore.map((item) => item.id),
      selectedMemoryIds: selectedMemories.map((item) => item.id),
      selectedSummaryIds: selectedSummaries.map((item) => item.id),
      currentSceneId: currentScene?.id ?? null,
      currentBeat,
      remainingTurns,
      forceSceneTransition,
      antiStallTriggered,
      selectedForeshadowingIds: selectedForeshadowing.map((item) => item.id),
      promptInputApproxTokens: estimatePromptTokens(selectedLore, selectedMemories, selectedSummaries, recentPromptMessages),
      promptSectionApproxTokens
    },
    selectedLore,
    selectedMemories,
    selectedForeshadowing
  };
}

function buildPaceModePrompt(mode: string, maxAutoCount: number) {
  if (mode === "auto") {
    return [
      "- timeline item は6〜8個。長めに展開。",
      "- choices は出すな。",
      "- ユーザー入力がなくても場面を進めろ。",
      "- ナレーション多め、キャラ行動を自動描写する。",
      "- 重要な分岐、ユーザーの意思確認が必要な場面、NSFW展開に入る前、画像生成候補がある場合は必ず needsUserInput=true / autoContinueAllowed=false。",
      `- 最大${maxAutoCount}回までしか連続自動生成しない想定。安全に続けられる日常会話や軽い場面描写だけ autoContinueAllowed=true。`
    ].join("\n");
  }

  if (mode === "choice_heavy") {
    return [
      "- timeline item は3〜5個。短めに止めろ。",
      "- 選択肢は4〜5個。各選択肢に括弧で短い結果ヒントを付ける。",
      "- 選択肢ごとの effect、分岐、フラグ、関係値変化を normal より明確に使う。",
      "- 選択の結果で展開が分岐することを意識した書き方にする。",
      "- ユーザーの選択を待ってから展開する。needsUserInput=true を基本にする。"
    ].join("\n");
  }

  return [
    "- timeline item は5〜7個。",
    "- 選択肢は2〜3個。",
    "- キャラ発言とナレーションをバランスよく入れる。",
    "- 基本的に needsUserInput=true / autoContinueAllowed=false。"
  ].join("\n");
}

function buildOutputStyleRules(outputMode: "json" | "ndjson", inputType: "free_text" | "choice_selected" | "auto_continue" | "continue_without_user_speech") {
  const outputFormat =
    outputMode === "ndjson"
      ? [
          "【出力ルール】",
          "- 1行1JSONのNDJSON形式で出力しろ。JSONをまとめるな。",
          "- type は narration / dialogue / choices / director のみ。",
          "- dialogue の content には行動描写とセリフを混ぜ、区切りは \\n を使う。",
          "- 最後に choices、その次に director を出力する。auto モードでは choices を省略してよい。"
        ].join("\n")
      : [
          "【出力ルール】",
          "- 返答は必ず JSON オブジェクトのみ。Markdown、前置き、コードブロックは禁止。",
          "- メイン応答は timeline / suggestedReplies / directorUpdate の3系統だけを返す。",
          "- timeline item は narration / character / system / event を使う。character は dialogue 相当で、characterName を必ず入れる。",
          "- character content には行動描写とセリフを混ぜ、区切りは \\n を使う。"
        ].join("\n");

  return [
    outputFormat,
    "",
    "【文体ルール】",
    "- ライトノベル風。短文。体言止め多用。",
    "- 行動描写は三人称。短く鋭く。「耳ぺたん。」「目を逸らす。」「唇を噛んだ。」",
    "- セリフは口語。キャラの個性が出る話し方にしろ。",
    "- 行動描写とセリフを交互に混ぜろ。1つの dialogue/character item 内で \\n で区切れ。",
    "- ナレーションは環境・状況・雰囲気だけ。1〜2文。セリフを入れるな。",
    "- 長い段落を書くな。各 content は最大4行(4つの\\n区切り)まで。",
    "- response_length が short でも item 数は減らすな。短くするのは各 item の文量だけ。",
    "- 同じキャラが連続で2つの dialogue/character item を出すな。間にナレーションか別キャラを挟め。",
    "",
    buildUserDescriptionRules(inputType),
    "",
    "【禁止事項】",
    "- 同じ質問を2ターン連続で繰り返すな。",
    "- 前のターンと同じ行動描写を使い回すな。",
    "",
    "【展開ルール】",
    "- 毎ターン必ず1つ以上の新しい情報を入れろ（新キャラ登場/環境変化/伏線提示/関係性変化）。",
    "- シーン目的に向かって展開を進めろ。同じ場所で足踏みするな。",
    "- 会話だけで終わらせるな。行動・環境変化・小イベントを混ぜろ。"
  ].join("\n");
}

function buildUserDescriptionRules(inputType: "free_text" | "choice_selected" | "auto_continue" | "continue_without_user_speech") {
  const selectedChoiceRules = [
    "●選択肢モード（ユーザーが選択肢を選んだ場合）:",
    "- {{user}}の行動・セリフ・感情・思考を自由に書いてよい。",
    "- 選択肢の意図に沿った描写にしろ。大きく逸脱するな。",
    "- {{user}}の描写は timeline の最初の1〜2 itemで行い、その後にキャラの反応を続けろ。"
  ];
  const freeTextRules = [
    "●自由入力モード（ユーザーがテキストを自分で入力した場合）:",
    "- {{user}}のセリフはユーザーが入力したテキストのみ。追加セリフを勝手に足すな。",
    "- {{user}}の行動はユーザーが入力した内容から推測できる範囲のみ。",
    "- OK: ユーザーが「おはよう」→「軽く手を挙げた。」程度の付随動作。",
    "- NG: ユーザーが「おはよう」→「シルバーの頭を撫でた。」（入力にない行動の捏造）。"
  ];
  const autoRules = [
    "●オート進行モード:",
    "- ユーザーの新規セリフや重大な行動を捏造しない。",
    "- 場面、環境、キャラ側の行動で安全に進め、重要分岐では入力待ちに戻せ。"
  ];
  const silentContinueRules = [
    "●沈黙見守りモード（{{user}}は今回発言しない）:",
    "- {{user}}の長いセリフや行動宣言を絶対に捏造しない。",
    "- {{user}}が重要な決断をしたことにしない。同意・拒否・承諾・告白・暴力などの確定行動を捏造しない。",
    "- NSFW展開に自発的に入らない。告白、キス、戦闘開始、契約、裏切りなど重大行動を勝手に確定しない。",
    "- 伏線の hidden_truth を条件未達で明かさない。関係値を大きく動かさない。",
    "してよいこと:",
    "- キャラが{{user}}の沈黙に気づいて反応する。",
    "- キャラ同士が会話する。ナレーションで状況を少し進める。",
    "- 小さな環境変化、伏線の軽い再提示、相手キャラの質問継続、別キャラの割り込み。",
    "- scene objective に少し近づける。stall回避の小イベント。",
    "- relationshipDelta は trust/affection/comfort/curiosity/tension 各 -1〜+1 の範囲に収める。"
  ];

  return [
    "【{{user}}の描写ルール】",
    "●共通（全モード）:",
    "- {{user}}の感情・思考は、テキストや会話の流れから自然に推測できる範囲なら書いてよい。",
    "- OK: 「胸の奥がじんわり温かくなった。」（キャラに優しくされた流れ）。",
    "- OK: 「少しだけ気まずい。」（気まずい状況の流れ）。",
    "- NG: 「{{user}}は実はシルバーのことが好きだった。」（ユーザーが示していない重大な感情の捏造）。",
    "- {{user}}の感情描写もライトノベル風の短文で書け。",
    "",
    ...(inputType === "choice_selected"
      ? selectedChoiceRules
      : inputType === "auto_continue"
        ? autoRules
        : inputType === "continue_without_user_speech"
          ? silentContinueRules
          : freeTextRules)
  ].join("\n");
}

function buildResponseFormatPrompt(
  outputMode: "json" | "ndjson",
  playPaceMode: string,
  prefs?: UserChoicePreferences | null,
  settings?: AppSettings
) {
  const choiceRule =
    playPaceMode === "auto"
      ? "- auto では suggestedReplies と smartReplies は出さない。"
      : playPaceMode === "choice_heavy"
        ? "- choice_heavy では suggestedReplies を4〜5個出し、各 label に短い結果ヒントを付ける。smartReplies は1〜2個。"
        : "- normal では suggestedReplies を2〜3個、smartReplies を2〜3個出す。";

  const isGirlfriend = (settings?.experience_mode ?? "story") === "girlfriend";
  const strength = settings?.preference_strength ?? "normal";
  const hasPrefs = prefs && prefs.sampleCount >= 3;
  const alignPct = hasPrefs
    ? (isGirlfriend ? (strength === "high" ? 65 : strength === "low" ? 45 : 55)
                    : (strength === "high" ? 55 : strength === "low" ? 30 : 45))
    : 0;

  const choiceMetaRule = [
    "- 各 suggestedReply に intent / tone / agency / choiceStyle / progression / romanceLevel / intimacyLevel / riskLevel / why を必ず設定する。",
    "- intent は honest/tease/comfort/flirt/affection/observe/silent/dominant/submissive/avoid/action/question/meta/intimate から1つ選ぶ。",
    "- tone は casual/sweet/romantic/serious/playful/dark/intimate/comedy/calm/tense から1つ選ぶ。",
    "- agency は active/passive/vulnerable/assertive/reserved/supportive/teasing/protective から1つ選ぶ。",
    "- choiceStyle は keyword/sentence/short/natural/detailed/action_only/line_only/mixed から1つ選ぶ。",
    "- progression は story_forward/relationship/world_lore/character_focus/event_trigger/slow_burn/conflict/recovery から1つ選ぶ。",
    "- why: この選択肢を生成した短い理由（15字以内・日本語）。debug表示用。",
    hasPrefs
      ? `- 選択肢配分: 約${alignPct}%をユーザー好みに、${isGirlfriend ? "25" : "30"}%をシーン目的に必要な選択肢に、残りを意外性・リスク・別方向に割り当てる。全選択肢を同じ方向に寄せてはいけない。`
      : "- 選択肢は多様な方向性を含めること。全部同じ方向に偏らない。"
  ].join("\n");

  const sharedChoices = [
    "- 選択肢には毎回異なる type を最低2種類含める。",
    "- talk と action だけに偏らず、observe / silence / approach / leave / question / avoid / honest / flirt / intimate から状況に合うものを使う。",
    "- 状況に合う場合、suggestedReplies の最後に type: silence の「黙って様子を見る」系の選択肢を1つ含めてよい（例: 「……何も言わず様子を見る」「黙って相手の反応を待つ」）。重要分岐やNSWF直前では不要。",
    choiceRule,
    choiceMetaRule
  ].join("\n");

  if (outputMode === "ndjson") {
    return [
      "NDJSON形式:",
      '- timeline item: {"type":"narration","content":"..."} または {"type":"dialogue","speaker":"キャラ名","content":"..."}',
      '- choices: {"type":"choices","items":[{"label":"...","type":"talk"}]}',
      '- director: {"type":"director","scene_objective":"...","remaining_turns":3}',
      sharedChoices,
      "- director は scene_objective と remaining_turns を必ず含め、必要なら currentBeatIndex / shouldAdvanceScene / shouldIntroduceEvent / reason も含める。",
      "- hiddenTruth に相当する秘密や未公開真相を、本文、台詞、ナレーション、選択肢へ直接出さない。"
    ].join("\n");
  }

  return [
    "JSON形式:",
    "- メイン応答は timeline / suggestedReplies / smartReplies / directorUpdate の4系統だけを返す。memoryCandidates / relationshipDelta / imageCue / foreshadowingUpdates / qualityCheck は返さない。",
    "- timeline: 表示順の配列。type は narration / character / system / event。character の場合だけ characterName を入れる。",
    "- suggestedReplies: 物語分岐の選択肢（ラベルはアクション名、例：「楽譜について尋ねる」「黙って様子を見る」）。",
    "- smartReplies: ユーザーが実際に入力しそうな自然な発言文の候補（日本語短文、例：「ごめん、邪魔するつもりじゃなかった」）。最大3件。",
    sharedChoices,
    "- directorUpdate: 現在ビート、目的達成、停滞リスク、シーン進行判断、小イベント導入判断、理由を必ず返す。重要分岐、NSFW突入前、画像化したい節目では shouldIntroduceEvent=true にする。",
    "- continueSuggestion: { available: true/false, label: 「黙って様子を見る」等の自然な文言, reason: 理由 }。この場面で「続きを見る」が自然かどうかを返す。重要分岐・NSFW直前・伏線回収直前・告白/戦闘/契約開始時は available=false にする。",
    "- characterControl: { targetCharacter: キャラ名, expression: 表情キー, motion: モーションキー, gaze: 視線, cameraDistance: close/medium/wide, position: left/center/right, intensity: 0.0-1.0 }。3Dモデルの表示制御用。表情は neutral/smile/blush/embarrassed/annoyed/angry/sad/worried/surprised/serious から選ぶ。モーションは idle/idle_breathing/nod/shake_head/look_away/look_at_user/cross_arms/hand_on_chest/small_wave/shy_shift/surprised_step から選ぶ。シーンの感情に合わせて毎ターン必ず返す。",
    "- hiddenTruth に相当する秘密や未公開真相を、本文、台詞、ナレーション、選択肢へ直接出さない。"
  ].join("\n");
}

export function buildLatestUserMessage(
  text: string,
  inputType: "free_text" | "choice_selected" | "auto_continue" | "continue_without_user_speech" = "free_text",
  selectedChoice?: { label: string; type: string } | null
) {
  if (inputType === "choice_selected" && selectedChoice?.label) {
    return `{{user}}は【${selectedChoice.label}】を選んだ。（type: ${selectedChoice.type}）\nこの選択に基づいて{{user}}の行動と周囲の反応を描写しろ。`;
  }
  if (inputType === "continue_without_user_speech") {
    return "【沈黙見守り】{{user}}は今は発言せず、相手の反応や状況を静かに見守っている。{{user}}の長いセリフ・重要な決断・NSFW展開への移行を捏造せず、キャラ側の自然な反応や環境変化で場面を少し進めろ。";
  }
  return text;
}

function buildDirectorRule(
  session: PromptBuildInput["session"],
  targetTurns: number,
  options?: { forceSceneTransition?: boolean; antiStallTriggered?: boolean; remainingTurns?: number }
) {
  const forced =
    options?.forceSceneTransition ||
    options?.antiStallTriggered ||
    (session.scene_turn_count ?? 0) >= targetTurns ||
    (session.stall_count ?? 0) >= 2 ||
    (session.quality_stall_count ?? 0) >= 2 ||
    (session.last_quality_score ?? 10) <= 4;
  return [
    "- 同じ質問、同じ感情確認、同じ逡巡を繰り返さない。",
    "- 3ターン以上同じ話題で停滞させず、必要なら小さな出来事、新情報、具体行動、環境変化を入れる。",
    "- ユーザーの自由入力を尊重し、物語の軸と現在シーン目的へ自然に戻す。",
    options?.remainingTurns === 0 ? "- 残りターンが0なので、現シーンを締める行動・フック・次シーンへの移行を優先する。" : "- Turn Budget 内で目的達成へ向けてビートを進める。",
    forced ? "- 強制改善: 次の返信では必ず小さな展開を入れる。急な大事件ではなく、現在の目的に沿う新情報か行動にする。" : "- 進行は自然に、ただし場面目的から離れすぎない。"
  ].join("\n");
}

function shouldTriggerAntiStall(session: PromptBuildInput["session"], recentMessages: Message[]) {
  if ((session.stall_count ?? 0) >= 2 || (session.quality_stall_count ?? 0) >= 2) return true;

  const recentAssistantTimeline = recentMessages
    .filter((message) => message.role === "assistant" && ["narration", "character", "event"].includes(message.message_type))
    .slice(-3);
  if (recentAssistantTimeline.length < 3) return false;

  return !recentAssistantTimeline.some(hasNewInformationSignal);
}

function hasNewInformationSignal(message: Message) {
  if (message.message_type === "event" || message.message_type === "image") return true;

  const text = message.content.trim();
  if (!text) return false;

  return /足音|通知|鍵|手がかり|秘密|伏線|違和感|現れ|割り込|変わ|近づ|離れ|開け|閉め|拾|置い|隠|見つ|気づ|震え|逸ら|噛ん|笑っ|泣|黙っ|止ま|走|鳴っ|揺れ|光っ|影|匂い|冷た|熱/.test(text);
}

function buildForeshadowingPrompt(items: ForeshadowingItem[], currentSceneKey: string) {
  const rules = [
    "- hiddenTruth は条件を満たすまで本文に出さない。",
    "- 同じ伏線を連続で繰り返さない。"
  ];
  const rows = items.map((item) => {
    const hidden = item.hidden_truth ? `hiddenTruth(非公開)=${item.hidden_truth}` : "hiddenTruth(非公開)=未設定";
    return `- ${item.title}: status=${item.status}; importance=${item.importance}; clue=${shorten(item.clue_text, 120)}; ${hidden}; scene=${currentSceneKey}`;
  });
  return [...rules, "関連伏線:", ...rows].join("\n");
}

function buildQualityRule(session: PromptBuildInput["session"]) {
  const shouldIncludeImprovement = (session.last_quality_score ?? 10) <= 4 && (session.last_quality_problem || session.last_improvement_hint);
  const rules = [
    "- 各ターンで最低1つは、新情報、具体的行動、感情変化、関係変化、場面変化、伏線、ユーザーへの選択圧を含める。",
    "- 現在シーン目的へ少しでも近づける。詳細採点はバックグラウンドで行うため、メイン応答には採点結果を含めない。"
  ];
  if (!shouldIncludeImprovement) return rules.join("\n");
  return [
    ...rules,
    `前回の低スコア項目=${session.last_quality_problem ?? "不明"} / 次の応答ではこれらを意識しろ: ${session.last_improvement_hint ?? "新情報、具体行動、選択圧、シーン目的への前進"}`
  ].join("\n");
}

function selectRelevantLore(lorebook: LorebookEntry[], contextKeywords: string, maxItems: number) {
  const haystack = contextKeywords.toLowerCase();

  return lorebook
    .map((entry) => {
      const keywordHits = entry.keywords.filter((keyword) => keyword.length > 0 && haystack.includes(keyword.toLowerCase())).length;
      const titleHit = entry.title && haystack.includes(entry.title.toLowerCase());
      const score = (entry.always_include ? 30 : 0) + entry.importance * 4 + keywordHits * 25 + (titleHit ? 18 : 0);
      return { entry, score, matched: entry.always_include || keywordHits > 0 || titleHit };
    })
    .filter(({ matched }) => matched)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxItems)
    // hidden_truth は絶対にプロンプトに含めない
    .map(({ entry }) => ({ ...entry, hidden_truth: "" }));
}

const MEMORY_TYPE_BONUS: Partial<Record<string, number>> = {
  user_memory: 15,
  promise: 15,
  character_memory: 10,
  relationship_memory: 10,
  preference: 8
};

function selectRelevantMemories(
  memories: Memory[],
  contextKeywords: string,
  currentCharacters: ScenarioCharacter[],
  maxItems: number,
  sessionId?: string
) {
  const haystack = contextKeywords.toLowerCase();
  const characterNames = currentCharacters.map((character) => character.name.toLowerCase());
  const candidates = memories
    .filter((memory) => memory.include_in_prompt)
    .map((memory) => {
      const text = memory.content.toLowerCase();
      const keywordHit = text.split(/\s+/).some((word) => word.length > 1 && haystack.includes(word));
      const characterHit = characterNames.some((name) => name.length > 0 && text.includes(name));
      const sessionBonus = sessionId && memory.session_id === sessionId ? 10 : 0;
      const typeBonus = MEMORY_TYPE_BONUS[memory.type] ?? 0;
      const protectedMemory = memory.importance >= 3 || isExplicitUserFact(memory);
      return {
        memory,
        protectedMemory,
        score: memory.importance * 20 + (characterHit ? 30 : 0) + (keywordHit ? 20 : 0) + typeBonus + sessionBonus
      };
    })
    .filter(({ memory, protectedMemory, score }) => protectedMemory || score >= 25);

  const protectedMemories = candidates
    .filter(({ protectedMemory }) => protectedMemory)
    .sort((a, b) => b.score - a.score)
    .map(({ memory }) => memory);
  const lowImportance = candidates
    .filter(({ protectedMemory }) => !protectedMemory)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(0, maxItems - protectedMemories.length))
    .map(({ memory }) => memory);
  const merged = [...protectedMemories, ...lowImportance];
  return merged.slice(0, maxItems);
}

function selectRecentSummaries(summaries: StorySummary[], sessionId: string) {
  return summaries
    .filter((summary) => summary.session_id === sessionId)
    .sort((a, b) => a.start_turn_index - b.start_turn_index)
    .slice(-2);
}

function buildCurrentSceneKeywords(
  currentScene: ReturnType<typeof findCurrentScene>,
  currentBeat: string,
  currentCharacters: ScenarioCharacter[],
  latestUserInput: string,
  recentMessages: Message[]
) {
  return [
    latestUserInput,
    currentScene?.title,
    currentScene?.objective,
    currentScene?.conflict,
    currentScene?.hook,
    currentBeat,
    ...currentCharacters.map((character) => `${character.name} ${character.role} ${character.background}`),
    ...recentMessages.slice(-8).map((message) => `${message.speaker_name ?? ""} ${message.content}`)
  ]
    .filter(Boolean)
    .join(" ");
}

function buildEnvironmentSummary(
  environment: SessionEnvironmentState | null,
  session: PlaySession,
  bundle: StoryBundle
) {
  const fallback = {
    date: "",
    time: "",
    location: bundle.intro.start_location || "",
    weather: "",
    scene: bundle.intro.start_situation || bundle.scenario.situation || "",
    current_objective: session.scene_objective || bundle.scenario.objective || "",
    recent_event: "",
    next_pressure: "",
    chapter: `第${session.chapter_index}章`,
    scene_key: session.current_scene_key
  };
  const env = environment ?? fallback;
  const parts = [
    ["location", env.location || fallback.location],
    ["scene", env.scene || fallback.scene],
    ["current_objective", env.current_objective || fallback.current_objective],
    ["recent_event", env.recent_event || fallback.recent_event],
    ["next_pressure", env.next_pressure || fallback.next_pressure],
    ["time", env.time || fallback.time],
    ["weather", env.weather || fallback.weather]
  ]
    .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    .map(([key, value]) => `${key}=${shorten(String(value), 70)}`);

  return parts.join(" / ");
}

function buildSituationSummary(environmentSummary: string, session: PlaySession, bundle: StoryBundle) {
  const fallback = session.scene_objective || bundle.scenario.objective || "";
  const core = environmentSummary || shorten(fallback, 80);
  return core.length > 0 ? core : "状況未設定";
}

function buildCharacterStateSummary(states: SessionCharacterState[], characters: ScenarioCharacter[]) {
  const byCharacter = new Map(states.map((state) => [state.character_id, state] as const));
  return characters.map((character) => {
    const state = byCharacter.get(character.id);
    if (!state) return `- ${character.name}: 状態未設定`;
    const visibleParts = [
      ["mood", state.mood],
      ["condition", state.condition],
      ["outfit", state.outfit],
      ["pose", state.pose],
      ["goal", state.goal],
      ["relationship", state.relationship],
      ["inventory", state.inventory],
      ["last_action", state.last_action]
    ]
      .filter(([, value]) => typeof value === "string" && value.trim().length > 0)
      .map(([key, value]) => `${key}=${shorten(String(value), 70)}`);
    const hiddenParts = [
      state.inner_thoughts ? `inner_thoughts(非公開)=${shorten(state.inner_thoughts, 70)}` : "",
      state.hidden_intent ? `hidden_intent(非公開)=${shorten(state.hidden_intent, 70)}` : ""
    ].filter((value) => value.length > 0);
    const parts = [...visibleParts, ...hiddenParts];
    if (parts.length === 0) return `- ${character.name}: 状態未設定`;
    return `- ${character.name}: ${parts.join("; ")}`;
  });
}

function buildOptionalSection(title: string, rows: string[]) {
  const filtered = rows.filter((row) => row.trim().length > 0);
  return filtered.length ? [title + ":", ...filtered, ""] : [];
}

function isExplicitUserFact(memory: Memory) {
  if (memory.type === "user_memory" || memory.type === "preference" || memory.type === "promise") return true;
  return /名前|職業|仕事|好み|好き|苦手|一人称|呼び方|住|年齢|趣味/.test(memory.content);
}

function shorten(value: string | null | undefined, maxLength: number) {
  const text = (value ?? "").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function estimatePromptTokens(
  lore: LorebookEntry[],
  memories: Memory[],
  summaries: StorySummary[],
  messages: Message[]
) {
  const text = [
    ...lore.map((item) => item.content),
    ...memories.map((item) => item.content),
    ...summaries.map((item) => item.summary),
    ...messages.map((item) => item.content)
  ].join("\n");
  return Math.ceil(text.length / 3.5);
}

function estimatePromptSectionTokens(systemPrompt: string) {
  const sectionTitles = [
    "STORY DIRECTOR",
    "出力ルール",
    "シナリオ",
    "キャラクター",
    "ユーザー",
    "関連ロアブック",
    "関連伏線",
    "関連メモリ",
    "以前の会話の要約",
    "直近会話",
    "短い状況",
    "Info Box: キャラ状態"
  ];
  return Object.fromEntries(
    sectionTitles.map((title) => {
      const index = systemPrompt.indexOf(title);
      if (index === -1) return [title, 0];
      const nextIndexes = sectionTitles
        .filter((candidate) => candidate !== title)
        .map((candidate) => systemPrompt.indexOf(candidate, index + title.length))
        .filter((candidate) => candidate > index);
      const end = nextIndexes.length ? Math.min(...nextIndexes) : systemPrompt.length;
      return [title, Math.ceil(systemPrompt.slice(index, end).length / 3.5)];
    })
  );
}

function findCurrentScene(scenes: PromptBuildInput["bundle"]["storyScenes"] | undefined, sceneKey: string) {
  return scenes?.find((scene) => scene.scene_key === sceneKey) ?? scenes?.[0] ?? null;
}

function getCurrentSceneCharacterIds(bundle: StoryBundle, session: PlaySession, recentMessages: Message[]) {
  const scenarioCharacterIds = new Set(bundle.characters.map((character) => character.id));
  const ids = new Set<string>();

  recentMessages
    .filter((message) => message.message_type === "character" && message.speaker_type === "character")
    .slice(-12)
    .forEach((message) => {
      if (message.speaker_id && scenarioCharacterIds.has(message.speaker_id)) {
        ids.add(message.speaker_id);
        return;
      }
      const byName = bundle.characters.find((character) => character.name === message.speaker_name);
      if (byName) ids.add(byName.id);
    });

  if (ids.size === 0 && (session.scene_turn_count ?? 0) <= 1) {
    bundle.intro.appearing_character_ids
      .filter((id) => scenarioCharacterIds.has(id))
      .forEach((id) => ids.add(id));
  }

  return [...ids];
}

function clampIndex(index: number, length: number) {
  if (length <= 0) return 0;
  return Math.min(Math.max(0, index), length - 1);
}

function selectRelevantForeshadowing(
  items: ForeshadowingItem[],
  currentSceneCharacterIds: string[],
  maxItems: number
) {
  const activeStatuses = new Set(["planned", "introduced", "developing", "ready"]);
  const sceneCharacterIds = new Set(currentSceneCharacterIds);
  const scored = items
    .filter((item) => activeStatuses.has(item.status))
    .map((item) => {
      const relatedCharacter = Boolean(item.related_character_id && sceneCharacterIds.has(item.related_character_id));
      const highImportance = item.importance >= 4;
      const score =
        item.importance * 12 +
        (item.status === "ready" ? 45 : 0) +
        (relatedCharacter ? 35 : 0) +
        (highImportance ? 50 : 0) +
        (item.reveal_readiness === "overdue" ? 40 : item.reveal_readiness === "ready" ? 25 : 0);
      return { item, score };
    })
    .filter(({ item }) => item.importance >= 4 || Boolean(item.related_character_id && sceneCharacterIds.has(item.related_character_id)))
    .sort((a, b) => b.score - a.score);
  const highImportance = scored.filter(({ item }) => item.importance >= 4);
  const related = scored.filter(({ item }) => item.importance < 4).slice(0, Math.max(0, maxItems - highImportance.length));
  return [...highImportance, ...related].map(({ item }) => item).slice(0, maxItems);
}

function buildChoicePreferenceSummary(
  prefs: UserChoicePreferences | null | undefined,
  settings: AppSettings
): string[] {
  if (!prefs || prefs.sampleCount < 3) return [];
  const topIntents = topNPreferenceKeys(prefs.preferredIntents, 3);
  const topTones = topNPreferenceKeys(prefs.preferredTones, 2);
  const topAgency = topNPreferenceKeys(prefs.preferredAgency, 1);
  const topStyle = topNPreferenceKeys(prefs.preferredChoiceStyles, 1);
  const topProgression = topNPreferenceKeys(prefs.preferredProgression, 2);
  const lines: string[] = [];
  if (topIntents.length) lines.push(`- Often chooses ${topIntents.join("/")} intent choices.`);
  if (topTones.length) lines.push(`- Prefers ${topTones.join("/")} tone.`);
  if (topAgency.length) lines.push(`- Tends toward ${topAgency[0]} agency.`);
  if (topStyle.length) lines.push(`- Prefers ${topStyle[0]}-style choice labels.`);
  if (topProgression.length) lines.push(`- Favors ${topProgression.join("/")} story progression.`);
  if (prefs.slowBurnPreferenceScore > prefs.sampleCount * 0.3) lines.push(`- Enjoys slow-burn development.`);
  if (prefs.romancePreferenceScore > prefs.sampleCount * 0.4) lines.push(`- High romance preference (score: ${prefs.romancePreferenceScore.toFixed(1)}).`);
  if (prefs.storyProgressPreferenceScore > prefs.sampleCount * 0.3) lines.push(`- Values story progress over relationship depth.`);
  if (!lines.length) return [];
  return [
    `[User Choice Preferences — ${prefs.sampleCount} choices tracked]`,
    ...lines
  ];
}

function topNPreferenceKeys(map: Record<string, number>, n: number): string[] {
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .filter(([, v]) => v > 0.3)
    .map(([k]) => k);
}
