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
    </div>
  );
}
