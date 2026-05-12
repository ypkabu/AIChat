"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ForeshadowingItem, ForeshadowingStatus, ForeshadowingVisibility, RevealReadiness, StoryBundle } from "@/lib/domain/types";
import { newId, nowIso } from "@/lib/utils";
import { Field, SelectField } from "./formControls";

const statusOptions: Array<{ value: ForeshadowingStatus; label: string }> = [
  { value: "planned", label: "planned" },
  { value: "introduced", label: "introduced" },
  { value: "developing", label: "developing" },
  { value: "ready", label: "ready" },
  { value: "revealed", label: "revealed" },
  { value: "discarded", label: "discarded" }
];

const visibilityOptions: Array<{ value: ForeshadowingVisibility; label: string }> = [
  { value: "hidden_to_user", label: "hidden_to_user" },
  { value: "visible_hint", label: "visible_hint" },
  { value: "debug_only", label: "debug_only" }
];

const readinessOptions: Array<{ value: RevealReadiness; label: string }> = [
  { value: "not_ready", label: "not_ready" },
  { value: "warming_up", label: "warming_up" },
  { value: "ready", label: "ready" },
  { value: "overdue", label: "overdue" }
];

export function ForeshadowingTab({ bundle, onChange }: { bundle: StoryBundle; onChange: (bundle: StoryBundle) => void }) {
  const addItem = () => {
    const now = nowIso();
    const item: ForeshadowingItem = {
      id: newId("foreshadow"),
      scenario_id: bundle.scenario.id,
      session_id: null,
      title: "新しい伏線",
      clue_text: "",
      hidden_truth: "",
      related_character_id: null,
      related_lore_entry_id: null,
      introduced_at_message_id: null,
      introduced_scene_key: null,
      planned_reveal_scene_key: null,
      reveal_condition_json: {},
      importance: 3,
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
    onChange({ ...bundle, foreshadowingItems: [...bundle.foreshadowingItems, item] });
  };

  const updateItem = (id: string, patch: Partial<ForeshadowingItem>) => {
    onChange({
      ...bundle,
      foreshadowingItems: bundle.foreshadowingItems.map((item) => (item.id === id ? { ...item, ...patch } : item))
    });
  };

  const characterOptions = [
    { value: "", label: "なし" },
    ...bundle.characters.map((character) => ({ value: character.id, label: character.name }))
  ];
  const loreOptions = [
    { value: "", label: "なし" },
    ...bundle.lorebook.map((entry) => ({ value: entry.id, label: entry.title }))
  ];
  const sceneOptions = [
    { value: "", label: "未定" },
    ...bundle.storyScenes.map((scene) => ({ value: scene.scene_key, label: `${scene.scene_key} / ${scene.title}` }))
  ];

  const unresolved = bundle.foreshadowingItems.filter((item) => !["revealed", "discarded"].includes(item.status));

  return (
    <div className="grid gap-4">
      <section className="rounded-md border border-white/10 bg-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">伏線</h2>
            <p className="mt-1 text-xs leading-5 text-muted">未回収 {unresolved.length} 件。hidden_truth は通常プレイには表示しません。</p>
          </div>
          <button type="button" onClick={addItem} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-canvas">
            <Plus className="h-4 w-4" aria-hidden />
            追加
          </button>
        </div>

        <div className="grid gap-3">
          {bundle.foreshadowingItems.map((item) => (
            <details key={item.id} open={!["revealed", "discarded"].includes(item.status)} className="rounded-md border border-white/10 bg-panel2 p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold">
                {item.title} / {item.status} / {item.reveal_readiness}
              </summary>
              <div className="mt-3 grid gap-3">
                <Field label="タイトル" value={item.title} onChange={(title) => updateItem(item.id, { title })} />
                <Field label="clue_text" value={item.clue_text} onChange={(clue_text) => updateItem(item.id, { clue_text })} multiline />
                <Field label="hidden_truth" value={item.hidden_truth ?? ""} onChange={(hidden_truth) => updateItem(item.id, { hidden_truth })} multiline />
                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    label="関連キャラクター"
                    value={item.related_character_id ?? ""}
                    options={characterOptions}
                    onChange={(related_character_id) => updateItem(item.id, { related_character_id: related_character_id || null })}
                  />
                  <SelectField
                    label="関連ロア"
                    value={item.related_lore_entry_id ?? ""}
                    options={loreOptions}
                    onChange={(related_lore_entry_id) => updateItem(item.id, { related_lore_entry_id: related_lore_entry_id || null })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    label="初出シーン"
                    value={item.introduced_scene_key ?? ""}
                    options={sceneOptions}
                    onChange={(introduced_scene_key) => updateItem(item.id, { introduced_scene_key: introduced_scene_key || null })}
                  />
                  <SelectField
                    label="回収予定シーン"
                    value={item.planned_reveal_scene_key ?? ""}
                    options={sceneOptions}
                    onChange={(planned_reveal_scene_key) => updateItem(item.id, { planned_reveal_scene_key: planned_reveal_scene_key || null })}
                  />
                </div>
                <Field
                  label="回収条件 JSON"
                  value={JSON.stringify(item.reveal_condition_json ?? {}, null, 2)}
                  onChange={(value) => updateItem(item.id, { reveal_condition_json: parseJsonObject(value) })}
                  multiline
                />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="重要度 1〜5"
                    type="number"
                    value={item.importance}
                    onChange={(value) => updateItem(item.id, { importance: Math.min(5, Math.max(1, Number(value) || 1)) })}
                  />
                  <SelectField
                    label="status"
                    value={item.status}
                    options={statusOptions}
                    onChange={(status) => updateItem(item.id, { status: status as ForeshadowingStatus })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    label="visibility"
                    value={item.visibility}
                    options={visibilityOptions}
                    onChange={(visibility) => updateItem(item.id, { visibility: visibility as ForeshadowingVisibility })}
                  />
                  <SelectField
                    label="reveal_readiness"
                    value={item.reveal_readiness}
                    options={readinessOptions}
                    onChange={(reveal_readiness) => updateItem(item.id, { reveal_readiness: reveal_readiness as RevealReadiness })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs text-muted">
                  <span>turns {item.turns_since_introduced}</span>
                  <span>reinforce {item.reinforcement_count}</span>
                  <span>overdue {item.overdue_score}</span>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...bundle, foreshadowingItems: bundle.foreshadowingItems.filter((candidate) => candidate.id !== item.id) })}
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

function parseJsonObject(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return { notes: value };
  }
}
