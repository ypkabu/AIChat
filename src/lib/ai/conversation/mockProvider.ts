import { assessContentSafety } from "@/lib/contentSafety";
import { DEFAULT_RELATIONSHIP } from "@/lib/domain/constants";
import type { ChoiceType, RelationshipValues, SuggestedReply } from "@/lib/domain/types";
import { estimateTokenLikeCount, newId } from "@/lib/utils";
import type { ConversationProvider, ConversationRequest, ConversationResponse } from "./types";

export class MockConversationProvider implements ConversationProvider {
  constructor(
    public id: string,
    private nsfwCapable: boolean
  ) {}

  async generateTurn(request: ConversationRequest): Promise<ConversationResponse> {
    const safety = assessContentSafety(request.userInput, "conversation");
    if (!safety.allowed) {
      return blockedResponse(this.id, safety.message ?? "禁止カテゴリに該当する可能性があります。");
    }

    const characters = request.bundle.characters;
    const turnCount = request.messages.filter((message) => message.message_type === "user").length + 1;
    const primary = characters[turnCount % Math.max(1, characters.length)] ?? characters[0];
    const secondary = characters.find((character) => character.id !== primary?.id);
    const nsfwActive = this.nsfwCapable && Boolean(request.nsfwAllowed);
    const mode = request.session.play_pace_mode ?? request.bundle.style.play_pace_mode ?? "normal";
    const pacing = request.bundle.style.pacing;
    const progressDelta = pacing === "fast" ? 8 : pacing === "slow" ? 3 : 5;

    const narration = buildNarration(request.userInput, request.bundle.scenario.title, turnCount, nsfwActive);
    const characterMessages = [
      {
        characterId: primary?.id,
        characterName: primary?.name ?? "語り手",
        content: buildCharacterLine(primary?.name ?? "相手", request.userInput, turnCount, nsfwActive)
      }
    ];

    if (secondary && turnCount % 2 === 0) {
      characterMessages.push({
        characterId: secondary.id,
        characterName: secondary.name,
        content: `${secondary.user_call_name || "あなた"}、今の言葉で少し見えた気がする。次は何を確かめる？`
      });
    }

    const timeline = buildTimeline(mode, narration, characterMessages);
    const suggestedReplies = buildChoices(turnCount, request.bundle.style.provide_choices, mode);
    const relationshipDelta = choiceLikeDelta(suggestedReplies[0]?.effect ?? DEFAULT_RELATIONSHIP);
    const shouldAdvance = turnCount % 4 === 0;
    const shouldSuggestImage = request.settings.suggest_images_on_major_events && (turnCount % 3 === 0 || shouldAdvance);
    const needsUserInput = mode !== "auto" || shouldAdvance || shouldSuggestImage || nsfwActive || request.session.auto_continue_count >= 2;
    const autoContinueAllowed = mode === "auto" && !needsUserInput;
    const activeForeshadowing = request.foreshadowingItems?.find((item) => ["introduced", "developing", "ready"].includes(item.status));
    const plannedForeshadowing = request.foreshadowingItems?.find((item) => item.status === "planned");
    const foreshadowingUpdates = activeForeshadowing && turnCount % 3 === 0
      ? [
          {
            action: "reinforce" as const,
            foreshadowingId: activeForeshadowing.id,
            title: activeForeshadowing.title,
            clueText: activeForeshadowing.clue_text,
            hiddenTruth: activeForeshadowing.hidden_truth ?? null,
            importance: activeForeshadowing.importance,
            relatedCharacterName: null,
            plannedRevealSceneKey: activeForeshadowing.planned_reveal_scene_key ?? null,
            revealCondition: { sceneKey: activeForeshadowing.planned_reveal_scene_key ?? null, flagKey: null, relationshipHint: null, notes: "mock reinforcement" },
            revealedText: null,
            reason: "既存の伏線を自然に再提示するため。"
          }
        ]
      : plannedForeshadowing && turnCount % 2 === 1
        ? [
            {
              action: "introduce" as const,
              foreshadowingId: plannedForeshadowing.id,
              title: plannedForeshadowing.title,
              clueText: plannedForeshadowing.clue_text,
              hiddenTruth: plannedForeshadowing.hidden_truth ?? null,
              importance: plannedForeshadowing.importance,
              relatedCharacterName: null,
              plannedRevealSceneKey: plannedForeshadowing.planned_reveal_scene_key ?? null,
              revealCondition: { sceneKey: plannedForeshadowing.planned_reveal_scene_key ?? null, flagKey: null, relationshipHint: null, notes: "mock introduce" },
              revealedText: null,
              reason: "場面の違和感として伏線を提示するため。"
            }
          ]
        : [];

    return {
      timeline,
      narration,
      characterMessages,
      suggestedReplies,
      smartReplies: [],
      needsUserInput,
      autoContinueAllowed,
      storyUpdate: {
        shouldAdvance,
        nextSceneKey: shouldAdvance ? `chapter_${request.session.chapter_index}_scene_${turnCount}` : null,
        newFlags: shouldAdvance ? [{ key: `scene_${turnCount}_noticed`, value: true }] : [],
        progressDelta
      },
      memoryCandidates: [],
      relationshipDelta: DEFAULT_RELATIONSHIP,
      imageCue: {
        shouldSuggestImage: false,
        reason: null,
        sceneType: null,
        nsfwLevel: "none"
      },
      directorUpdate: {
        currentBeatIndex: Math.max(0, Math.min(request.session.current_beat_index + 1, 99)),
        objectiveCompleted: shouldAdvance,
        stallRisk: request.session.stall_count >= 1 ? "medium" : "low",
        shouldAdvanceScene: shouldAdvance,
        shouldIntroduceEvent: request.session.scene_turn_count >= 3 || request.session.stall_count >= 2,
        introducedHook: shouldAdvance ? "次の場面につながる小さな手がかりが出た。" : null,
        reason: shouldAdvance ? "ターンの節目に達したため、次シーンへの移行を提案します。" : "現在のビートを一段進めます。"
      },
      foreshadowingUpdates: [],
      qualityCheck: {
        isRepetitive: false,
        hasNewInformation: turnCount % 2 === 0 || foreshadowingUpdates.length > 0,
        hasCharacterAction: true,
        hasEmotionalChange: turnCount % 2 === 1,
        hasRelationshipChange: Boolean(relationshipDelta.trust || relationshipDelta.affection || relationshipDelta.comfort || relationshipDelta.curiosity || relationshipDelta.tension),
        hasSceneChange: shouldAdvance,
        hasForeshadowing: foreshadowingUpdates.length > 0,
        hasChoicePressure: suggestedReplies.length > 0,
        hasForwardMotion: true,
        isStalling: false,
        sceneObjectiveProgress: shouldAdvance ? "high" : "medium",
        qualityScore: 7,
        problem: null,
        improvementHint: null
      },
      usage: {
        backend: this.id,
        provider: this.id.startsWith("mock") ? "mock" : this.id,
        model: this.id,
        input_tokens: estimateTokenLikeCount(JSON.stringify(request).slice(0, 8000)),
        output_tokens: 360,
        estimated_cost_jpy: request.settings.low_cost_mode ? 1.4 : 3.2
      }
    };
  }
}

function blockedResponse(backend: string, message: string): ConversationResponse {
  return {
    timeline: [{ type: "narration", characterName: null, content: message }],
    narration: message,
    characterMessages: [],
    suggestedReplies: [
      {
        id: newId("choice"),
        label: "安全な別の展開に言い換える",
        type: "avoid",
        effect: { trust: 0, affection: 0, comfort: 0, curiosity: 0, tension: -1 }
      },
      {
        id: newId("choice"),
        label: "場面を切り替える",
        type: "leave",
        effect: { trust: 0, affection: 0, comfort: 0, curiosity: 1, tension: -1 }
      }
    ],
    smartReplies: [],
    needsUserInput: true,
    autoContinueAllowed: false,
    storyUpdate: {
      shouldAdvance: false,
      nextSceneKey: null,
      newFlags: [],
      progressDelta: 0
    },
    memoryCandidates: [],
    relationshipDelta: DEFAULT_RELATIONSHIP,
    imageCue: {
      shouldSuggestImage: false,
      reason: null,
      sceneType: null,
      nsfwLevel: "none"
    },
    directorUpdate: {
      currentBeatIndex: 0,
      objectiveCompleted: false,
      stallRisk: "medium",
      shouldAdvanceScene: false,
      shouldIntroduceEvent: true,
      introducedHook: null,
      reason: "安全上の理由で通常進行を止め、次ターンでは安全な小展開に戻します。"
    },
    foreshadowingUpdates: [],
    qualityCheck: {
      isRepetitive: false,
      hasNewInformation: false,
      hasCharacterAction: false,
      hasEmotionalChange: false,
      hasRelationshipChange: false,
      hasSceneChange: false,
      hasForeshadowing: false,
      hasChoicePressure: true,
      hasForwardMotion: false,
      isStalling: true,
      sceneObjectiveProgress: "low",
      qualityScore: 45,
      problem: "安全ブロックにより物語進行が止まりました。",
      improvementHint: "禁止カテゴリを避け、安全な場面変化か手がかりで進行を戻す。"
    },
    usage: {
      backend,
      provider: backend.startsWith("mock") ? "mock" : backend,
      model: backend,
      input_tokens: 0,
      output_tokens: 40,
      estimated_cost_jpy: 0
    }
  };
}

function buildTimeline(
  mode: string,
  narration: string,
  characterMessages: Array<{ characterName: string; content: string }>
) {
  if (mode === "auto") {
    return [
      { type: "narration" as const, characterName: null, content: narration },
      ...characterMessages.map((message) => ({
        type: "character" as const,
        characterName: message.characterName,
        content: message.content
      })),
      {
        type: "narration" as const,
        characterName: null,
        content: "雨音のように、場面は小さな余韻を残して次の会話へ流れていく。"
      }
    ].slice(0, 4);
  }

  if (mode === "choice_heavy") {
    return characterMessages.slice(0, 1).map((message) => ({
      type: "character" as const,
      characterName: message.characterName,
      content: message.content
    }));
  }

  return [
    { type: "narration" as const, characterName: null, content: narration },
    ...characterMessages.slice(0, 1).map((message) => ({
      type: "character" as const,
      characterName: message.characterName,
      content: message.content
    }))
  ];
}

function buildNarration(userInput: string, scenarioTitle: string, turnCount: number, nsfwActive: boolean) {
  const boundary = nsfwActive ? "互いの合意と境界を確かめながら、" : "";
  if (turnCount % 3 === 0) {
    return `${boundary}${scenarioTitle}の場面は少しだけ先へ進む。あなたの言葉が空気を変え、誰かが隠していた小さな事実に手が届きそうになる。`;
  }
  return `${boundary}あなたの一言を受けて、場の沈黙がほどける。視線、息遣い、距離感が、次の会話の入口を作っていく。`;
}

function buildCharacterLine(name: string, userInput: string, turnCount: number, nsfwActive: boolean) {
  const echo = userInput.length > 42 ? `${userInput.slice(0, 42)}...` : userInput;
  if (nsfwActive) {
    return `「${echo}」って言われると、少し近い話をしてもいいのかなって思う。嫌ならすぐ止めるから、今の気持ちを聞かせて。`;
  }
  if (turnCount % 2 === 0) {
    return `「${echo}」か。うん、その見方は大事だと思う。${name}は少し考えてから、声の調子を落とした。`;
  }
  return `「${echo}」って、今の場面にはちょうどいい言葉かもしれない。もう少しだけ、一緒に確かめよう。`;
}

function buildChoices(turnCount: number, enabled: boolean, mode: string): SuggestedReply[] {
  if (!enabled) return [];

  const sets: Array<Array<[string, ChoiceType, RelationshipValues & { flag?: string }]>> = [
    [
      ["相手の表情をよく見る", "observe", { trust: 0, affection: 0, comfort: 0, curiosity: 1, tension: -1, flag: "observed_expression" }],
      ["率直に気持ちを伝える", "honest", { trust: 1, affection: 1, comfort: 1, curiosity: 0, tension: 0, flag: "spoke_honestly" }],
      ["別の可能性を質問する", "question", { trust: 0, affection: 0, comfort: 0, curiosity: 2, tension: 0, flag: "asked_possibility" }]
    ],
    [
      ["一歩近づいて声を落とす", "approach", { trust: 1, affection: 1, comfort: 0, curiosity: 0, tension: 1, flag: "approached" }],
      ["少し黙って反応を待つ", "silence", { trust: 0, affection: 0, comfort: 1, curiosity: 1, tension: -1, flag: "waited_silently" }],
      ["周囲の手がかりを探す", "action", { trust: 0, affection: 0, comfort: 0, curiosity: 2, tension: 0, flag: "searched_clue" }]
    ]
  ];

  const base = sets[turnCount % sets.length];
  const extra: Array<[string, ChoiceType, RelationshipValues & { flag?: string }]> = [
    ["気になった矛盾を指摘する", "question", { trust: 0, affection: 0, comfort: 0, curiosity: 2, tension: 1, flag: "pointed_out_gap" }],
    ["相手の判断に任せる", "talk", { trust: 1, affection: 0, comfort: 1, curiosity: 0, tension: -1, flag: "trusted_other" }],
    ["あえて距離を取る", "avoid", { trust: 0, affection: 0, comfort: 0, curiosity: 0, tension: 1, flag: "kept_distance" }]
  ];
  const choices = mode === "choice_heavy" ? [...base, ...extra].slice(0, 6) : mode === "auto" ? base.slice(0, 2) : base;

  return choices.map(([label, type, effect]) => ({
    id: newId("choice"),
    label,
    type,
    effect
  }));
}

function choiceLikeDelta(effect: RelationshipValues) {
  return {
    trust: effect.trust,
    affection: effect.affection,
    comfort: effect.comfort,
    curiosity: effect.curiosity,
    tension: effect.tension
  };
}
