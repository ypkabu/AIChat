"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Link2, Plus, Save, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import type { Lorebook, LorebookEntry, LorebookEntryType } from "@/lib/domain/types";
import { newId, nowIso, splitTags } from "@/lib/utils";
import { uploadLorebookCover, AVATAR_MIME_TYPES } from "@/lib/supabase/storage";

const TABS = ["ロア情報", "プロットを連動", "設定"] as const;
type Tab = (typeof TABS)[number];

const ENTRY_TYPE_LABELS: Record<LorebookEntryType, string> = {
  world: "世界観",
  place: "場所",
  organization: "組織",
  character_secret: "キャラの秘密",
  item: "アイテム",
  history: "歴史",
  rule: "ルール",
  foreshadowing: "伏線",
  relationship: "関係性",
  other: "その他"
};

export function LorebookEditor({ lorebookId }: { lorebookId: string }) {
  const router = useRouter();
  const { listLorebooks, saveLorebook, deleteLorebook } = useAppStore();
  const loaded = useMemo(() => listLorebooks().find((lb) => lb.id === lorebookId) ?? null, [listLorebooks, lorebookId]);
  const [lorebook, setLorebook] = useState<Lorebook | null>(loaded);
  const [activeTab, setActiveTab] = useState<Tab>("ロア情報");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLorebook(loaded);
  }, [loaded]);

  if (!lorebook) {
    return (
      <main className="app-viewport grid min-h-dvh place-items-center bg-canvas px-4 text-center text-ink">
        <div>
          <p className="mb-4 text-muted">ロアブックが見つかりません。</p>
          <Link href="/lorebooks" className="rounded-md bg-brand px-4 py-3 font-semibold text-canvas">
            一覧へ戻る
          </Link>
        </div>
      </main>
    );
  }

  const handleSave = () => {
    saveLorebook(lorebook);
    setSaved(true);
    setTimeout(() => setSaved(false), 1400);
  };

  const handleDelete = () => {
    if (!confirm(`「${lorebook.title}」を削除しますか？連動しているシナリオからも解除されます。`)) return;
    deleteLorebook(lorebook.id);
    router.push("/lorebooks");
  };

  return (
    <main className="app-viewport min-h-dvh bg-canvas pb-28 text-ink">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-canvas/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Link href="/lorebooks" className="grid min-h-11 min-w-11 place-items-center rounded-md bg-panel2" aria-label="戻る">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold">{lorebook.title}</h1>
              <p className="text-xs text-muted">{lorebook.entries.length}件のロア</p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className={`grid min-h-11 min-w-11 place-items-center rounded-md text-canvas transition-colors ${saved ? "bg-green-600" : "bg-brand"}`}
              aria-label="保存"
            >
              <Save className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="scrollbar-none flex gap-2 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`min-h-10 shrink-0 rounded-md px-3 text-sm ${
                  activeTab === tab ? "bg-brand text-canvas font-semibold" : "bg-panel2 text-muted"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-4">
        {saved && <div className="mb-3 rounded-md border border-brand/30 bg-brand/12 px-3 py-2 text-sm text-brand">保存しました。</div>}
        {activeTab === "ロア情報" && (
          <div className="grid gap-4">
            <InfoTab lorebook={lorebook} onChange={setLorebook} />
            <EntriesTab lorebook={lorebook} onChange={setLorebook} />
          </div>
        )}
        {activeTab === "プロットを連動" && (
          <LinkedPlotsTab lorebook={lorebook} />
        )}
        {activeTab === "設定" && (
          <SettingsTab lorebook={lorebook} onChange={setLorebook} onDelete={handleDelete} />
        )}
      </div>
    </main>
  );
}

// ---- ロア情報タブ ----
function InfoTab({ lorebook, onChange }: { lorebook: Lorebook; onChange: (lb: Lorebook) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleCoverFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    try {
      const { cover_image_url } = await uploadLorebookCover(file, lorebook.id);
      if (cover_image_url) onChange({ ...lorebook, cover_image_url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "アップロードに失敗しました。");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">基本情報</h2>
        <LbField label="タイトル *" value={lorebook.title} onChange={(title) => onChange({ ...lorebook, title })} />
        <LbField label="説明" value={lorebook.short_description ?? ""} onChange={(short_description) => onChange({ ...lorebook, short_description })} multiline />
      </section>

      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">カバー画像</h2>
        {lorebook.cover_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lorebook.cover_image_url}
            alt="カバー画像"
            className="h-32 w-full rounded-md object-cover"
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={AVATAR_MIME_TYPES.join(",")}
          className="hidden"
          onChange={handleCoverFile}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-white/15 bg-panel2 px-3 text-sm text-muted disabled:opacity-50"
        >
          <Upload className="h-4 w-4" aria-hidden />
          {uploading ? "アップロード中…" : "画像を選択"}
        </button>
        {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
        <p className="text-xs text-muted">jpg / png / webp、5MB以内</p>
      </section>
    </div>
  );
}

// ---- 項目タブ ----
function EntriesTab({ lorebook, onChange }: { lorebook: Lorebook; onChange: (lb: Lorebook) => void }) {
  const { state } = useAppStore();
  const allCharacters = state.characters.map((character) => {
    const scenario = state.scenarios.find((item) => item.id === character.scenario_id);
    return { ...character, scenarioTitle: scenario?.title ?? "未分類" };
  });

  const addEntry = () => {
    const now = nowIso();
    const entry: LorebookEntry = {
      id: newId("lore"),
      scenario_id: "",
      lorebook_id: lorebook.id,
      title: "新しいロア",
      content: "",
      keywords: [],
      importance: 3,
      always_include: false,
      is_hidden: false,
      hidden_truth: "",
      entry_type: "other",
      related_character_ids: [],
      created_at: now,
      updated_at: now
    };
    onChange({ ...lorebook, entries: [...lorebook.entries, entry] });
  };

  const updateEntry = (id: string, patch: Partial<LorebookEntry>) => {
    onChange({
      ...lorebook,
      entries: lorebook.entries.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    });
  };

  const deleteEntry = (id: string) => {
    onChange({ ...lorebook, entries: lorebook.entries.filter((entry) => entry.id !== id) });
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">ロア項目</p>
          <p className="text-xs text-muted">{lorebook.entries.length}件。キーワードに一致したものだけ会話へ使います。</p>
        </div>
        <button
          type="button"
          onClick={addEntry}
          className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-canvas"
        >
          <Plus className="h-4 w-4" aria-hidden />
          追加
        </button>
      </div>

      {lorebook.entries.length === 0 && (
        <div className="rounded-md border border-dashed border-white/20 px-4 py-8 text-center">
          <p className="text-sm text-muted">まだロアがありません。「追加」から作成してください。</p>
        </div>
      )}

      <div className="grid gap-3">
        {lorebook.entries.map((entry) => (
          <details key={entry.id} open className="rounded-md border border-white/10 bg-panel p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
              <span className="text-sm font-semibold">{entry.title || "（無題）"}</span>
              <span className="shrink-0 rounded-full bg-panel2 px-2 py-0.5 text-[10px] text-muted">
                {ENTRY_TYPE_LABELS[entry.entry_type ?? "other"]}
              </span>
            </summary>

            <div className="mt-3 grid gap-3">
              <LbField label="タイトル *" value={entry.title} onChange={(title) => updateEntry(entry.id, { title })} />

              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted">種別</span>
                <select
                  value={entry.entry_type ?? "other"}
                  onChange={(e) => updateEntry(entry.id, { entry_type: e.target.value as LorebookEntryType })}
                  className="min-h-10 rounded-md border border-white/10 bg-panel2 px-3 text-sm text-ink"
                >
                  {(Object.keys(ENTRY_TYPE_LABELS) as LorebookEntryType[]).map((type) => (
                    <option key={type} value={type}>{ENTRY_TYPE_LABELS[type]}</option>
                  ))}
                </select>
              </label>

              <LbField
                label="キーワード（カンマ区切り）"
                value={entry.keywords.join(", ")}
                onChange={(value) => updateEntry(entry.id, { keywords: splitTags(value) })}
                placeholder="旧校舎, 破れた楽譜, 星灯学園"
              />

              {entry.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {entry.keywords.map((kw) => (
                    <span key={kw} className="rounded-full bg-brand/15 px-2 py-0.5 text-[11px] text-brand">
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              <LbField label="内容" value={entry.content} onChange={(content) => updateEntry(entry.id, { content })} multiline />

              <div className="grid gap-2">
                <p className="text-xs font-medium text-muted">関連キャラクター</p>
                {allCharacters.length === 0 ? (
                  <p className="rounded-md bg-panel2 px-3 py-2 text-xs text-muted">登録済みキャラクターがありません。</p>
                ) : (
                  <div className="grid gap-1.5">
                    {allCharacters.map((character) => (
                      <LbToggle
                        key={character.id}
                        label={`${character.name} / ${character.scenarioTitle}`}
                        checked={(entry.related_character_ids ?? []).includes(character.id)}
                        onChange={(checked) =>
                          updateEntry(entry.id, {
                            related_character_ids: checked
                              ? Array.from(new Set([...(entry.related_character_ids ?? []), character.id]))
                              : (entry.related_character_ids ?? []).filter((id) => id !== character.id)
                          })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted">重要度 1〜5</span>
                  <select
                    value={entry.importance}
                    onChange={(e) => updateEntry(entry.id, { importance: Number(e.target.value) })}
                    className="min-h-10 rounded-md border border-white/10 bg-panel2 px-3 text-sm text-ink"
                  >
                    {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted">オプション</span>
                  <div className="grid gap-1">
                    <LbToggle label="常時参照する" checked={entry.always_include} onChange={(v) => updateEntry(entry.id, { always_include: v })} />
                    <LbToggle label="hidden扱い" checked={entry.is_hidden ?? false} onChange={(v) => updateEntry(entry.id, { is_hidden: v })} />
                    <LbToggle
                      label="ネタバレ/伏線扱い"
                      checked={(entry.entry_type ?? "other") === "foreshadowing"}
                      onChange={(v) => updateEntry(entry.id, { entry_type: v ? "foreshadowing" : "other" })}
                    />
                  </div>
                </div>
              </div>

              <LbField
                label="AIだけが知る情報"
                value={entry.hidden_truth ?? ""}
                onChange={(hidden_truth) => updateEntry(entry.id, { hidden_truth })}
                placeholder="回収条件まで本文には出さない真相"
                multiline
              />

              {entry.is_hidden && (
                <p className="rounded-md border border-brand/20 bg-brand/10 px-3 py-2 text-xs leading-5 text-brand">
                  hidden扱いの項目は通常UIの詳細表示では伏せ、Prompt Builderでも hidden_truth は本文用プロンプトへ渡しません。
                </p>
              )}

              <button
                type="button"
                onClick={() => deleteEntry(entry.id)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 text-sm text-danger"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
                このロアを削除
              </button>
            </div>
          </details>
        ))}
      </div>

      <button
        type="button"
        onClick={addEntry}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-canvas"
      >
        <Plus className="h-4 w-4" aria-hidden />
        ロア項目を追加
      </button>
    </div>
  );
}

// ---- プロット連動タブ ----
function LinkedPlotsTab({ lorebook }: { lorebook: Lorebook }) {
  const { state, addLorebookLink, removeLorebookLink, toggleLorebookLink } = useAppStore();
  const links = (state.lorebookLinks ?? []).filter((link) => link.lorebook_id === lorebook.id);
  const linkedScenarios = links
    .map((link) => ({ link, scenario: state.scenarios.find((scenario) => scenario.id === link.plot_id) }))
    .filter((item): item is { link: (typeof links)[number]; scenario: (typeof state.scenarios)[number] } => !!item.scenario);
  const unlinkedScenarios = state.scenarios.filter((scenario) => !links.some((link) => link.plot_id === scenario.id));

  return (
    <div className="grid gap-4">
      <section className="rounded-md border border-white/10 bg-panel p-4">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">連動中のプロット</h2>
            <p className="mt-1 text-xs leading-5 text-muted">有効な連動だけが会話中のロア検索対象になります。</p>
          </div>
          <span className="rounded-full bg-brand/15 px-2 py-1 text-xs text-brand">{linkedScenarios.length}件</span>
        </div>

        {linkedScenarios.length === 0 ? (
          <p className="rounded-md border border-dashed border-white/15 px-3 py-5 text-center text-xs text-muted">
            このロアブックはまだプロットに連動していません。
          </p>
        ) : (
          <div className="grid gap-2">
            {linkedScenarios.map(({ link, scenario }) => (
              <div key={link.id} className="rounded-md border border-white/10 bg-panel2 p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{scenario.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{scenario.description || "説明はまだありません。"}</p>
                  </div>
                  <Link
                    href={`/scenarios/${scenario.id}/edit`}
                    className="grid min-h-9 min-w-9 place-items-center rounded-md bg-panel text-muted"
                    aria-label="プロット詳細"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeLorebookLink(link.id)}
                    className="grid min-h-9 min-w-9 place-items-center rounded-md bg-danger/10 text-danger"
                    aria-label="連動解除"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-canvas/50 px-3 py-2">
                  <span className="text-xs text-muted">連動を有効にする</span>
                  <input
                    type="checkbox"
                    checked={link.enabled}
                    onChange={(event) => toggleLorebookLink(link.id, event.target.checked)}
                    className="h-5 w-5 accent-brand"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-md border border-white/10 bg-panel p-4">
        <h2 className="mb-3 text-sm font-semibold">プロットへ追加</h2>
        {unlinkedScenarios.length === 0 ? (
          <p className="rounded-md bg-panel2 px-3 py-4 text-center text-xs text-muted">追加できるプロットはありません。</p>
        ) : (
          <div className="grid gap-2">
            {unlinkedScenarios.map((scenario) => (
              <div key={scenario.id} className="flex items-center gap-2 rounded-md border border-white/10 bg-panel2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{scenario.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{scenario.description || "説明はまだありません。"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => addLorebookLink(scenario.id, lorebook.id)}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-semibold text-canvas"
                >
                  <Link2 className="h-4 w-4" aria-hidden />
                  連動
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// ---- 設定タブ ----
function SettingsTab({ lorebook, onChange, onDelete }: {
  lorebook: Lorebook;
  onChange: (lb: Lorebook) => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">公開設定</h2>
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-muted">visibility</span>
          <select
            value={lorebook.visibility}
            onChange={(e) => onChange({ ...lorebook, visibility: e.target.value as "private" | "public" })}
            className="min-h-10 rounded-md border border-white/10 bg-panel2 px-3 text-sm text-ink"
          >
            <option value="private">非公開 (private)</option>
            <option value="public">公開 (public)</option>
          </select>
        </label>
        <p className="text-xs text-muted">現在は個人利用のみ。将来的な公開共有のための設定です。</p>
      </section>

      <section className="rounded-md border border-danger/20 bg-danger/5 p-4">
        <h2 className="mb-3 text-sm font-semibold text-danger">危険操作</h2>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex min-h-10 items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-4 text-sm font-semibold text-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          このロアブックを削除
        </button>
      </section>
    </div>
  );
}

// ---- 共通UIヘルパー ----
function LbField({
  label, value, onChange, multiline, placeholder, type
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  type?: string;
}) {
  const cls = "w-full rounded-md border border-white/10 bg-panel2 px-3 py-2.5 text-sm text-ink placeholder:text-muted/50 focus:border-brand/50 focus:outline-none";
  const stringValue = String(value);
  const required = label.includes("*");
  const displayLabel = label.replace(/\s*\*$/, "");
  return (
    <label className="grid gap-1.5">
      <span className="flex items-center justify-between gap-3 text-xs font-medium text-muted">
        <span>
          {displayLabel}
          {required && <span className="ml-1 text-brand">*</span>}
        </span>
        <span className="shrink-0 text-[10px] text-muted/70">{stringValue.length}</span>
      </span>
      {multiline ? (
        <textarea
          className={`${cls} min-h-24 resize-y`}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type ?? "text"}
          className={cls}
          value={stringValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </label>
  );
}

function LbToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-brand"
      />
      {label}
    </label>
  );
}
