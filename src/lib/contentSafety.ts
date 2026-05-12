import { FORBIDDEN_CONTENT_RULES } from "./domain/constants";

type SafetyKind = "conversation" | "image";

const BLOCK_PATTERNS: Record<string, RegExp[]> = {
  non_consent: [
    /非合意|同意(?:が)?ない|無理やり|強制|脅迫|性的暴力|レイプ|rape|non[-\s]?consent/i,
    /抵抗できない.*性的|眠っている.*性的|酔っている.*性的/i
  ],
  incest: [/近親|親子.*性的|兄妹.*性的|姉弟.*性的|incest/i],
  real_person_deepfake: [/実在人物.*性的|本人に無断.*画像|deepfake|ディープフェイク/i],
  trafficking_exploitation_abuse: [/人身売買|搾取|性的虐待|trafficking|sexual abuse/i],
  bestiality: [/動物.*性的|獣姦|bestiality/i],
  illegal_content: [/違法|犯罪を実行|違法薬物|illegal/i],
  non_consensual_intimate_images: [/リベンジポルノ|非同意.*親密画像|盗撮.*性的|流出.*裸|revenge porn/i]
};

export type SafetyResult = {
  allowed: boolean;
  blockedRuleKeys: string[];
  message?: string;
};

export function assessContentSafety(text: string, kind: SafetyKind): SafetyResult {
  const normalized = text.trim();
  if (!normalized) return { allowed: true, blockedRuleKeys: [] };

  const blockedRuleKeys = FORBIDDEN_CONTENT_RULES.filter((rule) => rule.enabled && rule.applies_to.includes(kind))
    .filter((rule) => BLOCK_PATTERNS[rule.key]?.some((pattern) => pattern.test(normalized)))
    .map((rule) => rule.key);

  if (blockedRuleKeys.length === 0) {
    return { allowed: true, blockedRuleKeys };
  }

  return {
    allowed: false,
    blockedRuleKeys,
    message:
      "この内容はアプリの禁止カテゴリに該当する可能性があるため扱えません。合意、成人、創作上の安全境界を保った別の展開にしてください。"
  };
}

export function buildForbiddenRulesPrompt() {
  return FORBIDDEN_CONTENT_RULES.filter((rule) => rule.enabled)
    .map((rule) => `- ${rule.label}: ${rule.description}`)
    .join("\n");
}

export function nsfwAllowed(adultConfirmed: boolean, toggleEnabled: boolean) {
  return adultConfirmed && toggleEnabled;
}
