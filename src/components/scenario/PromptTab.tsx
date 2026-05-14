"use client";

import { ImagePlus, Plus, Trash2, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState, useMemo } from "react";
import { CHARACTER_COLORS } from "@/lib/domain/constants";
import type { CharacterControl, ScenarioCharacter, StoryBundle, VrmExpression, VrmMotion } from "@/lib/domain/types";
import { newId, nowIso } from "@/lib/utils";
import { uploadAvatar } from "@/lib/supabase/storage";
import { Avatar } from "@/components/ui/Avatar";
import { Field, ToggleRow } from "./formControls";

const VrmViewerDynamic = dynamic(
  () => import("@/components/vrm/VrmViewer").then((m) => ({ default: m.VrmViewer })),
  { ssr: false }
);

export function PromptTab({ bundle, onChange }: { bundle: StoryBundle; onChange: (bundle: StoryBundle) => void }) {
  const profile = bundle.userProfiles[0];

  const updateScenario = (patch: Partial<typeof bundle.scenario>) => {
    onChange({ ...bundle, scenario: { ...bundle.scenario, ...patch } });
  };

  const updateCharacter = (id: string, patch: Partial<ScenarioCharacter>) => {
    onChange({
      ...bundle,
      characters: bundle.characters.map((character) => (character.id === id ? { ...character, ...patch } : character))
    });
  };

  const addCharacter = () => {
    if (bundle.characters.length >= 10) return;
    const now = nowIso();
    const id = newId("char");
    onChange({
      ...bundle,
      characters: [
        ...bundle.characters,
        {
          id,
          scenario_id: bundle.scenario.id,
          name: `キャラ${bundle.characters.length + 1}`,
          avatar_url: null,
          avatar_storage_path: null,
          display_color: CHARACTER_COLORS[bundle.characters.length % CHARACTER_COLORS.length],
          appearance: "",
          personality: "",
          speaking_style: "",
          first_person: "",
          user_call_name: "",
          role: "",
          background: "",
          likes: "",
          dislikes: "",
          secrets: "",
          sample_dialogues: "",
          sort_order: bundle.characters.length,
          created_at: now,
          updated_at: now
        }
      ]
    });
  };

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">基本設定</h2>
        <Field label="題名" value={bundle.scenario.title} onChange={(title) => updateScenario({ title })} />
        <Field label="説明" value={bundle.scenario.description} onChange={(description) => updateScenario({ description })} multiline />
        <Field label="世界観" value={bundle.scenario.world_setting} onChange={(world_setting) => updateScenario({ world_setting })} multiline />
        <Field label="状況" value={bundle.scenario.situation} onChange={(situation) => updateScenario({ situation })} multiline />
        <Field label="関係性" value={bundle.scenario.relationship_setup} onChange={(relationship_setup) => updateScenario({ relationship_setup })} multiline />
        <Field label="物語の目的" value={bundle.scenario.objective} onChange={(objective) => updateScenario({ objective })} multiline />
        <Field
          label="禁止事項 / 避けたい展開"
          value={bundle.scenario.forbidden_content}
          onChange={(forbidden_content) => updateScenario({ forbidden_content })}
          multiline
        />
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">キャラクター {bundle.characters.length}/10</h2>
          <button
            type="button"
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-canvas disabled:opacity-40"
            onClick={addCharacter}
            disabled={bundle.characters.length >= 10}
          >
            <Plus className="h-4 w-4" aria-hidden />
            追加
          </button>
        </div>

        {bundle.characters.map((character, index) => (
          <details key={character.id} open={index === 0} className="rounded-md border border-white/10 bg-panel2 p-3">
            <summary className="cursor-pointer list-none text-sm font-semibold">{character.name || "未命名キャラ"}</summary>
            <div className="mt-3 grid gap-3">
              <AvatarUploader
                name={character.name}
                src={character.avatar_url}
                color={character.display_color}
                target={{ kind: "characters", id: character.id }}
                onUploaded={(avatar_url, avatar_storage_path) => updateCharacter(character.id, { avatar_url, avatar_storage_path })}
                onClear={() => updateCharacter(character.id, { avatar_url: null, avatar_storage_path: null })}
              />
              <Field label="名前" value={character.name} onChange={(name) => updateCharacter(character.id, { name })} />
              <Field label="画像URL" value={character.avatar_url ?? ""} onChange={(avatar_url) => updateCharacter(character.id, { avatar_url })} />
              <Field label="外見" value={character.appearance} onChange={(appearance) => updateCharacter(character.id, { appearance })} multiline />
              <Field label="性格" value={character.personality} onChange={(personality) => updateCharacter(character.id, { personality })} multiline />
              <Field label="口調" value={character.speaking_style} onChange={(speaking_style) => updateCharacter(character.id, { speaking_style })} multiline />
              <div className="grid grid-cols-2 gap-3">
                <Field label="一人称" value={character.first_person} onChange={(first_person) => updateCharacter(character.id, { first_person })} />
                <Field label="ユーザーへの呼び方" value={character.user_call_name} onChange={(user_call_name) => updateCharacter(character.id, { user_call_name })} />
              </div>
              <Field label="役割" value={character.role} onChange={(role) => updateCharacter(character.id, { role })} />
              <Field label="背景" value={character.background} onChange={(background) => updateCharacter(character.id, { background })} multiline />
              <div className="grid grid-cols-2 gap-3">
                <Field label="好きなもの" value={character.likes} onChange={(likes) => updateCharacter(character.id, { likes })} />
                <Field label="苦手なもの" value={character.dislikes} onChange={(dislikes) => updateCharacter(character.id, { dislikes })} />
              </div>
              <Field label="秘密 / 伏線" value={character.secrets} onChange={(secrets) => updateCharacter(character.id, { secrets })} multiline />
              <Field label="サンプル台詞" value={character.sample_dialogues} onChange={(sample_dialogues) => updateCharacter(character.id, { sample_dialogues })} multiline />

              <details className="rounded-md border border-white/10 bg-panel p-3">
                <summary className="cursor-pointer list-none text-xs font-semibold text-muted">音声設定</summary>
                <div className="mt-3 grid gap-3">
                  <ToggleRow
                    label="音声読み上げを有効"
                    checked={character.voice_enabled ?? true}
                    onChange={(v) => updateCharacter(character.id, { voice_enabled: v })}
                  />
                  <ToggleRow
                    label="自動再生"
                    checked={character.auto_play_voice ?? false}
                    onChange={(v) => updateCharacter(character.id, { auto_play_voice: v })}
                  />
                  <Field label="プロバイダー" value={character.voice_provider ?? ""} onChange={(v) => updateCharacter(character.id, { voice_provider: v })} placeholder="mock / elevenlabs" />
                  <Field label="Voice ID" value={character.voice_id ?? ""} onChange={(v) => updateCharacter(character.id, { voice_id: v })} placeholder="例: 21m00Tcm4TlvDq8ikWAM" />
                  <Field label="モデル" value={character.voice_model ?? ""} onChange={(v) => updateCharacter(character.id, { voice_model: v })} placeholder="例: eleven_flash_v2_5" />
                  <Field label="スタイル" value={character.voice_style ?? ""} onChange={(v) => updateCharacter(character.id, { voice_style: v })} placeholder="例: cheerful / sad" />
                  <Field label="感情プリセット" value={character.voice_emotion ?? ""} onChange={(v) => updateCharacter(character.id, { voice_emotion: v })} placeholder="例: happy / serious" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="速度 (0.5〜2.0)" value={character.voice_speed?.toString() ?? "1.0"} onChange={(v) => updateCharacter(character.id, { voice_speed: parseFloat(v) || 1.0 })} />
                    <Field label="ピッチ (0.5〜2.0)" value={character.voice_pitch?.toString() ?? "1.0"} onChange={(v) => updateCharacter(character.id, { voice_pitch: parseFloat(v) || 1.0 })} />
                  </div>
                </div>
              </details>

              <details className="rounded-md border border-white/10 bg-panel p-3">
                <summary className="cursor-pointer list-none text-xs font-semibold text-muted">3Dモデル (VRM)</summary>
                <div className="mt-3 grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <label className="text-xs text-muted">モデルタイプ</label>
                      <select
                        className="min-h-10 rounded-md border border-white/10 bg-panel2 px-3 text-sm text-ink"
                        value={character.model_type ?? "none"}
                        onChange={(e) => updateCharacter(character.id, { model_type: e.target.value === "none" ? undefined : "vrm" })}
                      >
                        <option value="none">なし</option>
                        <option value="vrm">VRM</option>
                        <option value="glb" disabled>GLB (準備中)</option>
                      </select>
                      {character.model_type === "glb" && (
                        <p className="text-[11px] leading-4 text-accent">
                          現在のビューアはVRMメタデータ必須です。GLBはVRMへ変換してから使用してください。
                        </p>
                      )}
                    </div>
                    <Field
                      label="スケール"
                      value={character.vrm_scale?.toString() ?? "1.0"}
                      onChange={(v) => updateCharacter(character.id, { vrm_scale: parseFloat(v) || 1.0 })}
                    />
                  </div>
                  <Field
                    label="モデルURL"
                    value={character.model_url ?? ""}
                    onChange={(v) => updateCharacter(character.id, { model_url: v || undefined })}
                    placeholder="https://... または /models/char.vrm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label="デフォルト表情"
                      value={character.default_expression ?? "neutral"}
                      onChange={(v) => updateCharacter(character.id, { default_expression: v as VrmExpression })}
                      placeholder="neutral / smile / sad ..."
                    />
                    <Field
                      label="デフォルトモーション"
                      value={character.default_motion ?? "idle"}
                      onChange={(v) => updateCharacter(character.id, { default_motion: v as VrmMotion })}
                      placeholder="idle / nod / shake_head ..."
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <ToggleRow
                      label="視線追従"
                      checked={character.look_at_user_enabled ?? true}
                      onChange={(v) => updateCharacter(character.id, { look_at_user_enabled: v })}
                    />
                    <ToggleRow
                      label="まばたき"
                      checked={character.blink_enabled ?? true}
                      onChange={(v) => updateCharacter(character.id, { blink_enabled: v })}
                    />
                    <ToggleRow
                      label="呼吸モーション"
                      checked={character.idle_motion_enabled ?? true}
                      onChange={(v) => updateCharacter(character.id, { idle_motion_enabled: v })}
                    />
                  </div>
                  <Field
                    label="ライセンスメモ"
                    value={character.license_note ?? ""}
                    onChange={(v) => updateCharacter(character.id, { license_note: v || undefined })}
                    multiline
                    placeholder="使用条件・配布元URLなど"
                  />
                  {character.model_type === "vrm" && character.model_url && (
                    <VrmCharacterPreview character={character} />
                  )}
                </div>
              </details>

              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 text-sm text-danger disabled:opacity-30"
                disabled={bundle.characters.length <= 1}
                onClick={() => onChange({ ...bundle, characters: bundle.characters.filter((item) => item.id !== character.id) })}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                削除
              </button>
            </div>
          </details>
        ))}
      </section>

      {profile && (
        <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
          <h2 className="text-sm font-semibold">ユーザートークプロフィール</h2>
          <AvatarUploader
            name={profile.display_name}
            src={profile.avatar_url}
            color="#86a8ff"
            target={{ kind: "user-profiles", id: profile.id }}
            onUploaded={(avatar_url, avatar_storage_path) =>
              onChange({
                ...bundle,
                userProfiles: bundle.userProfiles.map((item) => (item.id === profile.id ? { ...item, avatar_url, avatar_storage_path } : item))
              })
            }
            onClear={() =>
              onChange({
                ...bundle,
                userProfiles: bundle.userProfiles.map((item) =>
                  item.id === profile.id ? { ...item, avatar_url: null, avatar_storage_path: null } : item
                )
              })
            }
          />
          <Field label="表示名" value={profile.display_name} onChange={(display_name) => updateProfile(bundle, onChange, { display_name })} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="一人称" value={profile.first_person} onChange={(first_person) => updateProfile(bundle, onChange, { first_person })} />
            <Field label="話し方" value={profile.speaking_style} onChange={(speaking_style) => updateProfile(bundle, onChange, { speaking_style })} />
          </div>
          <Field label="性格" value={profile.personality} onChange={(personality) => updateProfile(bundle, onChange, { personality })} multiline />
          <Field label="立場" value={profile.role} onChange={(role) => updateProfile(bundle, onChange, { role })} />
          <Field label="背景" value={profile.background} onChange={(background) => updateProfile(bundle, onChange, { background })} multiline />
          <Field
            label="キャラクターとの関係"
            value={profile.relationship_to_characters}
            onChange={(relationship_to_characters) => updateProfile(bundle, onChange, { relationship_to_characters })}
            multiline
          />
          <Field
            label="ロールプレイ方針"
            value={profile.roleplay_policy}
            onChange={(roleplay_policy) => updateProfile(bundle, onChange, { roleplay_policy })}
            multiline
          />
        </section>
      )}
    </div>
  );
}

function updateProfile(bundle: StoryBundle, onChange: (bundle: StoryBundle) => void, patch: Record<string, string>) {
  const profile = bundle.userProfiles[0];
  if (!profile) return;
  onChange({
    ...bundle,
    userProfiles: bundle.userProfiles.map((item) => (item.id === profile.id ? { ...item, ...patch } : item))
  });
}

const TEST_EXPRESSIONS: VrmExpression[] = ["neutral", "smile", "blush", "annoyed"];

function VrmCharacterPreview({ character }: { character: ScenarioCharacter }) {
  const [previewExpression, setPreviewExpression] = useState<VrmExpression>("neutral");
  const [loadTimeMs, setLoadTimeMs] = useState<number | null>(null);

  const ctrl = useMemo<CharacterControl>(() => ({
    targetCharacter: character.name,
    expression: previewExpression,
    motion: "idle",
    gaze: "look_at_user",
    cameraDistance: "medium",
    position: "center",
    intensity: 1.0
  }), [character.name, previewExpression]);

  return (
    <div className="grid gap-2">
      <div className="relative h-56 overflow-hidden rounded-md bg-black/30">
        <VrmViewerDynamic
          character={character}
          characterControl={ctrl}
          quality="low"
          fpsLimit={30}
          shadowEnabled={false}
          physicsEnabled={false}
          className="absolute inset-0"
          onModelLoaded={setLoadTimeMs}
        />
        {loadTimeMs !== null && (
          <span className="absolute bottom-1 left-2 text-[10px] text-white/40 pointer-events-none">
            読み込み {loadTimeMs}ms
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {TEST_EXPRESSIONS.map((expr) => (
          <button
            key={expr}
            type="button"
            onClick={() => setPreviewExpression(expr)}
            className={`min-h-8 flex-1 rounded-md text-xs font-semibold transition-colors ${
              previewExpression === expr ? "bg-brand text-canvas" : "bg-panel2 text-muted hover:text-ink"
            }`}
          >
            {expr}
          </button>
        ))}
      </div>
    </div>
  );
}

function AvatarUploader({
  name,
  src,
  color,
  target,
  onUploaded,
  onClear
}: {
  name: string;
  src?: string | null;
  color: string;
  target: { kind: "characters" | "user-profiles"; id: string };
  onUploaded: (url: string, storagePath: string | null) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-white/10 bg-canvas/40 p-3">
      <Avatar name={name} src={src} color={color} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-xs text-muted">jpg / png / webp、5MBまで。丸型プレビューで表示します。</p>
        <div className="flex gap-2">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-canvas">
            <ImagePlus className="h-4 w-4" aria-hidden />
            選択
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const result = await uploadAvatar(file, target);
                onUploaded(result.avatar_url, result.avatar_storage_path);
              }}
            />
          </label>
          <button type="button" className="grid min-h-10 min-w-10 place-items-center rounded-md bg-panel2 text-muted" onClick={onClear} aria-label="削除">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
