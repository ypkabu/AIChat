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
 * Visual Prompt Builderのメインエントリ。
 *
 * - 必ず first-person POV を強制し、主人公を画像に映さないよう指示
 * - Negative promptに主人公混入除外・構図ズレ除外を必ず入れる
 * - imageKind / qualityPreset で品質タグを切り替える
 * - 主要キャラの服装・表情・ポーズは「解決済みのシーン状態」から渡されたものを信頼する
 */
export function buildVisualPrompt(input: BuildVisualPromptInput): BuiltVisualPrompt {
  // 1. 画風
  const styleTag = STYLE_TAGS[input.visualStyle] ?? STYLE_TAGS.visual_novel;
  const qualityTag = QUALITY_PRESET_TAGS[input.qualityPreset] ?? QUALITY_PRESET_TAGS.standard;

  // 2. POV強制 — Flux系では prompt先頭の自然文が最も効くので、ここを最優先
  const povLockSentence = `${POV_LOCK_EN}. ${POV_LOCK_JA}.`;

  // 3. キャラクター（POVの直後に置く。「キャラはこの1人だけ」を強く宣言）
  const characterTokens = input.activeCharacters.slice(0, 1).map(describeCharacter).filter(Boolean);
  const heroineName = input.activeCharacters[0]?.name ?? null;
  const characterBlock = characterTokens.length
    ? `in the frame there is only ${characterTokens.join("; ")}, ${heroineName ? `${heroineName} is positioned directly in front of the camera as if facing the viewer's eyes` : "she is positioned directly in front of the camera"}`
    : "the frame shows only the empty scene as seen from the viewer's eyes, no characters in the foreground";

  // 4. シーンコンテクスト（主人公への言及を除去してから入れる）
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
    kindHints.push(
      "same character pose and outfit as previous frame, only the facial expression changes, keep composition and lighting identical"
    );
  } else if (input.imageKind === "event_cg") {
    kindHints.push("event CG, dramatic composition, key visual moment, polished color grading");
  } else if (input.imageKind === "manual_scene") {
    kindHints.push("manually requested scene illustration, faithful to the described state");
  }

  // 7. 連続性 / 過去サマリ（主人公への言及を除去）
  if (input.previousImagePromptSummary) {
    const cleaned = sanitizeProtagonistMentions(shorten(input.previousImagePromptSummary, 120));
    if (cleaned) kindHints.push(`maintain visual continuity with previous frame: ${cleaned}`);
  }

  // Positive prompt の順序:
  //   POV → SOLO → キャラ → 構図 → シーン → kindHints → 画風 → 品質 → サニタイズ
  // 先頭ほどモデルの注意が強いので、POVと単独構図が必ず先頭に来るようにする。
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

  // 9. プロンプト要約 (DB保存用)
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

  // 10. 一貫性キー: シーン × アクティブキャラ × 服装 × カメラ距離（表情とimageKindは外す）
  const consistencyKey = [
    input.sceneKey,
    input.location,
    input.activeCharacters
      .map((c) => `${c.id}:${(c.outfit || "").slice(0, 32)}`)
      .sort()
      .join("/"),
    input.cameraDistance
  ].join("|");

  return {
    positivePrompt,
    negativePrompt,
    promptSummary: summary,
    consistencyKey
  };
}
