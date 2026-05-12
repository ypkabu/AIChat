"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import type { Lorebook, LorebookEntry, LorebookEntryType } from "@/lib/domain/types";
import { newId, nowIso, splitTags } from "@/lib/utils";

const TABS = ["ロア情報", "項目", "設定"] as const;
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
        {activeTab === "ロア情報" && (
          <InfoTab lorebook={lorebook} onChange={setLorebook} />
        )}
        {activeTab === "項目" && (
          <EntriesTab lorebook={lorebook} onChange={setLorebook} />
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
  return (
    <div className="grid gap-4">
      <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
        <h2 className="text-sm font-semibold">基本情報</h2>
        <LbField label="タイトル *" value={lorebook.title} onChange={(title) => onChange({ ...lorebook, title })} />
        <LbField label="説明" value={lorebook.short_description} onChange={(short_description) => onChange({ ...lorebook, short_description })} multiline />
      </section>
    </div>
  );
}

// ---- 項目タブ ----
function EntriesTab({ lorebook, onChange }: { lorebook: Lorebook; onChange: (lb: Lorebook) => void }) {
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
        <p className="text-sm text-muted">{lorebook.entries.length}件</p>
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
                label="キーワード（スペース区切り）"
                value={entry.keywords.join(" ")}
                onChange={(value) => updateEntry(entry.id, { keywords: splitTags(value) })}
                placeholder="灯台 手紙 組織名"
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
                    <LbToggle label="常時参照" checked={entry.always_include} onChange={(v) => updateEntry(entry.id, { always_include: v })} />
                    <LbToggle label="hidden（AIのみ）" checked={entry.is_hidden ?? false} onChange={(v) => updateEntry(entry.id, { is_hidden: v })} />
                  </div>
                </div>
              </div>

              {entry.is_hidden && (
                <LbField
                  label="AIのみの真実（ユーザーには非表示）"
                  value={entry.hidden_truth ?? ""}
                  onChange={(hidden_truth) => updateEntry(entry.id, { hidden_truth })}
                  multiline
                />
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
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted">{label}</span>
      {multiline ? (
        <textarea
          className={`${cls} min-h-24 resize-y`}
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          type={type ?? "text"}
          className={cls}
          value={String(value)}
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
