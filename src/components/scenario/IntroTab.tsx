"use client";

import type { IntroSettings, StoryBundle, SuggestedReply } from "@/lib/domain/types";
import { newId } from "@/lib/utils";
import { Field } from "./formControls";

export function IntroTab({ bundle, onChange }: { bundle: StoryBundle; onChange: (bundle: StoryBundle) => void }) {
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
