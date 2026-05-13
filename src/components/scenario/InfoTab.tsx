"use client";

import type { StoryBundle } from "@/lib/domain/types";
import { GENRE_PRESETS } from "@/lib/domain/constants";
import { joinTags, splitTags } from "@/lib/utils";
import { Field, SelectField } from "./formControls";

export function InfoTab({ bundle, onChange }: { bundle: StoryBundle; onChange: (bundle: StoryBundle) => void }) {
  const updateScenario = (patch: Partial<typeof bundle.scenario>) => {
    onChange({ ...bundle, scenario: { ...bundle.scenario, ...patch } });
  };

  const applyGenrePreset = (preset: (typeof GENRE_PRESETS)[number]) => {
    onChange({
      ...bundle,
      scenario: { ...bundle.scenario, genre: preset.genre },
      style: {
        ...bundle.style,
        moods: [...preset.moods],
        prose_style: preset.prose_style,
        expression_style: preset.expression_style,
        response_length: preset.response_length,
        pacing: preset.pacing
      }
    });
  };

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">ジャンルプリセット</h2>
        <p className="text-xs text-muted">選択するとジャンル・雰囲気・文章スタイルを一括設定します。</p>
        <div className="grid gap-2">
          {GENRE_PRESETS.map((preset) => {
            const isSelected = bundle.scenario.genre === preset.genre;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyGenrePreset(preset)}
                className={`rounded-md border p-3 text-left transition-colors ${
                  isSelected
                    ? "border-brand bg-brand/15 text-ink"
                    : "border-white/10 bg-panel2 text-ink hover:border-brand/40"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-semibold">{preset.label}</span>
                  {isSelected && (
                    <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-canvas">選択中</span>
                  )}
                </div>
                <p className="mb-2 text-xs text-muted">{preset.description}</p>
                <div className="flex flex-wrap gap-1">
                  {preset.moods.map((mood) => (
                    <span key={mood} className="rounded-full bg-panel px-2 py-0.5 text-[11px] text-muted">
                      {mood}
                    </span>
                  ))}
                  {preset.image_style_preset && (
                    <span className="rounded-full bg-panel px-2 py-0.5 text-[11px] text-blue-400">
                      画像:{preset.image_style_preset}
                    </span>
                  )}
                  {preset.voice_style_preset && (
                    <span className="rounded-full bg-panel px-2 py-0.5 text-[11px] text-purple-400">
                      声:{preset.voice_style_preset}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">紹介</h2>
        <Field label="カバー画像URL" value={bundle.scenario.cover_image_url ?? ""} onChange={(cover_image_url) => updateScenario({ cover_image_url })} placeholder="https://..." />
        {bundle.scenario.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bundle.scenario.cover_image_url}
            alt="カバー画像プレビュー"
            className="h-40 w-full rounded-md border border-white/10 object-cover"
          />
        )}
        <Field label="簡単な紹介" value={bundle.scenario.description} onChange={(description) => updateScenario({ description })} multiline />
        <Field label="ジャンル" value={bundle.scenario.genre} onChange={(genre) => updateScenario({ genre })} />
        <Field label="ハッシュタグ" value={joinTags(bundle.scenario.tags)} onChange={(value) => updateScenario({ tags: splitTags(value) })} />
        <div className="rounded-md border border-white/10 bg-panel2 px-3 py-2.5">
          <p className="text-xs font-medium text-muted">ロアブック名</p>
          <p className="mt-1 text-sm text-ink">{bundle.lorebookLinks.length ? `${bundle.lorebookLinks.length}件連動中` : "未連動"}</p>
        </div>
        <Field label="紹介文" value={bundle.scenario.description} onChange={(description) => updateScenario({ description })} multiline />
        <Field label="注意事項" value={bundle.scenario.content_warnings} onChange={(content_warnings) => updateScenario({ content_warnings })} multiline />
        <Field label="プレイ時間目安" value={bundle.scenario.estimated_play_time} onChange={(estimated_play_time) => updateScenario({ estimated_play_time })} />
        <Field label="推奨トーン" value={bundle.scenario.recommended_tone} onChange={(recommended_tone) => updateScenario({ recommended_tone })} />
        <SelectField
          label="visibility"
          value={bundle.scenario.visibility}
          onChange={(visibility) => updateScenario({ visibility: visibility as "private" | "unlisted" })}
          options={[
            { value: "private", label: "private" },
            { value: "unlisted", label: "unlisted" }
          ]}
        />
      </section>
    </div>
  );
}
