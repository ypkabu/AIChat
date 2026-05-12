"use client";

import { MOOD_OPTIONS, PROSE_STYLE_OPTIONS } from "@/lib/domain/constants";
import type { StoryBundle, StyleSettings } from "@/lib/domain/types";
import { SelectField, ToggleRow } from "./formControls";

export function StyleTab({ bundle, onChange }: { bundle: StoryBundle; onChange: (bundle: StoryBundle) => void }) {
  const update = (patch: Partial<StyleSettings>) => onChange({ ...bundle, style: { ...bundle.style, ...patch } });

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">文章と演出</h2>
        <SelectField
          label="ナレーション視点"
          value={bundle.style.narration_perspective}
          onChange={(value) => update({ narration_perspective: value as StyleSettings["narration_perspective"] })}
          options={[
            { value: "first_person", label: "一人称" },
            { value: "second_person", label: "二人称" },
            { value: "third_person", label: "三人称" }
          ]}
        />
        <SelectField
          label="時制"
          value={bundle.style.tense}
          onChange={(value) => update({ tense: value as StyleSettings["tense"] })}
          options={[
            { value: "past", label: "過去形" },
            { value: "present", label: "現在形" }
          ]}
        />
        <SelectField
          label="応答の長さ"
          value={bundle.style.response_length}
          onChange={(value) => update({ response_length: value as StyleSettings["response_length"] })}
          options={[
            { value: "short", label: "短い" },
            { value: "medium", label: "中間" },
            { value: "long", label: "長い" },
            { value: "auto", label: "自動" }
          ]}
        />
        <SelectField
          label="表現方式"
          value={bundle.style.expression_style}
          onChange={(value) => update({ expression_style: value as StyleSettings["expression_style"] })}
          options={[
            { value: "dialogue_heavy", label: "会話多め" },
            { value: "balanced", label: "基本" },
            { value: "action_heavy", label: "行動多め" }
          ]}
        />
        <SelectField
          label="文章スタイル"
          value={bundle.style.prose_style}
          onChange={(prose_style) => update({ prose_style })}
          options={PROSE_STYLE_OPTIONS.map((option) => ({ value: option, label: option }))}
        />
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">雰囲気 最大2つ</h2>
        <div className="flex flex-wrap gap-2">
          {MOOD_OPTIONS.map((mood) => {
            const selected = bundle.style.moods.includes(mood);
            return (
              <button
                key={mood}
                type="button"
                disabled={!selected && bundle.style.moods.length >= 2}
                onClick={() =>
                  update({
                    moods: selected ? bundle.style.moods.filter((item) => item !== mood) : [...bundle.style.moods, mood]
                  })
                }
                className={`min-h-10 rounded-md px-3 text-sm disabled:opacity-35 ${
                  selected ? "bg-brand text-canvas font-semibold" : "bg-panel2 text-muted"
                }`}
              >
                {mood}
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-2 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">プレイシステム</h2>
        <SelectField
          label="進行モード"
          value={bundle.style.play_pace_mode}
          onChange={(value) => update({ play_pace_mode: value as StyleSettings["play_pace_mode"] })}
          options={[
            { value: "auto", label: "オート" },
            { value: "normal", label: "ふつう" },
            { value: "choice_heavy", label: "選択肢多め" }
          ]}
        />
        <SelectField
          label="オート連続回数"
          value={String(bundle.style.auto_advance_message_count)}
          onChange={(value) => update({ auto_advance_message_count: Number(value) as StyleSettings["auto_advance_message_count"] })}
          options={[
            { value: "1", label: "1回" },
            { value: "2", label: "2回" },
            { value: "3", label: "3回" }
          ]}
        />
        <SelectField
          label="選択肢頻度"
          value={bundle.style.choice_frequency}
          onChange={(value) => update({ choice_frequency: value as StyleSettings["choice_frequency"] })}
          options={[
            { value: "normal", label: "標準" },
            { value: "high", label: "多め" }
          ]}
        />
        <ToggleRow label="ユーザーターンに選択肢を提供" checked={bundle.style.provide_choices} onChange={(provide_choices) => update({ provide_choices })} />
        <ToggleRow label="背景インフォボックスを表示" checked={bundle.style.show_background_info} onChange={(show_background_info) => update({ show_background_info })} />
        <ToggleRow label="キャラのインフォボックスを表示" checked={bundle.style.show_character_info} onChange={(show_character_info) => update({ show_character_info })} />
        <ToggleRow label="自由入力を許可" checked={bundle.style.allow_free_input} onChange={(allow_free_input) => update({ allow_free_input })} />
        <ToggleRow label="AIによる場面進行を許可" checked={bundle.style.allow_ai_scene_progress} onChange={(allow_ai_scene_progress) => update({ allow_ai_scene_progress })} />
        <ToggleRow label="「続きを見る」ボタンを許可" checked={bundle.style.allow_continue_button ?? true} onChange={(allow_continue_button) => update({ allow_continue_button })} />
      </section>

      <section className="grid gap-2 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">モード最適化</h2>
        <SelectField
          label="最適化モード"
          value={bundle.style.mode_optimization ?? "none"}
          onChange={(value) => update({ mode_optimization: value as import("@/lib/domain/types").ModeOptimization })}
          options={[
            { value: "none", label: "設定しない" },
            { value: "girlfriend", label: "AI彼女モード" },
            { value: "story", label: "物語モード" }
          ]}
        />
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">進行方式</h2>
        <SelectField
          label="難易度"
          value={bundle.style.difficulty}
          onChange={(value) => update({ difficulty: value as StyleSettings["difficulty"] })}
          options={[
            { value: "easy", label: "簡単" },
            { value: "normal", label: "普通" },
            { value: "hard", label: "難しい" },
            { value: "extreme", label: "極限" }
          ]}
        />
        <SelectField
          label="展開速度"
          value={bundle.style.pacing}
          onChange={(value) => update({ pacing: value as StyleSettings["pacing"] })}
          options={[
            { value: "fast", label: "速い" },
            { value: "natural", label: "自然" },
            { value: "slow", label: "遅い" }
          ]}
        />
      </section>
    </div>
  );
}
