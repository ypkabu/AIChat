/**
 * Visual Prompt Builder
 *
 * 画像生成に使うプロンプトを「会話AIの応答」とは独立に組み立てる。
 * 主目的:
 *   - 主人公一人称視点を必ず強制（主人公は画面に映さない）
 *   - 会話・チャットの内容ではなく、解決済みのシーン状態を信頼源にする
 *   - Negative Promptに「主人公混入」「キャラ重複」「違う場所/服装」を必ず除外
 *   - 画風 / 品質 / 表情差分 のpresetを一貫させる
 */
import type { ExpressionType, ImageQualityPreset } from "@/lib/domain/types";

export type VisualStyle =
  | "anime"
  | "visual_novel"
  | "fantasy"
  | "romance"
  | "adventure"
  | "dark";

export type ImageKind =
  | "background"
  | "expression_variant"
  | "event_cg"
  | "manual_scene";

export type CameraDistance = "close" | "medium" | "far" | "wide";

export type VisualActiveCharacter = {
  id: string;
  name: string;
  appearance?: string | null;
  outfit?: string | null;
  expression?: ExpressionType | string | null;
  mood?: string | null;
  pose?: string | null;
  relationshipToUser?: string | null;
};

export type BuildVisualPromptInput = {
  sceneKey: string;
  location: string;
  timeOfDay?: string | null;
  weather?: string | null;
  sceneSummary?: string | null;
  activeCharacters: VisualActiveCharacter[];
  pov: "first_person";
  cameraDistance: CameraDistance;
  visualStyle: VisualStyle;
  imageKind: ImageKind;
  qualityPreset: ImageQualityPreset;
  nsfwAllowed?: boolean;
  previousImagePromptSummary?: string | null;
  /** OpenAI (gpt-image-1/dall-e-3) のような自然言語モデル用に最適化するか */
  useNaturalLanguagePrompt?: boolean;
  /** ★ 実際の物語テキスト (直近の地の文 + 会話)。これを画像生成の絶対基準とする。 */
  recentNarration?: string | null;
};

export type BuiltVisualPrompt = {
  positivePrompt: string;
  negativePrompt: string;
  promptSummary: string;
  consistencyKey: string;
};

const STYLE_TAGS: Record<VisualStyle, string> = {
  anime: "anime style, clean line art, soft cel shading",
  visual_novel: "visual novel illustration, clean anime style, soft cel shading, expressive eyes",
  fantasy: "fantasy anime illustration, painterly background, soft glow",
  romance: "romantic anime illustration, soft warm palette, gentle atmosphere",
  adventure: "adventure anime illustration, dynamic composition, vivid colors",
  dark: "dark anime illustration, moody lighting, cinematic atmosphere"
};

// First-person POV を最強で強制する文。
// Flux系モデルはnegative promptをほぼ無視するため、positive prompt先頭で
// 「カメラ＝視聴者の目」「フレームにはヒロインしかいない」を自然文で宣言する。
const POV_LOCK_EN =
  "first-person POV shot, the camera is exactly the viewer's own eyes, the viewer is standing in the scene but cannot be seen, the frame shows what the viewer's eyes see, nothing of the viewer's own body is rendered, no male character in this image, no male body, no male torso, no boy in the foreground, no second person in the frame";
const POV_LOCK_JA =
  "一人称視点のショット、カメラは視聴者自身の目、視聴者は場面の中に立っているが画面には映らない、視聴者の体の一部も描かれない、男性キャラは一切描かない";

// 「単独構図」を肯定形で宣言（Fluxは肯定的指示の方がよく効く）
const SOLO_SUBJECT_LOCK =
  "solo female character composition, only one person visible in the entire frame, single subject illustration, the female character occupies the visible foreground alone, empty space where the viewer is standing";

// Negative promptは SD/Illustrious 系のみ効くが、保険として強く入れる
const PROTAGONIST_NEG_EN = [
  "male character",
  "boy",
  "man",
  "male protagonist",
  "male torso",
  "male back",
  "two people",
  "couple",
  "boyfriend",
  "back of head",
  "back view of a person in the foreground",
  "viewer body",
  "viewer hands",
  "viewer arms",
  "viewer legs",
  "selfie",
  "third person view",
  "over the shoulder",
  "back of protagonist",
  "protagonist face",
  "protagonist reflection",
  "protagonist shadow",
  "extra male",
  "extra person",
  "wrong character",
  "duplicate character",
  "inconsistent outfit",
  "wrong location",
  "wrong background"
].join(", ");

const QUALITY_NEG =
  "worst quality, low quality, blurry, bad anatomy, bad hands, extra fingers, extra limbs, mutated hands, text, subtitles, speech bubble, logo, watermark, UI";

const QUALITY_PRESET_TAGS: Record<ImageQualityPreset, string> = {
  draft: "clean lineart, simple shading",
  standard:
    "high quality, clean anime visual novel illustration, detailed face, expressive eyes, consistent character design, soft lighting, polished composition",
  high:
    "high quality, clean anime visual novel illustration, detailed face, expressive eyes, consistent character design, soft lighting, polished composition, highly detailed anime illustration, cinematic lighting, beautiful composition, refined facial expression, visual novel key art quality",
  ultra:
    "masterpiece, ultra detailed, highly detailed anime illustration, cinematic lighting, dramatic composition, intricate background, refined facial expression, visual novel key art quality, perfect lighting, perfect color grading"
};

// 表情差分のフォールバック表
const EXPRESSION_FALLBACK: Record<string, ExpressionType> = {
  embarrassed: "blush",
  shy: "blush",
  happy: "smile",
  laughing: "smile",
  teasing: "smile",
  soft_smile: "smile",
  angry: "annoyed",
  irritated: "annoyed",
  fear: "worried",
  scared: "worried",
  sad: "worried",
  shocked: "surprised",
  determined: "serious",
  stern: "serious",
  calm: "neutral"
};

const KNOWN_EXPRESSIONS: ExpressionType[] = [
  "neutral",
  "annoyed",
  "smile",
  "blush",
  "serious",
  "surprised",
  "worried",
  "embarrassed"
];

export function normalizeExpression(value: string | null | undefined): ExpressionType | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (KNOWN_EXPRESSIONS.includes(lower as ExpressionType)) return lower as ExpressionType;
  return EXPRESSION_FALLBACK[lower] ?? null;
}

export function fallbackForExpression(
  desired: ExpressionType,
  available: ExpressionType[]
): ExpressionType | null {
  if (available.includes(desired)) return desired;
  const desiredFallback = EXPRESSION_FALLBACK[desired] ?? null;
  if (desiredFallback && available.includes(desiredFallback)) return desiredFallback;
  for (const [aliasFrom, aliasTo] of Object.entries(EXPRESSION_FALLBACK)) {
    if (aliasTo === desired && available.includes(aliasFrom as ExpressionType)) {
      return aliasFrom as ExpressionType;
    }
  }
  return null;
}

function cameraTag(distance: CameraDistance) {
  switch (distance) {
    case "close":
      return "close-up shot, intimate framing";
    case "far":
    case "wide":
      return "wide shot, full body in frame";
    case "medium":
    default:
      return "medium shot, waist up framing";
  }
}

function shorten(text: string | null | undefined, max: number) {
  if (!text) return "";
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
}

/**
 * 主人公への言及（ユーザー/彼/僕/俺/{{user}}など）を除去する。
 * sceneSummary や recent_event には会話AIが「ユーザーがXXした」と書きがちで、
 * Flux はそれを literal に解釈して男性を描いてしまうので、prompt送信前に必ず通す。
 */
function sanitizeProtagonistMentions(text: string): string {
  if (!text) return "";
  let out = text;
  const patterns: Array<[RegExp, string]> = [
    // 日本語
    [/\{\{user\}\}/gi, "she"],
    [/ユーザー(さん|くん|君|様)?/g, ""],
    [/主人公/g, ""],
    [/プレイヤー/g, ""],
    [/(?:^|\s|、|。)彼(?:は|が|の|を|に|と)/g, " "],
    [/(?:^|\s|、|。)僕(?:は|が|の|を|に|と)/g, " "],
    [/(?:^|\s|、|。)俺(?:は|が|の|を|に|と)/g, " "],
    // 英語
    [/\b(the user|user|protagonist|player|the viewer|viewer)\b/gi, ""],
    [/\b(he|him|his)\b/gi, ""],
    [/\b(the boy|the man|boyfriend)\b/gi, ""]
  ];
  for (const [re, rep] of patterns) {
    out = out.replace(re, rep);
  }
  // 連続空白とゴミの後始末
  return out.replace(/[、,]\s*[、,]/g, "、").replace(/\s+/g, " ").trim();
}

function describeCharacter(char: VisualActiveCharacter): string {
  // Fluxは自然文の方が反応が良いので、She/Her の3人称ナレーション形式に揃える
  const parts: string[] = [];
  parts.push(`a single female character named ${char.name}`);
  if (char.appearance) parts.push(`she has ${shorten(char.appearance, 140)}`);
  if (char.outfit) parts.push(`she is wearing ${shorten(char.outfit, 80)}`);
  if (char.expression) {
    const expr = normalizeExpression(String(char.expression)) ?? String(char.expression);
    parts.push(`her expression is ${expr}`);
  }
  if (char.pose) parts.push(`her pose: ${shorten(char.pose, 60)}`);
  if (char.mood) parts.push(`her mood: ${shorten(char.mood, 50)}`);
  // relationshipToUser は「viewer」「user」「protagonist」を含みやすく、
  // Flux に余計な人物を呼び込むので promptには出さない（DBには残す）
  return parts.filter(Boolean).join(", ");
}

/**
 * 自然言語モデル (gpt-image-1, dall-e-3) 用のプロンプトを生成。
 *
 * ★ 設計方針:
 *   recentNarration (実際の物語テキスト) を ABSOLUTE TRUTH として最上位に置き、
 *   メタデータ (location/expression/pose 等) は「物語テキストと矛盾した場合は
 *   物語テキストを優先せよ」と明示する。これにより:
 *   - 物語が「カフェで座っている」のに DB が「学校で立っている」でも、画像はカフェで座る
 *   - 物語に出てこない謎の人物が混入しない
 *   - 表情が「驚いている」のに metadata が "smile" でも、物語に合わせて驚いた顔になる
 */
function buildNaturalLanguagePrompt(input: BuildVisualPromptInput): string {
  const parts: string[] = [];

  // 1. 画風指定（先頭で画風を確定）
  const styleDesc: Record<VisualStyle, string> = {
    anime: "Japanese anime illustration style with clean lines and soft cel-shading",
    visual_novel: "Japanese visual novel CG illustration, clean anime art style with detailed backgrounds",
    fantasy: "Fantasy anime illustration with painterly backgrounds and soft magical glow",
    romance: "Romantic anime illustration with warm soft palette and gentle atmosphere",
    adventure: "Dynamic adventure anime illustration with vivid colors",
    dark: "Dark moody anime illustration with cinematic lighting"
  };
  parts.push(styleDesc[input.visualStyle] ?? styleDesc.visual_novel);

  // 2. ★★★ 最重要 ★★★ 実際の物語テキスト (絶対的な真実の源)
  // gpt-image-1 は日本語を理解できるので、原文のまま渡す。
  // これがプロンプト全体で最も強い指示になる。
  const narration = sanitizeProtagonistMentions(shorten(input.recentNarration ?? "", 800));
  if (narration) {
    parts.push(
      `CRITICAL — ABSOLUTE SOURCE OF TRUTH: This is exactly what is happening in the story RIGHT NOW. ` +
      `The illustration MUST depict this scene faithfully. Read it carefully and visualize EXACTLY what it describes:\n\n` +
      `「${narration}」\n\n` +
      `Pay extreme attention to: where the character is, what they are doing (sitting/standing/walking), ` +
      `their facial expression and emotion, and the surrounding environment. ` +
      `If the metadata below contradicts the story text above, IGNORE the metadata and follow the story text.`
    );
  }

  // 3. 構図と視点
  parts.push(`First-person point-of-view shot (the viewer is looking at the scene through their own eyes — the viewer's body must NOT appear in the image).`);
  const camDesc: Record<CameraDistance, string> = {
    close: "Close-up framing, showing only face and upper chest",
    medium: "Medium shot, showing waist up",
    far: "Full-body shot showing the entire figure",
    wide: "Wide establishing shot showing the character and surrounding environment"
  };
  parts.push(camDesc[input.cameraDistance] ?? camDesc.medium);

  // 4. シーン (メタデータ。物語と矛盾したら物語が勝つ)
  const sceneParts: string[] = [];
  if (input.location) {
    sceneParts.push(`Likely location (verify against story above): ${sanitizeProtagonistMentions(shorten(input.location, 80))}`);
  }
  if (input.timeOfDay) {
    sceneParts.push(`Time of day: ${sanitizeProtagonistMentions(shorten(input.timeOfDay, 40))}`);
  }
  if (input.weather) {
    sceneParts.push(`Weather: ${sanitizeProtagonistMentions(shorten(input.weather, 40))}`);
  }
  if (input.sceneSummary && input.sceneSummary !== input.recentNarration) {
    const cleaned = sanitizeProtagonistMentions(shorten(input.sceneSummary, 160));
    if (cleaned) sceneParts.push(`Scene summary: ${cleaned}`);
  }
  if (sceneParts.length > 0) {
    parts.push(sceneParts.join(". "));
  }

  // 5. キャラクター — 外見描写は一貫性のために必須
  const char = input.activeCharacters[0];
  if (char) {
    const charParts: string[] = [];
    charParts.push(`The ONLY character in the frame is a female character named "${char.name}"`);
    if (char.appearance) {
      // 外見はキャラ一貫性の要なので、フルで渡す
      charParts.push(`Her permanent appearance (consistent across all images): ${shorten(char.appearance, 300)}`);
    }
    if (char.outfit) {
      charParts.push(`Outfit she is currently wearing: ${shorten(char.outfit, 150)}`);
    }
    if (char.expression) {
      const expr = normalizeExpression(String(char.expression)) ?? String(char.expression);
      charParts.push(`Suggested facial expression (override if the story above implies a different emotion): ${expr}`);
    }
    if (char.pose) {
      charParts.push(`Suggested pose (override if the story above describes a different pose): ${shorten(char.pose, 80)}`);
    }
    parts.push(charParts.join(". "));
    parts.push(
      `STRICT RULE: ONLY ${char.name} appears in this image. Do NOT add any other characters. ` +
      `Do NOT add male figures. Do NOT add background people unless the story above explicitly mentions them. ` +
      `If unsure, render only ${char.name} alone.`
    );
  } else {
    parts.push("The frame shows only the empty scene with no characters visible.");
  }

  // 6. 画像種別ごとの指示
  if (input.imageKind === "expression_variant") {
    parts.push("This is an expression update: keep the same outfit and overall lighting as the previous image, but change the facial expression and body language to match the current narrative moment from the story text above.");
  } else if (input.imageKind === "event_cg") {
    parts.push("This is a dramatic key visual for an important story moment. Use dramatic composition and emotional lighting that matches the mood of the story text above.");
  } else if (input.imageKind === "manual_scene") {
    parts.push("Illustrate the scene exactly as described in the story text above.");
  }

  // 7. 連続性ヒント
  if (input.previousImagePromptSummary) {
    const cleaned = sanitizeProtagonistMentions(shorten(input.previousImagePromptSummary, 120));
    if (cleaned) parts.push(`For visual continuity, the previous image showed: ${cleaned}. Maintain the same character design.`);
  }

  // 8. 制約
  parts.push("Absolutely no text, no speech bubbles, no subtitles, no watermarks, no logos in the image.");

  return parts.join("\n\n");
}

/**
 * Visual Prompt Builderのメインエントリ。
 *
 * useNaturalLanguagePrompt が true の場合（OpenAI等）:
 *   - 自然言語の詳細な指示文を生成（タグ不要）
 *   - negative prompt は短め（gpt-image-1 は正式にはサポートしないため）
 *
 * false の場合（Flux/SD/Illustrious等）:
 *   - 従来のタグベースプロンプト
 *   - POV/SOLO ロック付き
 *   - 詳細な negative prompt
 */
export function buildVisualPrompt(input: BuildVisualPromptInput): BuiltVisualPrompt {
  const useNatural = input.useNaturalLanguagePrompt ?? false;

  // プロンプト要約 (DB保存用) — 共通
  const summary = [
    `kind=${input.imageKind}`,
    `scene=${input.sceneKey}`,
    `loc=${shorten(input.location, 30)}`,
    input.timeOfDay ? `time=${input.timeOfDay}` : null,
    `chars=${input.activeCharacters.map((c) => c.name).join("|") || "none"}`,
    `expr=${
      input.activeCharacters
        .map((c) => normalizeExpression(c.expression ? String(c.expression) : null) ?? "")
        .filter(Boolean)
        .join("|") || "n/a"
    }`,
    `cam=${input.cameraDistance}`,
    `q=${input.qualityPreset}`
  ]
    .filter(Boolean)
    .join("; ");

  // 一貫性キー — 共通
  const consistencyKey = [
    input.sceneKey,
    input.location,
    input.activeCharacters
      .map((c) => `${c.id}:${(c.outfit || "").slice(0, 32)}`)
      .sort()
      .join("/"),
    input.cameraDistance
  ].join("|");

  if (useNatural) {
    // 自然言語モデル用（OpenAI gpt-image-1 / dall-e-3）
    const positivePrompt = buildNaturalLanguagePrompt(input);
    // gpt-image-1 は negative prompt を公式にはサポートしないが、
    // アダプター側で「避けるべきもの」として positive に追記する
    const negParts = ["male character", "multiple people", "text", "watermark", "logo"];
    if (!input.nsfwAllowed) negParts.unshift("nsfw", "nude", "explicit");
    const negativePrompt = negParts.join(", ");

    return { positivePrompt, negativePrompt, promptSummary: summary, consistencyKey };
  }

  // ---- 以下、Flux/SD/Illustrious 用のタグベースプロンプト ----

  // 1. 画風
  const styleTag = STYLE_TAGS[input.visualStyle] ?? STYLE_TAGS.visual_novel;
  const qualityTag = QUALITY_PRESET_TAGS[input.qualityPreset] ?? QUALITY_PRESET_TAGS.standard;

  // 2. POV強制
  const povLockSentence = `${POV_LOCK_EN}. ${POV_LOCK_JA}.`;

  // 3. キャラクター
  const characterTokens = input.activeCharacters.slice(0, 1).map(describeCharacter).filter(Boolean);
  const heroineName = input.activeCharacters[0]?.name ?? null;
  const characterBlock = characterTokens.length
    ? `in the frame there is only ${characterTokens.join("; ")}, ${heroineName ? `${heroineName} is positioned directly in front of the camera as if facing the viewer's eyes` : "she is positioned directly in front of the camera"}`
    : "the frame shows only the empty scene as seen from the viewer's eyes, no characters in the foreground";

  // 4. シーンコンテクスト
  const sceneTokens: string[] = [];
  if (input.location) sceneTokens.push(`the setting is ${sanitizeProtagonistMentions(shorten(input.location, 60))}`);
  if (input.timeOfDay) sceneTokens.push(`time of day: ${sanitizeProtagonistMentions(shorten(input.timeOfDay, 30))}`);
  if (input.weather) sceneTokens.push(`weather: ${sanitizeProtagonistMentions(shorten(input.weather, 30))}`);
  if (input.sceneSummary) {
    const cleaned = sanitizeProtagonistMentions(shorten(input.sceneSummary, 160));
    if (cleaned) sceneTokens.push(`current beat: ${cleaned}`);
  }

  // 5. 構図
  const composition = cameraTag(input.cameraDistance);

  // 6. imageKindに応じた追加指示
  const kindHints: string[] = [];
  if (input.imageKind === "expression_variant") {
    kindHints.push("keep the same outfit and the same overall lighting, but adapt the facial expression and pose to match the current narrative beat");
  } else if (input.imageKind === "event_cg") {
    kindHints.push("event CG, dramatic composition, key visual moment, polished color grading");
  } else if (input.imageKind === "manual_scene") {
    kindHints.push("manually requested scene illustration, faithful to the described state");
  }

  // 7. 連続性
  if (input.previousImagePromptSummary) {
    const cleaned = sanitizeProtagonistMentions(shorten(input.previousImagePromptSummary, 120));
    if (cleaned) kindHints.push(`maintain visual continuity with previous frame: ${cleaned}`);
  }

  const positiveParts: string[] = [
    povLockSentence,
    SOLO_SUBJECT_LOCK,
    characterBlock,
    composition,
    sceneTokens.join(", "),
    kindHints.join(", "),
    styleTag,
    qualityTag,
    "no text, no subtitles, no speech bubble, no logo, no watermark"
  ].filter((part) => part && part.length > 0);

  const positivePrompt = positiveParts.join(". ");

  // 8. Negative Prompt
  const baseNegative = `${PROTAGONIST_NEG_EN}, ${QUALITY_NEG}`;
  const negativePrompt = input.nsfwAllowed
    ? baseNegative
    : `nsfw, nude, explicit, ${baseNegative}`;

  return { positivePrompt, negativePrompt, promptSummary: summary, consistencyKey };
}
