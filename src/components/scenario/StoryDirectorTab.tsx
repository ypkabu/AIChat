"use client";

import { Plus, Trash2 } from "lucide-react";
import type { StoryBundle, StoryScene } from "@/lib/domain/types";
import { newId, nowIso } from "@/lib/utils";
import { Field, SelectField } from "./formControls";

export function StoryDirectorTab({ bundle, onChange }: { bundle: StoryBundle; onChange: (bundle: StoryBundle) => void }) {
  const addScene = () => {
    const now = nowIso();
    const scene: StoryScene = {
      id: newId("scene"),
      scenario_id: bundle.scenario.id,
      scene_key: `scene_${bundle.storyScenes.length + 1}`,
      title: "新しいシーン",
      objective: "",
      conflict: "",
      hook: "",
      target_turns: 4,
      max_turns: 7,
      beats: ["場面導入", "違和感を提示", "ユーザーの反応を受ける", "小さな展開を入れる", "次シーンへのフックを出す"],
      next_scene_key: null,
      created_at: now,
      updated_at: now
    };
    onChange({ ...bundle, storyScenes: [...bundle.storyScenes, scene] });
  };

  const updateScene = (id: string, patch: Partial<StoryScene>) => {
    onChange({
      ...bundle,
      storyScenes: bundle.storyScenes.map((scene) => (scene.id === id ? { ...scene, ...patch } : scene))
    });
  };

  const sceneOptions = [
    { value: "", label: "なし" },
    ...bundle.storyScenes.map((scene) => ({ value: scene.scene_key, label: `${scene.scene_key} / ${scene.title}` }))
  ];

  return (
    <div className="grid gap-4">
      <section className="rounded-md border border-white/10 bg-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Story Director</h2>
            <p className="mt-1 text-xs leading-5 text-muted">シーン目的、ビート、葛藤、フックで会話の停滞を抑えます。</p>
          </div>
          <button type="button" onClick={addScene} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-canvas">
            <Plus className="h-4 w-4" aria-hidden />
            追加
          </button>
        </div>

        <div className="grid gap-3">
          {bundle.storyScenes.map((scene) => (
            <details key={scene.id} open className="rounded-md border border-white/10 bg-panel2 p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold">{scene.title || scene.scene_key}</summary>
              <div className="mt-3 grid gap-3">
                <Field label="scene_key" value={scene.scene_key} onChange={(scene_key) => updateScene(scene.id, { scene_key })} />
                <Field label="タイトル" value={scene.title} onChange={(title) => updateScene(scene.id, { title })} />
                <Field label="シーン目的" value={scene.objective} onChange={(objective) => updateScene(scene.id, { objective })} multiline />
                <Field label="ビート一覧" value={scene.beats.join("\n")} onChange={(value) => updateScene(scene.id, { beats: toLines(value) })} multiline />
                <Field label="葛藤" value={scene.conflict} onChange={(conflict) => updateScene(scene.id, { conflict })} multiline />
                <Field label="フック" value={scene.hook} onChange={(hook) => updateScene(scene.id, { hook })} multiline />
                <div className="grid grid-cols-2 gap-3">
                  <Field
                    label="目標ターン数"
                    type="number"
                    value={scene.target_turns}
                    onChange={(value) => {
                      const target_turns = Math.max(1, Number(value) || 1);
                      updateScene(scene.id, { target_turns, max_turns: Math.max(scene.max_turns, target_turns) });
                    }}
                  />
                  <Field
                    label="最大ターン数"
                    type="number"
                    value={scene.max_turns}
                    onChange={(value) => updateScene(scene.id, { max_turns: Math.max(scene.target_turns, Number(value) || scene.target_turns) })}
                  />
                </div>
                <SelectField
                  label="次のシーン"
                  value={scene.next_scene_key ?? ""}
                  options={sceneOptions.filter((option) => option.value !== scene.scene_key)}
                  onChange={(next_scene_key) => updateScene(scene.id, { next_scene_key: next_scene_key || null })}
                />
                <button
                  type="button"
                  onClick={() => onChange({ ...bundle, storyScenes: bundle.storyScenes.filter((item) => item.id !== scene.id) })}
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

function toLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
