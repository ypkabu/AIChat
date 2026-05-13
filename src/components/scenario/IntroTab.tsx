"use client";

import { useState } from "react";
import type { IntroSettings, StoryBundle, SuggestedReply } from "@/lib/domain/types";
import { newId } from "@/lib/utils";
import { Field } from "./formControls";

export function IntroTab({ bundle, onChange }: { bundle: StoryBundle; onChange: (bundle: StoryBundle) => void }) {
  const [previewMode, setPreviewMode] = useState<"narrator" | "user">("narrator");
  const update = (patch: Partial<IntroSettings>) => onChange({ ...bundle, intro: { ...bundle.intro, ...patch } });

  const updateChoice = (index: number, label: string) => {
    const choices = [...bundle.intro.initial_choices];
    choices[index] = { ...choices[index], label };
    update({ initial_choices: choices });
  };

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">イントロ</h2>
        <Field label="ストーリー開始文" value={bundle.intro.start_text} onChange={(start_text) => update({ start_text })} multiline />
        <Field label="開始場所" value={bundle.intro.start_location} onChange={(start_location) => update({ start_location })} />
        <Field label="開始状況" value={bundle.intro.start_situation} onChange={(start_situation) => update({ start_situation })} multiline />
        <div className="grid gap-2">
          <p className="text-xs font-medium text-muted">登場キャラ</p>
          {bundle.characters.map((character) => (
            <label key={character.id} className="flex min-h-12 items-center justify-between rounded-md bg-panel2 px-3">
              <span>{character.name}</span>
              <input
                type="checkbox"
                checked={bundle.intro.appearing_character_ids.includes(character.id)}
                onChange={(event) =>
                  update({
                    appearing_character_ids: event.target.checked
                      ? [...bundle.intro.appearing_character_ids, character.id]
                      : bundle.intro.appearing_character_ids.filter((id) => id !== character.id)
                  })
                }
                className="h-5 w-5 accent-brand"
              />
            </label>
          ))}
        </div>
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted">使用するユーザープロフィール</span>
          <select
            value={bundle.intro.user_profile_id}
            onChange={(event) => update({ user_profile_id: event.target.value })}
            className="min-h-11 rounded-md border border-white/10 bg-panel2 px-3 text-base"
          >
            {bundle.userProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.display_name}
              </option>
            ))}
          </select>
        </label>
        <Field label="初回ナレーション" value={bundle.intro.initial_narration} onChange={(initial_narration) => update({ initial_narration })} multiline />
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">初回キャラ発言</h2>
        {bundle.intro.initial_character_messages.map((message, index) => (
          <div key={`${message.characterId}-${index}`} className="grid gap-2 rounded-md bg-panel2 p-3">
            <select
              value={message.characterId}
              onChange={(event) => {
                const character = bundle.characters.find((item) => item.id === event.target.value);
                const next = [...bundle.intro.initial_character_messages];
                next[index] = { ...message, characterId: event.target.value, characterName: character?.name ?? message.characterName };
                update({ initial_character_messages: next });
              }}
              className="min-h-11 rounded-md border border-white/10 bg-canvas px-3 text-base"
            >
              {bundle.characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
            <Field
              label="発言"
              value={message.content}
              onChange={(content) => {
                const next = [...bundle.intro.initial_character_messages];
                next[index] = { ...message, content };
                update({ initial_character_messages: next });
              }}
              multiline
            />
          </div>
        ))}
        <button
          type="button"
          className="min-h-11 rounded-md bg-panel2 text-sm font-semibold"
          onClick={() => {
            const character = bundle.characters[0];
            update({
              initial_character_messages: [
                ...bundle.intro.initial_character_messages,
                { characterId: character.id, characterName: character.name, content: "" }
              ]
            });
          }}
        >
          発言を追加
        </button>
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">初回選択肢</h2>
        {bundle.intro.initial_choices.map((choice, index) => (
          <Field key={choice.id} label={`選択肢 ${index + 1}`} value={choice.label} onChange={(label) => updateChoice(index, label)} />
        ))}
        <button
          type="button"
          className="min-h-11 rounded-md bg-panel2 text-sm font-semibold"
          onClick={() => update({ initial_choices: [...bundle.intro.initial_choices, newChoice()] })}
        >
          選択肢を追加
        </button>
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">プレビュー</h2>
          <div className="flex rounded-md bg-panel2 p-1">
            {[
              ["narrator", "ナレーター"],
              ["user", "ユーザー"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPreviewMode(value as "narrator" | "user")}
                className={`min-h-8 rounded-sm px-3 text-xs ${
                  previewMode === value ? "bg-brand font-semibold text-canvas" : "text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <IntroPreview bundle={bundle} mode={previewMode} />
      </section>
    </div>
  );
}

function IntroPreview({ bundle, mode }: { bundle: StoryBundle; mode: "narrator" | "user" }) {
  const profile = bundle.userProfiles.find((item) => item.id === bundle.intro.user_profile_id) ?? bundle.userProfiles[0];
  const introLines = [
    bundle.intro.initial_narration || bundle.intro.start_text,
    ...bundle.intro.initial_character_messages.map((message) => message.content).filter(Boolean)
  ].filter(Boolean);

  return (
    <div className="grid gap-3 rounded-md bg-canvas/60 p-3">
      {mode === "narrator" && (
        <div className="whitespace-pre-wrap rounded-md border border-white/10 bg-panel2 px-3 py-3 text-sm leading-7 text-ink">
          {introLines.length ? introLines.join("\n\n") : "イントロを入力すると、ここに開始時の流れが表示されます。"}
        </div>
      )}
      {mode === "user" && (
        <div className="grid gap-2">
          {bundle.intro.initial_narration && (
            <p className="rounded-md bg-panel2 px-3 py-3 text-sm leading-7 text-muted">{bundle.intro.initial_narration}</p>
          )}
          {bundle.intro.initial_character_messages.map((message, index) => {
            const character = bundle.characters.find((item) => item.id === message.characterId);
            return (
              <div key={`${message.characterId}-${index}`} className="flex items-start gap-2">
                <div
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold text-canvas"
                  style={{ backgroundColor: character?.display_color ?? "#8b5cf6" }}
                >
                  {(character?.name ?? message.characterName ?? "C").slice(0, 1)}
                </div>
                <div className="min-w-0 rounded-md bg-panel2 px-3 py-2.5">
                  <p className="mb-1 text-[11px] text-muted">{character?.name ?? message.characterName}</p>
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content || "発言未入力"}</p>
                </div>
              </div>
            );
          })}
          <div className="ml-auto max-w-[84%] rounded-md bg-brand px-3 py-2.5 text-sm leading-6 text-canvas">
            {profile?.display_name ?? "ユーザー"}として始める
          </div>
        </div>
      )}
    </div>
  );
}

function newChoice(): SuggestedReply {
  return {
    id: newId("choice"),
    label: "次の行動を選ぶ",
    type: "talk",
    effect: { trust: 0, affection: 0, comfort: 0, curiosity: 0, tension: 0 }
  };
}
