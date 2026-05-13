"use client";

import { RotateCcw } from "lucide-react";
import { BottomNav } from "@/components/ui/BottomNav";
import { useAppStore } from "@/lib/store/AppStore";
import { ToggleRow, Field, SelectField } from "@/components/scenario/formControls";
import { SupabaseAuthPanel } from "./SupabaseAuthPanel";
import { IMAGE_QUALITY_PRESETS, MODEL_PRESETS, type ModelPresetKey } from "@/lib/domain/constants";

export function AppSettingsScreen() {
  const { state, updateSettings, resetLocalState, resetChoicePreferences } = useAppStore();
  const { usageLogs, settings } = state;

  const conversationCost = usageLogs.filter((log) => log.kind === "conversation").reduce((sum, log) => sum + log.estimated_cost_jpy, 0);
  const imageCost = usageLogs.filter((log) => log.kind === "image").reduce((sum, log) => sum + log.estimated_cost_jpy, 0);
  const voiceCost = usageLogs.filter((log) => log.kind === "voice").reduce((sum, log) => sum + log.estimated_cost_jpy, 0);
  const total = conversationCost + imageCost + voiceCost;
  const remaining = Math.max(0, settings.monthly_budget_jpy - total);
  const budgetUsedPct = settings.monthly_budget_jpy > 0 ? Math.min(100, (total / settings.monthly_budget_jpy) * 100) : 0;

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1);
  const dailyImageCount = usageLogs
    .filter((log) => { if (log.kind !== "image") return false; const t = new Date(log.created_at).getTime(); return t >= todayStart.getTime() && t < tomorrow.getTime(); })
    .reduce((sum, log) => sum + log.image_count, 0);
  const monthlyImageCount = usageLogs.filter((log) => log.kind === "image").reduce((sum, log) => sum + log.image_count, 0);

  const modelCosts = Object.entries(
    usageLogs.reduce<Record<string, number>>((acc, log) => {
      const key = log.model ?? log.backend;
      acc[key] = (acc[key] ?? 0) + log.estimated_cost_jpy;
      return acc;
    }, {})
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4);

  const activeImagePreset = IMAGE_QUALITY_PRESETS.find(
    (p) => p.quality === settings.image_quality && p.size === settings.image_size
  )?.key ?? null;

  return (
    <main className="app-viewport min-h-dvh bg-canvas pb-24 text-ink">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-canvas/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <h1 className="text-lg font-semibold">設定</h1>
          <p className="text-xs text-muted">運用コスト、NSFW、PWA動作を管理します。</p>
        </div>
      </header>

      <section className="mx-auto grid max-w-md gap-4 px-4 py-4">
        <SupabaseAuthPanel />

        {/* ─── コストダッシュボード ─── */}
        <div className={`rounded-md border p-4 ${remaining <= 300 ? "border-danger/30 bg-danger/10" : "border-white/10 bg-panel"}`}>
          <h2 className="mb-3 text-sm font-semibold">コストダッシュボード</h2>
          <div className="grid grid-cols-2 gap-2">
            <CostTile label="会話" value={conversationCost} />
            <CostTile label="画像" value={imageCost} />
            {voiceCost > 0 && <CostTile label="音声" value={voiceCost} />}
            <CostTile label="合計" value={total} />
            <CostTile label="残額" value={remaining} highlight={remaining <= 300} />
          </div>

          {/* 月額進捗バー */}
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] text-muted">
              <span>月額使用率</span>
              <span>{budgetUsedPct.toFixed(0)}% / {settings.monthly_budget_jpy.toLocaleString()}円</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-panel2">
              <div
                className={`h-full rounded-full transition-all ${budgetUsedPct >= 90 ? "bg-danger" : budgetUsedPct >= 70 ? "bg-brand" : "bg-brand/60"}`}
                style={{ width: `${budgetUsedPct}%` }}
              />
            </div>
          </div>

          {/* 画像制限進捗 */}
          {settings.image_generation_enabled && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <div className="mb-1 flex justify-between text-muted">
                  <span>本日の画像</span>
                  <span>{dailyImageCount}/{settings.daily_image_limit}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-panel2">
                  <div
                    className={`h-full rounded-full ${dailyImageCount >= settings.daily_image_limit ? "bg-danger" : "bg-brand/60"}`}
                    style={{ width: `${Math.min(100, (dailyImageCount / Math.max(1, settings.daily_image_limit)) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-muted">
                  <span>月間の画像</span>
                  <span>{monthlyImageCount}/{settings.monthly_image_limit}</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-panel2">
                  <div
                    className={`h-full rounded-full ${monthlyImageCount >= settings.monthly_image_limit ? "bg-danger" : "bg-brand/60"}`}
                    style={{ width: `${Math.min(100, (monthlyImageCount / Math.max(1, settings.monthly_image_limit)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* モデル別コスト内訳 */}
          {modelCosts.length > 0 && (
            <div className="mt-3">
              <p className="mb-2 text-[11px] font-semibold text-muted">モデル別コスト</p>
              <div className="grid gap-1">
                {modelCosts.map(([model, cost]) => (
                  <div key={model} className="flex items-center gap-2 text-[11px]">
                    <span className="min-w-0 flex-1 truncate text-muted">{model}</span>
                    <span className="shrink-0 font-semibold">{cost.toFixed(1)}円</span>
                    <div className="h-1 w-16 shrink-0 overflow-hidden rounded-full bg-panel2">
                      <div className="h-full rounded-full bg-brand/60" style={{ width: `${total > 0 ? (cost / total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {remaining <= 300 && <p className="mt-3 text-sm text-danger">月上限が近づいています。低コストモードと画像生成制限を確認してください。</p>}
        </div>

        {/* ─── 予算 ─── */}
        <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
          <h2 className="text-sm font-semibold">予算</h2>
          <Field label="月額コスト上限 (円)" type="number" value={state.settings.monthly_budget_jpy} onChange={(value) => updateSettings({ monthly_budget_jpy: Number(value) || 0 })} />
          <Field label="画像枚数上限/日" type="number" value={state.settings.daily_image_limit} onChange={(value) => updateSettings({ daily_image_limit: Number(value) || 0 })} />
          <Field label="画像枚数上限/月" type="number" value={state.settings.monthly_image_limit} onChange={(value) => updateSettings({ monthly_image_limit: Number(value) || 0 })} />
          <ToggleRow label="低コストモード" checked={state.settings.low_cost_mode} onChange={(low_cost_mode) => updateSettings({ low_cost_mode })} />
          <ToggleRow label="予算不足時に自動で低コスト化" checked={state.settings.auto_switch_when_budget_low} onChange={(auto_switch_when_budget_low) => updateSettings({ auto_switch_when_budget_low })} />
        </section>

        {/* ─── Story Director ─── */}
        <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
          <h2 className="text-sm font-semibold">Story Director</h2>
          <ToggleRow
            label="Story Director Debug"
            checked={state.settings.story_director_debug_enabled}
            onChange={(story_director_debug_enabled) => updateSettings({ story_director_debug_enabled })}
          />
        </section>

        {/* ─── 体験モード ─── */}
        <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
          <h2 className="text-sm font-semibold">体験モード</h2>
          <p className="text-xs text-muted">AI彼女モード: 関係性重視の軽量Story Director。物語モード: 章立て・伏線・フルStory Director。</p>
          <div className="flex gap-2">
            {([["girlfriend", "AI彼女モード"], ["story", "物語モード"]] as const).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => updateSettings({ experience_mode: mode })}
                className={`min-h-11 flex-1 rounded-md text-sm font-semibold transition-colors ${
                  settings.experience_mode === mode ? "bg-brand text-canvas" : "bg-panel2 text-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* ─── 3Dキャラクター ─── */}
        <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
          <h2 className="text-sm font-semibold">3Dキャラクター (VRM)</h2>
          <ToggleRow label="3Dモデル表示を有効にする" checked={settings.vrm_enabled} onChange={(vrm_enabled) => updateSettings({ vrm_enabled })} />
          {settings.vrm_enabled && (
            <>
              <SelectField
                label="描画品質"
                value={settings.vrm_quality}
                onChange={(value) => updateSettings({ vrm_quality: value as "high" | "low" })}
                options={[
                  { value: "high", label: "高品質 (iPhone 15 Pro推奨)" },
                  { value: "low", label: "低品質 (省電力)" }
                ]}
              />
              <SelectField
                label="FPS上限"
                value={String(settings.vrm_fps_limit)}
                onChange={(value) => updateSettings({ vrm_fps_limit: Number(value) })}
                options={[
                  { value: "60", label: "60fps" },
                  { value: "30", label: "30fps (推奨)" },
                  { value: "24", label: "24fps" },
                  { value: "15", label: "15fps (省電力)" }
                ]}
              />
              <ToggleRow label="シャドウを有効にする" checked={settings.vrm_shadow_enabled} onChange={(vrm_shadow_enabled) => updateSettings({ vrm_shadow_enabled })} />
              <ToggleRow label="物理演算 (揺れ物)" checked={settings.vrm_physics_enabled} onChange={(vrm_physics_enabled) => updateSettings({ vrm_physics_enabled })} />
            </>
          )}
        </section>

        {/* ─── 選択傾向学習 ─── */}
        <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
          <h2 className="text-sm font-semibold">選択傾向学習</h2>
          <p className="text-xs text-muted">選んだ選択肢の傾向を学習し、次回の選択肢生成に反映します。</p>
          <ToggleRow
            label="選択傾向学習を有効にする"
            checked={settings.choice_learning_enabled ?? true}
            onChange={(v) => updateSettings({ choice_learning_enabled: v })}
          />
          {(settings.choice_learning_enabled ?? true) && (
            <>
              <div>
                <div className="mb-1 text-xs text-muted">好み反映度</div>
                <div className="flex gap-2">
                  {(["low", "normal", "high"] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => updateSettings({ preference_strength: v })}
                      className={`min-h-9 flex-1 rounded-md text-xs font-semibold transition-colors ${
                        (settings.preference_strength ?? "normal") === v ? "bg-brand text-canvas" : "bg-panel2 text-muted"
                      }`}
                    >
                      {v === "low" ? "控えめ" : v === "normal" ? "標準" : "強め"}
                    </button>
                  ))}
                </div>
              </div>
              <ToggleRow
                label="選択肢にデバッグ情報を表示（Debug ON時のみ有効）"
                checked={settings.show_choice_effect_hints ?? false}
                onChange={(v) => updateSettings({ show_choice_effect_hints: v })}
              />
              <div className="text-xs text-muted">
                学習済み: {state.choicePreferences?.sampleCount ?? 0} 件
              </div>
              <button
                type="button"
                onClick={resetChoicePreferences}
                className="min-h-9 rounded-md bg-danger/10 px-3 text-xs text-danger transition-colors hover:bg-danger/20"
              >
                選択傾向データをリセット
              </button>
            </>
          )}
        </section>

        {/* ─── 表示 ─── */}
        <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
          <h2 className="text-sm font-semibold">表示</h2>
          <ToggleRow
            label="リアルタイム表示"
            checked={(state.settings.streaming_display_enabled ?? state.settings.timeline_reveal_enabled) && state.settings.timeline_reveal_enabled}
            onChange={(enabled) => updateSettings({ streaming_display_enabled: enabled, timeline_reveal_enabled: enabled })}
          />
          <ToggleRow
            label="タイプライター表示"
            checked={state.settings.typewriter_enabled ?? true}
            onChange={(typewriter_enabled) => updateSettings({ typewriter_enabled })}
          />
          <SelectField
            label="文字表示速度"
            value={state.settings.typewriter_speed ?? state.settings.timeline_reveal_speed}
            onChange={(value) => updateSettings({
              typewriter_speed: value as typeof state.settings.typewriter_speed,
              timeline_reveal_speed: value as typeof state.settings.timeline_reveal_speed
            })}
            options={[
              { value: "fast", label: "Fast (約12ms / 3文字)" },
              { value: "normal", label: "Normal (約24ms / 2文字)" },
              { value: "slow", label: "Slow (約48ms / 1文字)" },
              { value: "instant", label: "Instant (0ms)" }
            ]}
          />
          <ToggleRow
            label="スキップボタンを表示"
            checked={state.settings.show_skip_button ?? true}
            onChange={(show_skip_button) => updateSettings({ show_skip_button })}
          />
          <ToggleRow
            label="本物のストリーミング（実験中）"
            checked={state.settings.real_streaming_enabled ?? false}
            onChange={(real_streaming_enabled) => updateSettings({ real_streaming_enabled })}
          />
          <ToggleRow
            label="ストリーミング失敗時に通常生成へ戻す"
            checked={state.settings.streaming_fallback_enabled ?? true}
            onChange={(streaming_fallback_enabled) => updateSettings({ streaming_fallback_enabled })}
          />
        </section>

        {/* ─── 音声 ─── */}
        <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
          <h2 className="text-sm font-semibold">音声合成</h2>
          <ToggleRow label="音声合成を有効にする" checked={state.settings.voice_enabled} onChange={(voice_enabled) => updateSettings({ voice_enabled })} />
          <ToggleRow label="自動再生" checked={state.settings.voice_auto_play} onChange={(voice_auto_play) => updateSettings({ voice_auto_play })} />
          <ToggleRow
            label="ナレーション音声を有効"
            checked={state.settings.voice_narration_enabled ?? false}
            onChange={(voice_narration_enabled) => updateSettings({ voice_narration_enabled })}
          />
          <SelectField
            label="音声プロバイダー"
            value={VOICE_PROVIDERS.some((p) => p.value === state.settings.voice_provider) ? state.settings.voice_provider : "mock"}
            onChange={(voice_provider) => updateSettings({ voice_provider })}
            options={VOICE_PROVIDERS}
          />
          <Field
            label="月間音声予算 (円)"
            value={String(state.settings.voice_budget_jpy ?? 1200)}
            onChange={(v) => updateSettings({ voice_budget_jpy: parseInt(v) || 1200 })}
          />
        </section>

        {/* ─── モデル設定 ─── */}
        <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
          <h2 className="text-sm font-semibold">モデル設定</h2>

          {/* プリセット選択 */}
          <ModelPresetSelector
            current={state.settings.model_preset}
            onSelect={(key) => {
              const preset = MODEL_PRESETS[key as ModelPresetKey];
              if (preset) updateSettings(preset.config);
            }}
          />

          {/* 会話モデル */}
          <p className="text-xs font-semibold text-muted mt-1">会話モデル</p>
          <ProviderModelFields
            label="通常会話"
            provider={state.settings.normal_conversation_provider}
            model={state.settings.normal_conversation_model}
            onProvider={(normal_conversation_provider) => updateSettings({ normal_conversation_provider, model_preset: "custom" })}
            onModel={(normal_conversation_model) => updateSettings({ normal_conversation_model, model_preset: "custom" })}
          />
          <ProviderModelFields
            label="高品質会話（重要シーン）"
            provider={state.settings.smart_conversation_provider}
            model={state.settings.smart_conversation_model}
            onProvider={(smart_conversation_provider) => updateSettings({ smart_conversation_provider, model_preset: "custom" })}
            onModel={(smart_conversation_model) => updateSettings({ smart_conversation_model, model_preset: "custom" })}
          />
          <ProviderModelFields
            label="低コスト会話"
            provider={state.settings.cheap_conversation_provider}
            model={state.settings.cheap_conversation_model}
            onProvider={(cheap_conversation_provider) => updateSettings({ cheap_conversation_provider, model_preset: "custom" })}
            onModel={(cheap_conversation_model) => updateSettings({ cheap_conversation_model, model_preset: "custom" })}
          />
          <ProviderModelFields
            label="NSFW会話"
            provider={state.settings.nsfw_conversation_provider}
            model={state.settings.nsfw_conversation_model}
            onProvider={(nsfw_conversation_provider) => updateSettings({ nsfw_conversation_provider, model_preset: "custom" })}
            onModel={(nsfw_conversation_model) => updateSettings({ nsfw_conversation_model, model_preset: "custom" })}
          />
          <ToggleRow label="重要イベントで高品質モデルを使う" checked={state.settings.smart_model_for_major_event} onChange={(smart_model_for_major_event) => updateSettings({ smart_model_for_major_event })} />

          {/* 専用用途モデル */}
          <p className="text-xs font-semibold text-muted mt-1">専用用途モデル</p>
          <ProviderModelFields
            label="Story Director"
            provider={state.settings.director_provider}
            model={state.settings.director_model}
            onProvider={(director_provider) => updateSettings({ director_provider, model_preset: "custom" })}
            onModel={(director_model) => updateSettings({ director_model, model_preset: "custom" })}
          />
          <ProviderModelFields
            label="Smart Reply（返信候補）"
            provider={state.settings.smart_reply_provider}
            model={state.settings.smart_reply_model}
            onProvider={(smart_reply_provider) => updateSettings({ smart_reply_provider, model_preset: "custom" })}
            onModel={(smart_reply_model) => updateSettings({ smart_reply_model, model_preset: "custom" })}
          />
          <ProviderModelFields
            label="サマリー"
            provider={state.settings.summary_provider}
            model={state.settings.summary_model}
            onProvider={(summary_provider) => updateSettings({ summary_provider, model_preset: "custom" })}
            onModel={(summary_model) => updateSettings({ summary_model, model_preset: "custom" })}
          />
          <ProviderModelFields
            label="画像プロンプト生成"
            provider={state.settings.image_prompt_provider}
            model={state.settings.image_prompt_model}
            onProvider={(image_prompt_provider) => updateSettings({ image_prompt_provider, model_preset: "custom" })}
            onModel={(image_prompt_model) => updateSettings({ image_prompt_model, model_preset: "custom" })}
          />
          <ImageProviderFields
            label="通常画像モデル"
            provider={state.settings.standard_image_provider}
            model={state.settings.standard_image_model}
            onProvider={(standard_image_provider) => updateSettings({ standard_image_provider })}
            onModel={(standard_image_model) => updateSettings({ standard_image_model })}
          />
          <ImageProviderFields
            label="NSFW画像モデル"
            provider={state.settings.nsfw_image_provider}
            model={state.settings.nsfw_image_model}
            onProvider={(nsfw_image_provider) => updateSettings({ nsfw_image_provider })}
            onModel={(nsfw_image_model) => updateSettings({ nsfw_image_model })}
          />

          {/* 画像品質プリセット (Step 7) */}
          <div className="grid gap-2 rounded-md border border-white/10 bg-panel2 p-3">
            <p className="text-xs font-semibold text-muted">画像品質プリセット</p>
            <div className="flex gap-2">
              {IMAGE_QUALITY_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => updateSettings({ image_quality: preset.quality, image_size: preset.size })}
                  className={`min-h-10 flex-1 rounded-md text-sm font-semibold transition-colors ${
                    activeImagePreset === preset.key ? "bg-brand text-canvas" : "bg-canvas text-muted hover:text-ink"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <SelectField
                label="画像品質"
                value={state.settings.image_quality}
                onChange={(value) => updateSettings({ image_quality: value as typeof state.settings.image_quality })}
                options={[
                  { value: "draft", label: "下書き" },
                  { value: "standard", label: "標準" },
                  { value: "high", label: "高品質" }
                ]}
              />
              <SelectField
                label="画像サイズ"
                value={state.settings.image_size}
                onChange={(value) => updateSettings({ image_size: value as typeof state.settings.image_size })}
                options={[
                  { value: "square", label: "正方形" },
                  { value: "portrait", label: "縦長" },
                  { value: "landscape", label: "横長" }
                ]}
              />
            </div>
          </div>
        </section>

        {/* ─── NSFW ─── */}
        <section className="grid gap-2 rounded-md border border-white/10 bg-panel p-4">
          <h2 className="text-sm font-semibold">NSFW</h2>
          <ToggleRow label="成人確認済み" checked={state.settings.adult_confirmed} onChange={(adult_confirmed) => updateSettings({ adult_confirmed })} />
          <ToggleRow label="NSFW会話モード" checked={state.settings.nsfw_chat_enabled} onChange={(nsfw_chat_enabled) => updateSettings({ nsfw_chat_enabled })} />
          <ToggleRow label="NSFW画像モード" checked={state.settings.nsfw_image_enabled} onChange={(nsfw_image_enabled) => updateSettings({ nsfw_image_enabled })} />
          <ToggleRow label="NSFW画像をぼかす" checked={state.settings.blur_nsfw_images} onChange={(blur_nsfw_images) => updateSettings({ blur_nsfw_images })} />
          <ToggleRow label="履歴でNSFWを表示" checked={state.settings.show_nsfw_in_history} onChange={(show_nsfw_in_history) => updateSettings({ show_nsfw_in_history })} />
        </section>

        {/* ─── ローカルMVP ─── */}
        <section className="grid gap-2 rounded-md border border-white/10 bg-panel p-4">
          <h2 className="text-sm font-semibold">ローカルMVP</h2>
          <p className="text-sm leading-6 text-muted">Supabase 未設定時はブラウザ内に保存します。検証用データを初期状態に戻せます。</p>
          <button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-danger/30 bg-danger/10 text-sm font-semibold text-danger" onClick={resetLocalState}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            サンプルへリセット
          </button>
        </section>
      </section>
      <BottomNav active="settings" />
    </main>
  );
}

function ModelPresetSelector({
  current,
  onSelect
}: {
  current: string;
  onSelect: (key: string) => void;
}) {
  const keys = Object.keys(MODEL_PRESETS) as ModelPresetKey[];
  return (
    <div className="grid gap-2 rounded-md border border-white/10 bg-panel2 p-3">
      <p className="text-xs font-semibold text-muted">モデルプリセット</p>
      <div className="flex flex-wrap gap-2">
        {keys.map((key) => {
          const preset = MODEL_PRESETS[key];
          const active = current === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "bg-accent text-black"
                  : "border border-white/20 text-muted hover:border-white/40"
              }`}
            >
              {preset.label}
            </button>
          );
        })}
        {current === "custom" && (
          <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-muted">カスタム</span>
        )}
      </div>
      {current !== "custom" && MODEL_PRESETS[current as ModelPresetKey] && (
        <p className="text-[11px] text-muted">{MODEL_PRESETS[current as ModelPresetKey].description}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// プロバイダー・モデル カタログ
// ---------------------------------------------------------------------------

const CONVERSATION_PROVIDERS = [
  { value: "openai",    label: "OpenAI" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "google",    label: "Google (Gemini)" },
  { value: "mock",      label: "Mock (テスト用)" }
] as const;

const CONVERSATION_MODELS: Record<string, Array<{ value: string; label: string }>> = {
  openai: [
    { value: "gpt-4.1-mini", label: "GPT-4.1 mini — 推奨・低コスト" },
    { value: "gpt-4.1",      label: "GPT-4.1 — 高品質" },
    { value: "gpt-4o-mini",  label: "GPT-4o mini" },
    { value: "gpt-4o",       label: "GPT-4o" },
    { value: "o4-mini",      label: "o4-mini — 推論特化" },
    { value: "o3",           label: "o3 — 最高推論" }
  ],
  anthropic: [
    { value: "claude-sonnet-4-5",   label: "Claude Sonnet 4.5 — 推奨" },
    { value: "claude-haiku-3-5",    label: "Claude Haiku 3.5 — 低コスト" },
    { value: "claude-opus-4-5",     label: "Claude Opus 4.5 — 最高品質" },
    { value: "claude-sonnet-3-7",   label: "Claude Sonnet 3.7" }
  ],
  google: [
    { value: "gemini-2.0-flash",    label: "Gemini 2.0 Flash — 推奨・低コスト" },
    { value: "gemini-2.5-pro",      label: "Gemini 2.5 Pro — 高品質" },
    { value: "gemini-1.5-flash",    label: "Gemini 1.5 Flash" },
    { value: "gemini-1.5-pro",      label: "Gemini 1.5 Pro" }
  ],
  mock: [
    { value: "mock-normal", label: "Mock Normal" },
    { value: "mock-nsfw",   label: "Mock NSFW" }
  ]
};

const DEFAULT_CONVERSATION_MODEL: Record<string, string> = {
  openai:    "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-5",
  google:    "gemini-2.0-flash",
  mock:      "mock-normal"
};

const IMAGE_PROVIDERS = [
  { value: "mock",    label: "Mock (SVGプレースホルダー)" },
  { value: "runpod",  label: "Runpod Serverless" },
  { value: "comfyui", label: "ComfyUI (ローカル/ngrok)" }
] as const;

const IMAGE_MODELS: Record<string, Array<{ value: string; label: string }>> = {
  mock: [
    { value: "mock-standard-image",      label: "Mock Standard" },
    { value: "mock-private-nsfw-image",  label: "Mock NSFW" }
  ],
  runpod: [
    { value: "illustriousXL_v01",        label: "IllustriousXL v0.1 — アニメ推奨" },
    { value: "animagine-xl-3.1",         label: "Animagine XL 3.1" },
    { value: "flux1-schnell",            label: "FLUX.1 Schnell — 高速" },
    { value: "flux1-dev",                label: "FLUX.1 Dev — 高品質" },
    { value: "stable-diffusion-xl-base", label: "SDXL Base" }
  ],
  comfyui: [
    { value: "illustriousXL_v01.safetensors",     label: "IllustriousXL v0.1 — アニメ推奨" },
    { value: "animagineXL31.safetensors",          label: "Animagine XL 3.1" },
    { value: "flux1-schnell-fp8.safetensors",      label: "FLUX.1 Schnell fp8" },
    { value: "sd_xl_base_1.0.safetensors",         label: "SDXL Base 1.0" }
  ]
};

const DEFAULT_IMAGE_MODEL: Record<string, string> = {
  mock:    "mock-standard-image",
  runpod:  "illustriousXL_v01",
  comfyui: "illustriousXL_v01.safetensors"
};

const VOICE_PROVIDERS: Array<{ value: string; label: string }> = [
  { value: "mock",       label: "Mock (無音・テスト用)" },
  { value: "elevenlabs", label: "ElevenLabs" }
];

// ---------------------------------------------------------------------------
// 会話モデル選択コンポーネント（Provider + Model プルダウン）
// ---------------------------------------------------------------------------

function ProviderModelFields({
  label,
  provider,
  model,
  onProvider,
  onModel
}: {
  label: string;
  provider: string;
  model: string;
  onProvider: (value: string) => void;
  onModel: (value: string) => void;
}) {
  const knownProvider = CONVERSATION_MODELS[provider] ? provider : "openai";
  const modelOptions = CONVERSATION_MODELS[knownProvider] ?? [];
  // 現在の値がリストにない場合（古い設定値等）は先頭にカスタム項目として追加
  const hasCurrentModel = modelOptions.some((o) => o.value === model);
  const options = hasCurrentModel
    ? modelOptions
    : [{ value: model, label: `${model} (カスタム)` }, ...modelOptions];

  const handleProviderChange = (newProvider: string) => {
    onProvider(newProvider);
    // プロバイダー変更時、現在のモデルが新プロバイダーに存在しない場合はデフォルトに切り替え
    const newModels = CONVERSATION_MODELS[newProvider] ?? [];
    if (!newModels.some((o) => o.value === model)) {
      onModel(DEFAULT_CONVERSATION_MODEL[newProvider] ?? newModels[0]?.value ?? "");
    }
  };

  return (
    <div className="grid gap-2 rounded-md border border-white/10 bg-panel2 p-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <SelectField
          label="Provider"
          value={knownProvider}
          onChange={handleProviderChange}
          options={[...CONVERSATION_PROVIDERS]}
        />
        <SelectField
          label="Model"
          value={model}
          onChange={onModel}
          options={options}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 画像モデル選択コンポーネント
// ---------------------------------------------------------------------------

function ImageProviderFields({
  label,
  provider,
  model,
  onProvider,
  onModel
}: {
  label: string;
  provider: string;
  model: string;
  onProvider: (value: string) => void;
  onModel: (value: string) => void;
}) {
  const knownProvider = IMAGE_MODELS[provider] ? provider : "mock";
  const modelOptions = IMAGE_MODELS[knownProvider] ?? [];
  const hasCurrentModel = modelOptions.some((o) => o.value === model);
  const options = hasCurrentModel
    ? modelOptions
    : [{ value: model, label: `${model} (カスタム)` }, ...modelOptions];

  const handleProviderChange = (newProvider: string) => {
    onProvider(newProvider);
    const newModels = IMAGE_MODELS[newProvider] ?? [];
    if (!newModels.some((o) => o.value === model)) {
      onModel(DEFAULT_IMAGE_MODEL[newProvider] ?? newModels[0]?.value ?? "");
    }
  };

  return (
    <div className="grid gap-2 rounded-md border border-white/10 bg-panel2 p-3">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <SelectField
          label="Provider"
          value={knownProvider}
          onChange={handleProviderChange}
          options={[...IMAGE_PROVIDERS]}
        />
        <SelectField
          label="Model"
          value={model}
          onChange={onModel}
          options={options}
        />
      </div>
    </div>
  );
}

function CostTile({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`rounded-md p-3 ${highlight ? "bg-danger/20" : "bg-panel2"}`}>
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${highlight ? "text-danger" : ""}`}>{value.toFixed(0)}円</p>
    </div>
  );
}
