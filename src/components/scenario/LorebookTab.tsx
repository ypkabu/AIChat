"use client";

import { Plus, Trash2 } from "lucide-react";
import type { LorebookEntry, StoryBundle } from "@/lib/domain/types";
import { newId, nowIso, splitTags } from "@/lib/utils";
import { Field, ToggleRow } from "./formControls";

export function LorebookTab({ bundle, onChange }: { bundle: StoryBundle; onChange: (bundle: StoryBundle) => void }) {
  const addEntry = () => {
    const now = nowIso();
    const entry: LorebookEntry = {
      id: newId("lore"),
      scenario_id: bundle.scenario.id,
      title: "新しいロア",
      content: "",
      keywords: [],
      importance: 3,
      always_include: false,
      related_character_ids: [],
      created_at: now,
      updated_at: now
    };
    onChange({ ...bundle, lorebook: [...bundle.lorebook, entry] });
  };

  const updateEntry = (id: string, patch: Partial<LorebookEntry>) => {
    onChange({
      ...bundle,
      lorebook: bundle.lorebook.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    });
  };

  return (
    <div className="grid gap-4">
      <section className="rounded-md border border-white/10 bg-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">ロアブック</h2>
            <p className="mt-1 text-xs leading-5 text-muted">always_include、キーワード一致、重要度を使ってプロンプト投入を絞ります。</p>
          </div>
          <button type="button" onClick={addEntry} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-canvas">
            <Plus className="h-4 w-4" aria-hidden />
            追加
          </button>
        </div>

        <div className="grid gap-3">
          {bundle.lorebook.map((entry) => (
            <details key={entry.id} open className="rounded-md border border-white/10 bg-panel2 p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold">{entry.title}</summary>
              <div className="mt-3 grid gap-3">
                <Field label="タイトル" value={entry.title} onChange={(title) => updateEntry(entry.id, { title })} />
                <Field label="内容" value={entry.content} onChange={(content) => updateEntry(entry.id, { content })} multiline />
                <Field
                  label="キーワード"
                  value={entry.keywords.join(" ")}
                  onChange={(value) => updateEntry(entry.id, { keywords: splitTags(value) })}
                  placeholder="灯台 手紙 組織名"
                />
                <Field
                  label="重要度 1〜5"
                  type="number"
                  value={entry.importance}
                  onChange={(value) => updateEntry(entry.id, { importance: Math.min(5, Math.max(1, Number(value) || 1)) })}
                />
                <ToggleRow label="always_include" checked={entry.always_include} onChange={(always_include) => updateEntry(entry.id, { always_include })} />
                <div className="grid gap-2">
                  <p className="text-xs text-muted">関連キャラクター</p>
                  {bundle.characters.map((character) => (
                    <ToggleRow
                      key={character.id}
                      label={character.name}
                      checked={entry.related_character_ids.includes(character.id)}
                      onChange={(checked) =>
                        updateEntry(entry.id, {
                          related_character_ids: checked
                            ? [...entry.related_character_ids, character.id]
                            : entry.related_character_ids.filter((id) => id !== character.id)
                        })
                      }
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...bundle, lorebook: bundle.lorebook.filter((item) => item.id !== entry.id) })}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 text-sm text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  削除
                </button>
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
