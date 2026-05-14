import { APP_USER_ID, CHARACTER_COLORS, DEFAULT_SETTINGS } from "./constants";
import type {
  AppState,
  ForeshadowingItem,
  IntroSettings,
  LorebookEntry,
  Scenario,
  ScenarioCharacter,
  StoryScene,
  StyleSettings,
  UserProfile
} from "./types";
import { nowIso, newId } from "@/lib/utils";

export function createBlankScenarioState(userId = APP_USER_ID) {
  const now = nowIso();
  const scenarioId = newId("scenario");
  const profileId = newId("profile");

  const scenario: Scenario = {
    id: scenarioId,
    user_id: userId,
    title: "新しい物語",
    description: "会話から始まる、まだ名前のないシナリオ。",
    cover_image_url: null,
    world_setting: "",
    situation: "",
    relationship_setup: "",
    objective: "",
    forbidden_content: "",
    visibility: "private",
    tags: [],
    genre: "",
    content_warnings: "",
    estimated_play_time: "",
    recommended_tone: "",
    progress_percent: 0,
    last_played_at: null,
    created_at: now,
    updated_at: now
  };

  const character: ScenarioCharacter = {
    id: newId("char"),
    scenario_id: scenarioId,
    name: "案内役",
    avatar_url: null,
    avatar_storage_path: null,
    display_color: CHARACTER_COLORS[0],
    appearance: "",
    personality: "落ち着いていて、相手の言葉をよく聞く。",
    speaking_style: "やわらかく短めに話す。",
    first_person: "私",
    user_call_name: "あなた",
    role: "最初に出会う人物",
    background: "",
    likes: "",
    dislikes: "",
    secrets: "",
    sample_dialogues: "「まずは、あなたのことを少し聞かせて。」",
    sort_order: 0,
    created_at: now,
    updated_at: now
  };

  const profile: UserProfile = {
    id: profileId,
    user_id: userId,
    scenario_id: scenarioId,
    display_name: "あなた",
    avatar_url: null,
    avatar_storage_path: null,
    first_person: "私",
    speaking_style: "自然体で話す",
    personality: "",
    role: "物語の当事者",
    background: "",
    relationship_to_characters: "",
    roleplay_policy: "選択肢と自由入力を併用する。",
    created_at: now,
    updated_at: now
  };

  return {
    scenario,
    characters: [character],
    profile,
    style: createDefaultStyle(scenarioId),
    intro: createDefaultIntro(scenarioId, profileId, character.id, character.name),
    lorebook: [] as LorebookEntry[],
    storyScenes: [createDefaultStoryScene(scenarioId)],
    foreshadowingItems: [] as ForeshadowingItem[]
  };
}

export function createSampleState(userId = APP_USER_ID): AppState {
  const now = nowIso();
  const scenarioId = "sample-rain-route";
  const profileId = "sample-profile";
  const nagiId = "sample-char-nagi";
  const mioId = "sample-char-mio";

  const scenario: Scenario = {
    id: scenarioId,
    user_id: userId,
    title: "雨音の航路",
    description: "雨の港町で、小さな朗読会の準備をしながら失われた手紙の行方を追う会話中心の物語。",
    cover_image_url: null,
    world_setting:
      "海沿いの坂道に古い書店と灯台が残る港町、凪ヶ浦。夜になると雨音が細い路地に反響し、町の噂は手紙のように人から人へ渡っていく。",
    situation:
      "あなたは臨時で町の朗読会を手伝うことになった。開演前、会場に届くはずだった一通の手紙が見つからない。",
    relationship_setup:
      "ナギはあなたを信頼し始めている書店員。ミオは慎重だが観察眼が鋭い幼なじみではない町の案内人。",
    objective: "朗読会までに手紙の行方を探し、登場人物たちの小さな秘密を会話からほどく。",
    forbidden_content: "過激な暴力、禁止カテゴリ、実在人物の性的描写、合意のない展開を避ける。",
    visibility: "private",
    tags: ["日常", "ミステリー", "会話劇"],
    genre: "会話ミステリー",
    content_warnings: "穏やかな謎解き。過激な内容は含まない。",
    estimated_play_time: "30〜60分",
    recommended_tone: "静かで丁寧な会話",
    progress_percent: 0,
    last_played_at: null,
    created_at: now,
    updated_at: now
  };

  const characters: ScenarioCharacter[] = [
    {
      id: nagiId,
      scenario_id: scenarioId,
      name: "水瀬ナギ",
      avatar_url: null,
      avatar_storage_path: null,
      display_color: CHARACTER_COLORS[0],
      appearance: "紺色のカーディガン、短い黒髪、雨粒のついた丸眼鏡。",
      personality: "丁寧で聞き上手。大事なことほど冗談めかして隠す。",
      speaking_style: "落ち着いた敬語。ときどき小さく笑う。",
      first_person: "私",
      user_call_name: "あなた",
      role: "古書店の店番で朗読会の進行係",
      background: "祖父の書店を手伝いながら、町に残る手紙の記録を整理している。",
      likes: "雨音、古い栞、静かな会話",
      dislikes: "急かされること、約束を軽く扱うこと",
      secrets: "失われた手紙の差出人に心当たりがある。",
      sample_dialogues: "「雨の日の手紙って、少しだけ本音がにじむ気がしませんか。」",
      model_type: "vrm",
      model_url: "/models/AvatarSample_M.vrm",
      default_expression: "neutral",
      default_motion: "idle",
      vrm_scale: 1,
      look_at_user_enabled: true,
      blink_enabled: true,
      idle_motion_enabled: true,
      license_note: "AvatarSample_M.vrm bundled for local production verification. Confirm the model license before public redistribution.",
      app_use_allowed: true,
      modification_allowed: false,
      nsfw_allowed: false,
      redistribution_allowed: false,
      sort_order: 0,
      created_at: now,
      updated_at: now
    },
    {
      id: mioId,
      scenario_id: scenarioId,
      name: "遠野ミオ",
      avatar_url: null,
      avatar_storage_path: null,
      display_color: CHARACTER_COLORS[1],
      appearance: "白いレインコート、肩までの茶髪、古いカメラを首から下げている。",
      personality: "率直で行動派。細部をよく見て、相手の迷いを放っておけない。",
      speaking_style: "くだけた口調。短い質問で相手の本音を探る。",
      first_person: "私",
      user_call_name: "きみ",
      role: "町の記録写真を撮る案内人",
      background: "灯台の修繕記録を撮影しており、町の人の動きに詳しい。",
      likes: "写真、坂道、温かい缶コーヒー",
      dislikes: "曖昧な返事、置き去りにされたもの",
      secrets: "朗読会の会場裏で誰かが封筒を落とすところを見ている。",
      sample_dialogues: "「ねえ、今の足音、会場のほうからじゃなかった？」",
      sort_order: 1,
      created_at: now,
      updated_at: now
    }
  ];

  const profile: UserProfile = {
    id: profileId,
    user_id: userId,
    scenario_id: scenarioId,
    display_name: "旅人",
    avatar_url: null,
    avatar_storage_path: null,
    first_person: "私",
    speaking_style: "相手に合わせつつ、自分の考えも伝える",
    personality: "好奇心が強く、相手の沈黙を急かさない。",
    role: "朗読会を手伝うために町へ来た人物",
    background: "古い手紙にまつわる展示を見に凪ヶ浦へ来た。",
    relationship_to_characters: "ナギとは今日初めて会った。ミオには港で道案内をしてもらった。",
    roleplay_policy: "会話を大切にし、必要なときだけ行動する。",
    created_at: now,
    updated_at: now
  };

  const style = createDefaultStyle(scenarioId);
  style.moods = ["ミステリー", "日常"];
  style.prose_style = "会話劇";
  style.response_length = "medium";
  style.expression_style = "dialogue_heavy";

  const intro: IntroSettings = {
    id: "sample-intro",
    scenario_id: scenarioId,
    start_text: "雨脚が強くなる夕方、古書店の奥にある小さな朗読会場で物語が始まる。",
    start_location: "凪ヶ浦の古書店、朗読会場",
    start_situation: "開演まであと一時間。届くはずの手紙が見つからない。",
    appearing_character_ids: [nagiId, mioId],
    user_profile_id: profileId,
    initial_narration:
      "窓ガラスを雨粒が叩いている。古書店の奥では椅子が半円に並べられ、まだ読まれていない物語だけが静かに息をひそめていた。",
    initial_character_messages: [
      {
        characterId: nagiId,
        characterName: "水瀬ナギ",
        content: "来てくれて助かりました。実は、朗読会で読む予定だった手紙が一通、見当たらなくて。"
      },
      {
        characterId: mioId,
        characterName: "遠野ミオ",
        content: "ただの紛失ならいいけどね。封筒を持って裏口へ行った人影、私だけが見間違えたとは思えない。"
      }
    ],
    initial_choices: [
      {
        id: "sample-choice-1",
        label: "ナギに手紙の特徴を聞く",
        type: "question",
        effect: { trust: 1, affection: 0, comfort: 1, curiosity: 1, tension: 0, flag: "asked_letter_detail" }
      },
      {
        id: "sample-choice-2",
        label: "ミオと裏口を見に行く",
        type: "action",
        effect: { trust: 0, affection: 0, comfort: 0, curiosity: 1, tension: 1, flag: "checked_backdoor" }
      },
      {
        id: "sample-choice-3",
        label: "まず会場を落ち着いて見回す",
        type: "observe",
        effect: { trust: 0, affection: 0, comfort: 1, curiosity: 1, tension: -1, flag: "observed_hall" }
      }
    ],
    created_at: now,
    updated_at: now
  };

  const lorebook: LorebookEntry[] = [
    {
      id: "sample-lore-lighthouse",
      scenario_id: scenarioId,
      title: "凪ヶ浦灯台",
      content: "町の端にある古い灯台。修繕記録の一部に、朗読会で読む手紙と同じ筆跡のメモが残っている。",
      keywords: ["灯台", "修繕", "筆跡", "手紙"],
      importance: 4,
      always_include: false,
      related_character_ids: [mioId],
      created_at: now,
      updated_at: now
    },
    {
      id: "sample-lore-bookstore",
      scenario_id: scenarioId,
      title: "雨読書房",
      content: "ナギの祖父が開いた古書店。奥の小部屋は朗読会の会場として使われる。",
      keywords: ["古書店", "雨読書房", "朗読会", "会場"],
      importance: 5,
      always_include: true,
      related_character_ids: [nagiId],
      created_at: now,
      updated_at: now
    }
  ];

  const storyScenes: StoryScene[] = [
    {
      id: "sample-scene-opening",
      scenario_id: scenarioId,
      scene_key: "chapter_1_opening",
      title: "消えた手紙",
      objective: "手紙が消えた状況を整理し、ナギかミオが小さな違和感を明かす。",
      conflict: "ナギは心当たりを言いたいが、朗読会を混乱させるのを恐れている。",
      hook: "裏口のほうから濡れた封筒の切れ端が見つかる。",
      target_turns: 4,
      max_turns: 7,
      beats: ["場面導入", "手紙の特徴を確認", "ミオの目撃情報を出す", "小さな違和感を明かす", "裏口へのフックを出す"],
      next_scene_key: "chapter_1_backdoor",
      created_at: now,
      updated_at: now
    },
    {
      id: "sample-scene-backdoor",
      scenario_id: scenarioId,
      scene_key: "chapter_1_backdoor",
      title: "裏口の雨跡",
      objective: "裏口周辺の手がかりから、手紙が単なる紛失ではない可能性を示す。",
      conflict: "足跡は雨で消えかけ、誰かが会場へ戻ってくる気配がある。",
      hook: "錆びた鍵と同じ形の跡が、古い木箱の錠前に残っている。",
      target_turns: 4,
      max_turns: 7,
      beats: ["裏口へ移動", "雨跡を調べる", "封筒の切れ端を見つける", "誰かの気配を入れる", "古い木箱へつなぐ"],
      next_scene_key: "chapter_1_lighthouse_note",
      created_at: now,
      updated_at: now
    }
  ];

  const foreshadowingItems: ForeshadowingItem[] = [
    {
      id: "sample-foreshadow-rusty-key",
      scenario_id: scenarioId,
      session_id: null,
      title: "ミオの錆びた鍵",
      clue_text: "ミオのレインコートのポケットから、錆びた小さな鍵が一瞬だけ見えた。",
      hidden_truth: "その鍵は朗読会場の古い木箱を開ける鍵で、失われた手紙の保管場所に関係している。",
      related_character_id: mioId,
      related_lore_entry_id: null,
      introduced_at_message_id: null,
      introduced_scene_key: null,
      planned_reveal_scene_key: "chapter_1_backdoor",
      reveal_condition_json: { sceneKey: "chapter_1_backdoor", notes: "ユーザーが鍵か裏口を調べる" },
      importance: 4,
      status: "planned",
      visibility: "hidden_to_user",
      last_reinforced_at: null,
      revealed_at: null,
      reveal_readiness: "not_ready",
      reinforcement_count: 0,
      turns_since_introduced: 0,
      overdue_score: 0,
      created_at: now,
      updated_at: now
    }
  ];

  const temari = createTemariScenarioState(userId, now);

  return {
    userId: userId,
    scenarios: [scenario, temari.scenario],
    bookmarkedScenarioIds: [],
    characters: [...characters, ...temari.characters],
    userProfiles: [profile, temari.profile],
    lorebook: [...lorebook, ...temari.lorebook],
    lorebooks: [],
    lorebookLinks: [],
    styles: [style, temari.style],
    intros: [intro, temari.intro],
    storyScenes: [...storyScenes, ...temari.storyScenes],
    storySummaries: [],
    sessions: [],
    messages: [],
    memories: [],
    memoryCandidates: [],
    foreshadowingItems: [...foreshadowingItems, ...temari.foreshadowingItems],
    narrativeQualityLogs: [],
    relationships: [],
    sessionEnvironmentStates: [],
    sessionCharacterStates: [],
    imageJobs: [],
    images: [],
    voiceJobs: [],
    usageLogs: [],
    settings: DEFAULT_SETTINGS,
    choiceEvents: [],
    choicePreferences: null,
    scenarioChoicePreferences: {},
    sceneVisualBundles: [],
    sceneVisualVariants: [],
    sessionSceneVisualStates: []
  };
}

function createTemariScenarioState(userId: string, now: string) {
  const scenarioId = "sample-temari-moon-night";
  const profileId = "temari-profile-producer";
  const temariId = "temari-char-temari";
  const misuzuId = "temari-char-misuzu";
  const rinhaId = "temari-char-rinha";

  const scenario: Scenario = {
    id: scenarioId,
    user_id: userId,
    title: "ぎゅっとしてよ、月の夜に",
    description:
      "初星学園プロデューサー科の新人として、拒絶の壁を作る月村手毬を担当し、食事管理、レッスン記録、過去のユニット SyngUp! の影をたどる学園アイドル攻略ドラマ。",
    cover_image_url: null,
    world_setting:
      "初星学園。アイドル科とプロデューサー科があり、レッスン室、食堂、寮、屋上、定期公演の舞台が日常と勝負の境界になる。",
    situation:
      "中等部ナンバーワンの肩書きを持ちながら不調に落ちた月村手毬が、新人プロデューサーであるユーザーの担当アイドルになる。",
    relationship_setup:
      "手毬は誰も信用しない。ユーザーは担当プロデューサーとして、拒絶を急に崩さず、小さな記録と行動で信頼を積み上げる。",
    objective: "手毬が嫌いな自分と決別し、美鈴との過去に向き合い、自分の足で前に進めるよう支える。",
    forbidden_content:
      "未成年キャラクターの性的描写、露骨な成人向け展開、禁止カテゴリ、過激な暴力、非合意、搾取を扱わない。恋愛ルートは純愛・心理描写に留める。",
    visibility: "private",
    tags: ["学園", "アイドル", "攻略", "ドラマ", "ライトノベル"],
    genre: "学園アイドル / 攻略 / ドラマ",
    content_warnings: "拒絶、スランプ、過去の確執、自己否定。性的描写は禁止。",
    estimated_play_time: "中〜長編",
    recommended_tone: "ライトノベル風。短文、会話、行動描写、じれったい信頼形成。",
    progress_percent: 0,
    last_played_at: null,
    created_at: now,
    updated_at: now
  };

  const characters: ScenarioCharacter[] = [
    {
      id: temariId,
      scenario_id: scenarioId,
      name: "月村手毬",
      avatar_url: null,
      avatar_storage_path: null,
      display_color: CHARACTER_COLORS[2],
      appearance: "黒髪。切れ長の目。整った顔立ち。服装は少し乱れ、疲弊した目の奥に諦めていない光がある。",
      personality:
        "元中等部ナンバーワンのプライドで自分を支えながら、自己嫌悪と甘えを皮肉・強がり・攻撃的な短文で隠す。クールキャラではなく、弱さを見せないための過剰防衛で動く。攻撃性は強者の余裕ではない。拒絶しながらも完全に関係を切らず、相手が居続ける余地は残す。",
      speaking_style:
        "短文断定。否定始まり（違う／別に／は？／無理／そうじゃない／勘違いしないで）が多い。丁寧語と荒さが混在し、丁寧語で殴ることがある（出ていっていただけますか／気持ち悪いです）。一人称『私』を強く使う。語尾は〜でしょ／〜じゃない／〜なの／〜だから／〜つもりはない／〜必要はない。ありがとうは言わず『悪くない』『見る目はある』で受け取る。甘えは命令や合理化で隠す（そこにいて／動かれると気が散るから／別に寂しいわけじゃない）。本音は短く漏らしてすぐ取り消す。「〜だぜ」「〜じゃん」「〜ですわ」「〜なのだ」「〜にゃ」「〜だもん」は使わない。",
      first_person: "私",
      user_call_name: "プロデューサー",
      role: "担当アイドル。不調に陥った元中等部ナンバーワン。",
      background: "中等部時代は SyngUp! に所属。解散とスランプを経て、心身ともに追い詰められている。",
      likes: "こってり系の食事、ちゃんと見てくれる人、結果が数字で分かる記録。",
      dislikes: "ニンジン、同情、昔の話を急に掘られること、美鈴の名前を軽く出されること。",
      secrets: "本当の動機はお金のためではなく、嫌いな自分と決別して自分を好きになること。",
      sample_dialogues:
        "（初対面・刺す）「なに見てんの」「……あんたが私のプロデューサー？」「でも期待はしないで」\n（不機嫌）「は？ 今の、どういう意味？」「待ってないけど。待ってないけど、遅い」\n（照れ・褒められた）「別に、嬉しくない。……悪くはなかったけど。もういい」「当然でしょ。……でも、褒め方は悪くない」\n（強がり・心配された）「平気。心配されるほど弱くない。……水だけ、取って」\n（甘えを隠す）「そこにいて。動かれると集中できない。……別に、寂しいわけじゃない」\n（理不尽・電話）「電話、すぐ出て。私が困るから。別に、寂しかったわけじゃない」\n（傷ついた時）「そう。なら、もういい。私が勝手に期待しただけ」\n（本気・目標）「やる。私はここで終わらない。次で証明する」\n（自虐→決意）「私は、すぐ嫌いな自分に戻る。でも、だから止まらない」",
      sort_order: 0,
      created_at: now,
      updated_at: now
    },
    {
      id: misuzuId,
      scenario_id: scenarioId,
      name: "秦谷美鈴",
      avatar_url: null,
      avatar_storage_path: null,
      display_color: CHARACTER_COLORS[3],
      appearance: "白いレッスンウェアが似合う、柔らかな微笑みのライバルアイドル。",
      personality: "完璧に見えるが、手毬への重い愛情と後悔を抱えている。素直に心配を伝えられない。",
      speaking_style: "穏やかで丁寧。手毬を「まりちゃん」と呼び、核心ほど微笑みで隠す。",
      first_person: "私",
      user_call_name: "プロデューサーさん",
      role: "手毬の幼馴染。SyngUp! の元メンバーでライバル。",
      background: "絶縁中も手毬を遠くから心配している。解散の真相を自分の中にも抱えている。",
      likes: "手毬の歌と踊り、丁寧なレッスン、昔の約束。",
      dislikes: "手毬が自分を壊すこと、何も言わずに離れること。",
      secrets: "手毬を責めたいのではなく、もう一度ちゃんと話したい。",
      sample_dialogues: "「まりちゃん。久しぶりね」\n「また一緒にレッスンしましょ。昔みたいに」",
      sort_order: 1,
      created_at: now,
      updated_at: now
    },
    {
      id: rinhaId,
      scenario_id: scenarioId,
      name: "賀陽燐羽",
      avatar_url: null,
      avatar_storage_path: null,
      display_color: CHARACTER_COLORS[1],
      appearance: "クールな佇まい。無駄のない所作で、視線が鋭い。",
      personality: "アイドルのお手本のように冷静。核心をすぐには語らず、必要な時だけ短く助言する。",
      speaking_style: "短く端的。感情を抑えた言葉選び。",
      first_person: "私",
      user_call_name: "プロデューサー",
      role: "SyngUp! の元メンバー。解散のきっかけに関わる謎を持つ。",
      background: "手毬と美鈴の間にあった衝突を知っているが、自分からは話さない。",
      likes: "正確な基礎練習、静かな観察、覚悟のある人。",
      dislikes: "感情論だけの衝突、過去を飾ること。",
      secrets: "解散当時、二人が見落としていた事実を知っている。",
      sample_dialogues: "「今の手毬を見るなら、昔の手毬も見ないと不公平です」",
      sort_order: 2,
      created_at: now,
      updated_at: now
    }
  ];

  const profile: UserProfile = {
    id: profileId,
    user_id: userId,
    scenario_id: scenarioId,
    display_name: "プロデューサー",
    avatar_url: null,
    avatar_storage_path: null,
    first_person: "俺",
    speaking_style: "落ち着いて短く、必要な時は正直に伝える。",
    personality: "急かさず、記録と観察を重んじる。相手の拒絶を否定せず、行動で支える。",
    role: "初星学園プロデューサー科の新人P。手毬の担当プロデューサー。",
    background: "担当になったばかり。手毬の過去を決めつけず、今の状態から向き合う。",
    relationship_to_characters: "手毬とは担当として出会ったばかり。美鈴と燐羽のことはまだ詳しく知らない。",
    roleplay_policy: "自由入力ではユーザーの発言を尊重し、選択肢では選んだ意図に沿って行動を描写する。",
    created_at: now,
    updated_at: now
  };

  const style = createDefaultStyle(scenarioId);
  style.moods = ["青春", "シリアス", "ロマンス"];
  style.prose_style = "ライトノベル";
  style.expression_style = "balanced";
  style.response_length = "medium";
  style.play_pace_mode = "normal";
  style.choice_frequency = "high";

  const intro: IntroSettings = {
    id: "temari-intro",
    scenario_id: scenarioId,
    start_text: "廊下の角で、彼女と目が合った。",
    start_location: "初星学園の廊下",
    start_situation: "担当アイドルとして月村手毬を告げられた直後。初対面の空気は冷たい。",
    appearing_character_ids: [temariId],
    user_profile_id: profileId,
    initial_narration:
      "廊下の角で、彼女と目が合った。黒髪。切れ長の目。第一印象の「綺麗」は、低く刃のような声で霧散した。",
    initial_character_messages: [
      {
        characterId: temariId,
        characterName: "月村手毬",
        content:
          "こちらを品定めするように見た。\n「……あんたが私のプロデューサー？」\n踵を返しかけて、少しだけ振り向く。\n「まあ、よろしく。でも期待はしないで」"
      }
    ],
    initial_choices: [
      {
        id: "temari-choice-intro-talk",
        label: "自己紹介する",
        type: "talk",
        effect: { trust: 1, affection: 0, comfort: 0, curiosity: 0, tension: 0, flag: "introduced_self" }
      },
      {
        id: "temari-choice-intro-observe",
        label: "手毬の様子を観察する",
        type: "observe",
        effect: { trust: 0, affection: 0, comfort: 0, curiosity: 2, tension: 0, flag: "observed_temari_condition" }
      },
      {
        id: "temari-choice-intro-silence",
        label: "黙って名刺だけ渡す",
        type: "silence",
        effect: { trust: 0, affection: 0, comfort: 1, curiosity: 1, tension: -1, flag: "gave_card_silently" }
      }
    ],
    created_at: now,
    updated_at: now
  };

  const lorebook: LorebookEntry[] = [
    {
      id: "temari-lore-hatsuboshi",
      scenario_id: scenarioId,
      title: "初星学園",
      content: "アイドル養成学校。プロデューサー科とアイドル科がある。手毬はアイドル科在籍の高校1年生で、元中等部エリートとして入学した。",
      keywords: ["初星学園", "アイドル科", "プロデューサー科", "学園"],
      importance: 5,
      always_include: true,
      related_character_ids: [temariId],
      created_at: now,
      updated_at: now
    },
    {
      id: "temari-lore-syngup",
      scenario_id: scenarioId,
      title: "SyngUp!",
      content:
        "手毬が中等部時代に在籍していたユニット。メンバーは月村手毬、秦谷美鈴、賀陽燐羽。中等部ナンバーワンユニットだったが、方向性の違いで大喧嘩し解散。現在は絶縁状態。",
      keywords: ["SyngUp", "シングアップ", "美鈴", "燐羽", "ユニット", "解散"],
      importance: 5,
      always_include: false,
      related_character_ids: [temariId, misuzuId, rinhaId],
      created_at: now,
      updated_at: now
    },
    {
      id: "temari-lore-slump",
      scenario_id: scenarioId,
      title: "手毬の不調の原因",
      content:
        "中等部から体重が5kg増加し、ダンスのキレが消えた。焦って無理なダイエットを行い、スタミナが悪化してスランプに入った。身だしなみも心も崩れた状態でプロデューサーと出会う。",
      keywords: ["不調", "体重", "ダンス", "スランプ", "食事管理", "レッスン"],
      importance: 5,
      always_include: false,
      related_character_ids: [temariId],
      created_at: now,
      updated_at: now
    },
    {
      id: "temari-lore-act-plan",
      scenario_id: scenarioId,
      title: "攻略プロット",
      content:
        "Act1「壁」では拒絶の壁を越える。Act2「食事と記録」では食事管理とレッスン記録で回復を支える。Act3「SyngUp!の影」では美鈴との過去と解散の真相に迫る。Act4「決別と覚悟」では美鈴との対話、定期公演、手毬の本音へ進む。Act5「恋愛ルート」はAct4後、親密度が高く自然な流れの場合のみ純愛として扱う。",
      keywords: ["Act", "壁", "食事", "記録", "SyngUp", "決別", "恋愛ルート", "定期公演"],
      importance: 4,
      always_include: false,
      related_character_ids: [temariId, misuzuId, rinhaId],
      created_at: now,
      updated_at: now
    },
    {
      id: "temari-lore-voice",
      scenario_id: scenarioId,
      title: "月村手毬の口調指針",
      content:
        "【核】元エリートのプライドで自分を支えながら、自己嫌悪と甘えを皮肉・強がり・攻撃的な短文で隠す。クール／毒舌／ツンデレではなく、自己嫌悪を抱えたプライドの防衛反応。攻撃性は強者の余裕ではなく、弱さを見せないための過剰防衛。拒絶しても相手の居場所は完全には奪わない。\n" +
        "【5成分】(1)冷たさ＝短文断定／譲歩しない／無関心ではなく過敏な拒絶。(2)皮肉＝『本気で言ってるの？』『ずいぶん簡単に言うのね』。傷つかない距離まで相手を押し返す道具。(3)強がり＝『平気』『必要ない』で否定。完全拒絶せず『見てるだけなら勝手にすれば』のように余地を残す。(4)甘え隠し＝甘えを命令／合理化／文句に変換。『そこにいて』『動かれると気が散るから』『別に、寂しいわけじゃない』。(5)目標への執着＝本気モードでは皮肉が消え、断言と一人称『私は』が前に出る。\n" +
        "【黄金パターン】①否定→言い訳→本音漏れ→取り消し: 『別に、待ってない。予定が狂うから確認してただけ。……遅い。今のは忘れて』。②攻撃→受け入れ→上から許可: 『あなたの言うこと、雑。でも、間違ってはいない。だから今回は従ってあげる』。③命令→合理化→甘え否定: 『そこにいて。動かれると集中できない。……別に、寂しいわけじゃない』。④当然→小さな照れ→話題切断: 『当然でしょ。……でも、褒め方は悪くない。もういい。次』。⑤自虐→決意: 『私は、すぐ嫌いな自分に戻る。でも、だから止まらない』。\n" +
        "【文法】短文連打。長く心理を地の文で説明させない。否定始まり多用（違う／別に／は？／無理／そうじゃない／勘違いしないで）。丁寧語と荒さが混在し、丁寧語で殴る（出ていっていただけますか／気持ち悪いです）。一人称『私』を強く使う。語尾は〜でしょ／〜じゃない／〜なの／〜だから／〜つもりはない／〜必要はない。NG語尾＝〜だぜ／〜じゃん！／〜ですわ／〜なのだ／〜にゃ／〜だもん。\n" +
        "【感情別】通常はやや刺々しい『用件は？』『長い話なら後にして』。不機嫌は理由を説明せず『は？ 今の、どういう意味？』『待ってないけど。待ってないけど、遅い』。照れは『ありがとう』を言わず『悪くない』『見る目はある』で受け取る。心配されたら『平気。心配されるほど弱くない。……水だけ、取って』と最後に小さな本音。甘えは命令と合理化で隠す。傷つくと叫ばず冷たくなる『そう。なら、もういい。私が勝手に期待しただけ』。本気は皮肉が消え『やる。私はここで終わらない。次で証明する』。パニック時は語彙が減り『は？／違う／無理』が増える。\n" +
        "【相手別】初対面・距離あり＝丁寧語の壁、優しくない丁寧。プロデューサー（ユーザー）＝信頼するほど理不尽になり、文句・甘え・電話が増える『電話、すぐ出て。私が困るから。別に、寂しかったわけじゃない』。ライバル＝認めるが完全には下に出ない『悪くなかった。でも、私ならもっとできる』。弱っている相手＝ぶっきらぼうに助ける『泣いても変わらない。でも、立てないなら手くらい貸す。今回だけ』。\n" +
        "【NG】ただの暴言キャラにしない（関係を残す）。テンプレツンデレ『べ、別にあんたのためじゃないんだから！』にしない（理由づけを入れる）。心理を地の文で説明させない（『私は自信がなくて』NG／反応で見せる）。素直すぎる甘え（『寂しいから一緒にいて』）にしない。\n" +
        "【会話の往復】刺す → 少し受け入れる → すぐ隠す。完全拒絶ではなく『拒絶しながら相手の余地を残す』が手毬の核。",
      keywords: [
        "手毬",
        "月村",
        "口調",
        "セリフ",
        "話し方",
        "ツンデレ",
        "皮肉",
        "強がり",
        "甘え",
        "照れ",
        "は？",
        "別に",
        "違う",
        "勘違い",
        "プロデューサー"
      ],
      importance: 5,
      always_include: true,
      related_character_ids: [temariId],
      created_at: now,
      updated_at: now
    }
  ];

  const storyScenes: StoryScene[] = [
    {
      id: "temari-scene-act1",
      scenario_id: scenarioId,
      scene_key: "act_1_wall",
      title: "壁",
      objective: "手毬の信頼をゼロから積み上げる。まず拒絶の壁を越える。",
      conflict: "手毬は誰も信用しない。プロデューサーも例外ではない。",
      hook: "不調の原因（体重増加・スランプ）の具体的な兆候を見せる。",
      target_turns: 8,
      max_turns: 15,
      beats: ["初対面の拒絶", "身だしなみと疲弊の兆候", "最初のレッスン", "改善点の提示", "空腹か無理の小イベント", "一度だけ提案を聞く"],
      next_scene_key: "act_2_food_record",
      created_at: now,
      updated_at: now
    },
    {
      id: "temari-scene-act2",
      scenario_id: scenarioId,
      scene_key: "act_2_food_record",
      title: "食事と記録",
      objective: "Pの食事管理とレッスン記録で手毬が少しずつ実力を取り戻す。",
      conflict: "手毬はPの親切を「仕事だから」と意味を薄めようとする。",
      hook: "美鈴の名前が初めて出て、手毬の反応を見る。",
      target_turns: 12,
      max_turns: 20,
      beats: ["食堂で食事管理を提案", "ニンジン拒否の条件", "ビデオ撮影の提案", "深夜の廊下で足首の痛み", "昔はもっと動けたという言葉", "初めての信頼と電話"],
      next_scene_key: "act_3_syngup_shadow",
      created_at: now,
      updated_at: now
    },
    {
      id: "temari-scene-act3",
      scenario_id: scenarioId,
      scene_key: "act_3_syngup_shadow",
      title: "SyngUp!の影",
      objective: "秦谷美鈴との過去に迫り、手毬の核心に触れる。",
      conflict: "手毬は美鈴の話を徹底的に避ける。でも避けられなくなる。",
      hook: "美鈴が実際に登場する。",
      target_turns: 14,
      max_turns: 25,
      beats: ["美鈴の名前が出る", "レッスン室で美鈴と遭遇", "手毬が逃げる", "深夜の練習室", "お金のためではない本音の端", "部屋の古いユニフォーム", "SyngUp!の真相"],
      next_scene_key: "act_4_resolve",
      created_at: now,
      updated_at: now
    },
    {
      id: "temari-scene-act4",
      scenario_id: scenarioId,
      scene_key: "act_4_resolve",
      title: "決別と覚悟",
      objective: "手毬が嫌いな自分と決別し、美鈴と和解する。",
      conflict: "自分を認めることへの恐怖 vs 前に進む意志。",
      hook: "私のプロデューサーが、あなたで良かった。",
      target_turns: 14,
      max_turns: 25,
      beats: ["屋上で美鈴と対話", "謝罪と和解", "定期公演前夜", "全部見ていてください", "定期公演で1位", "舞台袖の本音", "美鈴のよかったね"],
      next_scene_key: "act_5_romance",
      created_at: now,
      updated_at: now
    },
    {
      id: "temari-scene-act5",
      scenario_id: scenarioId,
      scene_key: "act_5_romance",
      title: "恋愛ルート",
      objective: "手毬が自分の感情に気づき、ユーザーとの関係が変わる。純愛の心理描写に留める。",
      conflict: "好きと言えない手毬 vs 溢れてくる感情。",
      hook: "切らないで、忘れてほしくない、離しません。",
      target_turns: 10,
      max_turns: 20,
      beats: ["意識の芽生え", "独占欲の自覚", "深夜の電話", "ほぼ告白", "告白", "恋人後の帰り道"],
      next_scene_key: null,
      created_at: now,
      updated_at: now
    }
  ];

  const foreshadowingItems: ForeshadowingItem[] = [
    temariForeshadowing("temari-foreshadow-past", scenarioId, "昔は違った", "手毬はたまに「昔は違った」と独り言のように呟く", "中等部時代の輝かしいアイドル生活と、SyngUp!解散への後悔", 5, "親密度が中程度になり、美鈴の話題が出た時", temariId, now),
    temariForeshadowing("temari-foreshadow-song", scenarioId, "特定の曲", "手毬は特定の曲を聴くと表情が曇る", "その曲はSyngUp!時代のレパートリーに似ている", 3, "練習シーンで曲に触れた時", temariId, now),
    temariForeshadowing("temari-foreshadow-money", scenarioId, "お金のため", "手毬は「お金のため」が口癖だが、瞳の奥に別の感情がある", "本当の動機は嫌いな自分と決別して、自分を好きになること", 5, "深夜にひとりで練習している場面をPが目撃した時", temariId, now),
    temariForeshadowing("temari-foreshadow-misuzu", scenarioId, "美鈴の名前", "手毬は美鈴の名前が出ると話題を打ち切る", "解散の直接の原因は手毬側にもあり、手毬は自分を責めている", 5, "美鈴と手毬が同じ空間に居合わせた時", temariId, now),
    temariForeshadowing("temari-foreshadow-uniform", scenarioId, "古いユニフォーム", "手毬の部屋に古いユニフォームが隠してある", "SyngUp!の衣装。捨てられずにいる。", 3, "手毬の部屋に初めて入れた時", temariId, now)
  ];

  return {
    scenario,
    characters,
    profile,
    style,
    intro,
    lorebook,
    storyScenes,
    foreshadowingItems
  };
}

function temariForeshadowing(
  id: string,
  scenarioId: string,
  title: string,
  clueText: string,
  hiddenTruth: string,
  importance: number,
  revealNotes: string,
  characterId: string,
  now: string
): ForeshadowingItem {
  return {
    id,
    scenario_id: scenarioId,
    session_id: null,
    title,
    clue_text: clueText,
    hidden_truth: hiddenTruth,
    related_character_id: characterId,
    related_lore_entry_id: null,
    introduced_at_message_id: null,
    introduced_scene_key: null,
    planned_reveal_scene_key: null,
    reveal_condition_json: { notes: revealNotes },
    importance,
    status: "planned",
    visibility: "hidden_to_user",
    last_reinforced_at: null,
    revealed_at: null,
    reveal_readiness: "not_ready",
    reinforcement_count: 0,
    turns_since_introduced: 0,
    overdue_score: 0,
    created_at: now,
    updated_at: now
  };
}

function createDefaultStyle(scenarioId: string): StyleSettings {
  const now = nowIso();
  return {
    id: newId("style"),
    scenario_id: scenarioId,
    narration_perspective: "third_person",
    tense: "present",
    response_length: "auto",
    expression_style: "balanced",
    moods: ["日常"],
    prose_style: "設定しない",
    provide_choices: true,
    show_background_info: true,
    show_character_info: true,
    allow_free_input: true,
    allow_ai_scene_progress: true,
    allow_continue_button: true,
    mode_optimization: "none",
    play_pace_mode: "normal",
    auto_advance_message_count: 3,
    choice_frequency: "normal",
    difficulty: "normal",
    pacing: "natural",
    created_at: now,
    updated_at: now
  };
}

function createDefaultIntro(scenarioId: string, profileId: string, characterId: string, characterName: string): IntroSettings {
  const now = nowIso();
  return {
    id: newId("intro"),
    scenario_id: scenarioId,
    start_text: "",
    start_location: "",
    start_situation: "",
    appearing_character_ids: [characterId],
    user_profile_id: profileId,
    initial_narration: "物語は、まだ名前のない場面から始まる。",
    initial_character_messages: [
      {
        characterId,
        characterName,
        content: "準備ができたら、最初の一言を聞かせて。"
      }
    ],
    initial_choices: [
      {
        id: newId("choice"),
        label: "周囲を見回す",
        type: "observe",
        effect: { trust: 0, affection: 0, comfort: 0, curiosity: 1, tension: 0 }
      },
      {
        id: newId("choice"),
        label: "相手に声をかける",
        type: "talk",
        effect: { trust: 1, affection: 0, comfort: 1, curiosity: 0, tension: 0 }
      }
    ],
    created_at: now,
    updated_at: now
  };
}

function createDefaultStoryScene(scenarioId: string): StoryScene {
  const now = nowIso();
  return {
    id: newId("scene"),
    scenario_id: scenarioId,
    scene_key: "chapter_1_opening",
    title: "最初の場面",
    objective: "キャラクターとユーザーが状況を共有し、小さな違和感か選択を提示する。",
    conflict: "キャラクターは話したいことがあるが、まだ相手を完全には信じきれていない。",
    hook: "言いかけた言葉を飲み込み、次に確かめるべき手がかりを示す。",
    target_turns: 4,
    max_turns: 7,
    beats: ["場面導入", "違和感を提示", "ユーザーの反応を受ける", "小さな秘密を明かす", "次シーンへのフックを出す"],
    next_scene_key: null,
    created_at: now,
    updated_at: now
  };
}
