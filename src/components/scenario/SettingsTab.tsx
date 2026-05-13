"use client";

import { useAppStore } from "@/lib/store/AppStore";
import { Field, SelectField, ToggleRow } from "./formControls";

export function SettingsTab() {
  const { state, updateSettings } = useAppStore();
  const settings = state.settings;

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">会話設定</h2>
        <Field label="通常会話バックエンド" value={settings.normal_conversation_backend} onChange={(normal_conversation_backend) => updateSettings({ normal_conversation_backend })} />
        <Field label="NSFW会話バックエンド" value={settings.nsfw_conversation_backend} onChange={(nsfw_conversation_backend) => updateSettings({ nsfw_conversation_backend })} />
        <Field label="temperature" value={settings.low_cost_mode ? "0.7" : "0.9"} onChange={() => undefined} />
        <Field label="max tokens" value={settings.low_cost_mode ? "900" : "1600"} onChange={() => undefined} />
        <SelectField
          label="選択肢タップ時"
          value={settings.choice_send_behavior}
          onChange={(value) => updateSettings({ choice_send_behavior: value as typeof settings.choice_send_behavior })}
          options={[
            { value: "send_immediately", label: "タップで即送信" },
            { value: "insert_into_composer", label: "入力欄に挿入" }
          ]}
        />
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">画像設定</h2>
        <Field label="通常画像バックエンド" value={settings.standard_image_backend} onChange={(standard_image_backend) => updateSettings({ standard_image_backend })} />
        <Field label="NSFW画像バックエンド" value={settings.nsfw_image_backend} onChange={(nsfw_image_backend) => updateSettings({ nsfw_image_backend })} />
        <ToggleRow label="画像生成ON/OFF" checked={settings.image_generation_enabled} onChange={(image_generation_enabled) => updateSettings({ image_generation_enabled })} />
        <ToggleRow label="重要イベント時に画像候補を出す" checked={settings.suggest_images_on_major_events} onChange={(suggest_images_on_major_events) => updateSettings({ suggest_images_on_major_events })} />
        <ToggleRow label="手動画像生成を許可" checked={settings.allow_manual_image_generation} onChange={(allow_manual_image_generation) => updateSettings({ allow_manual_image_generation })} />
        <SelectField
          label="画像生成品質"
          value={settings.image_quality}
          onChange={(value) => updateSettings({ image_quality: value as typeof settings.image_quality })}
          options={[
            { value: "draft", label: "draft" },
            { value: "standard", label: "standard" },
            { value: "high", label: "high" }
          ]}
        />
        <SelectField
          label="画像サイズ"
          value={settings.image_size}
          onChange={(value) => updateSettings({ image_size: value as typeof settings.image_size })}
          options={[
            { value: "square", label: "square" },
            { value: "portrait", label: "portrait" },
            { value: "landscape", label: "landscape" }
          ]}
        />
        <Field label="1日あたりの画像生成上限" type="number" value={settings.daily_image_limit} onChange={(value) => updateSettings({ daily_image_limit: Number(value) || 0 })} />
        <Field label="月あたりの画像生成上限" type="number" value={settings.monthly_image_limit} onChange={(value) => updateSettings({ monthly_image_limit: Number(value) || 0 })} />
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">コスト設定</h2>
        <Field label="月額コスト上限" type="number" value={settings.monthly_budget_jpy} onChange={(value) => updateSettings({ monthly_budget_jpy: Number(value) || 0 })} />
        <Field label="会話予算上限" type="number" value={settings.conversation_budget_jpy} onChange={(value) => updateSettings({ conversation_budget_jpy: Number(value) || 0 })} />
        <Field label="画像予算上限" type="number" value={settings.image_budget_jpy} onChange={(value) => updateSettings({ image_budget_jpy: Number(value) || 0 })} />
        <ToggleRow label="低コストモード" checked={settings.low_cost_mode} onChange={(low_cost_mode) => updateSettings({ low_cost_mode })} />
      </section>

      <section className="grid gap-2 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">NSFW設定</h2>
        <ToggleRow label="成人確認フラグ" checked={settings.adult_confirmed} onChange={(adult_confirmed) => updateSettings({ adult_confirmed })} />
        <ToggleRow label="NSFW会話モード" checked={settings.nsfw_chat_enabled} onChange={(nsfw_chat_enabled) => updateSettings({ nsfw_chat_enabled })} />
        <ToggleRow label="NSFW画像モード" checked={settings.nsfw_image_enabled} onChange={(nsfw_image_enabled) => updateSettings({ nsfw_image_enabled })} />
        <ToggleRow label="NSFW画像を初期ぼかし表示" checked={settings.blur_nsfw_images} onChange={(blur_nsfw_images) => updateSettings({ blur_nsfw_images })} />
        <ToggleRow label="sensitive/explicit メモリを通常画面で隠す" checked={settings.hide_sensitive_memories} onChange={(hide_sensitive_memories) => updateSettings({ hide_sensitive_memories })} />
        <ToggleRow label="起動時確認ダイアログ" checked={settings.startup_age_gate} onChange={(startup_age_gate) => updateSettings({ startup_age_gate })} />
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">3D表示設定</h2>
        <ToggleRow label="VRM/3D表示を有効化" checked={settings.vrm_enabled} onChange={(vrm_enabled) => updateSettings({ vrm_enabled })} />
        <SelectField
          label="VRM品質"
          value={settings.vrm_quality}
          onChange={(value) => updateSettings({ vrm_quality: value as typeof settings.vrm_quality })}
          options={[
            { value: "high", label: "高品質" },
            { value: "low", label: "軽量" }
          ]}
        />
        <Field label="FPS上限" type="number" value={settings.vrm_fps_limit} onChange={(value) => updateSettings({ vrm_fps_limit: Number(value) || 30 })} />
        <ToggleRow label="影を表示" checked={settings.vrm_shadow_enabled} onChange={(vrm_shadow_enabled) => updateSettings({ vrm_shadow_enabled })} />
        <ToggleRow label="物理揺れを有効化" checked={settings.vrm_physics_enabled} onChange={(vrm_physics_enabled) => updateSettings({ vrm_physics_enabled })} />
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">Smart Reply / 選択傾向学習</h2>
        <Field label="Smart Reply Provider" value={settings.smart_reply_provider} onChange={(smart_reply_provider) => updateSettings({ smart_reply_provider })} />
        <Field label="Smart Reply Model" value={settings.smart_reply_model} onChange={(smart_reply_model) => updateSettings({ smart_reply_model })} />
        <ToggleRow label="選択傾向学習を有効化" checked={settings.choice_learning_enabled} onChange={(choice_learning_enabled) => updateSettings({ choice_learning_enabled })} />
        <ToggleRow label="選択肢の効果ヒントを表示" checked={settings.show_choice_effect_hints} onChange={(show_choice_effect_hints) => updateSettings({ show_choice_effect_hints })} />
        <SelectField
          label="学習反映の強さ"
          value={settings.preference_strength}
          onChange={(value) => updateSettings({ preference_strength: value as typeof settings.preference_strength })}
          options={[
            { value: "low", label: "控えめ" },
            { value: "normal", label: "標準" },
            { value: "high", label: "強め" }
          ]}
        />
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">保存/エクスポート設定</h2>
        <ToggleRow label="Story Directorデバッグを表示" checked={settings.story_director_debug_enabled} onChange={(story_director_debug_enabled) => updateSettings({ story_director_debug_enabled })} />
        <ToggleRow label="タイムライン疑似ストリーミング" checked={settings.timeline_reveal_enabled} onChange={(timeline_reveal_enabled) => updateSettings({ timeline_reveal_enabled })} />
        <SelectField
          label="表示速度"
          value={settings.timeline_reveal_speed}
          onChange={(value) => updateSettings({ timeline_reveal_speed: value as typeof settings.timeline_reveal_speed })}
          options={[
            { value: "instant", label: "即時" },
            { value: "fast", label: "速い" },
            { value: "normal", label: "標準" },
            { value: "slow", label: "遅い" }
          ]}
        />
        <p className="rounded-md bg-panel2 px-3 py-2 text-xs leading-5 text-muted">
          現在の保存はローカル状態とSupabase同期に対応しています。ファイルエクスポートは今後の拡張枠です。
        </p>
      </section>
    </div>
  );
}
