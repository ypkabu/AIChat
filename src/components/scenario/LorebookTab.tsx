"use client";

import Link from "next/link";
import { BookOpen, ExternalLink, Plus, Trash2, X } from "lucide-react";
import type { Lorebook, LorebookEntry, PlotLorebookLink, StoryBundle } from "@/lib/domain/types";
import { newId, nowIso, splitTags } from "@/lib/utils";
import { Field, ToggleRow } from "./formControls";
import { useAppStore } from "@/lib/store/AppStore";

export function LorebookTab({ bundle, onChange }: { bundle: StoryBundle; onChange: (bundle: StoryBundle) => void }) {
  const { state } = useAppStore();
  const lorebooks = state.lorebooks ?? [];
  const links = bundle.lorebookLinks ?? [];

  // 連動中のロアブック
  const linkedLorebooks = links
    .sort((a, b) => a.priority - b.priority)
    .map((link) => ({ link, lorebook: lorebooks.find((lb) => lb.id === link.lorebook_id) }))
    .filter((item): item is { link: PlotLorebookLink; lorebook: Lorebook } => !!item.lorebook);

  // 未連動のロアブック（おすすめ候補）
  const unlinkedLorebooks = lorebooks.filter((lb) => !links.some((link) => link.lorebook_id === lb.id));

  // シナリオ専用ロア（旧来・レガシー）
  const legacyEntries = bundle.lorebook;

  const addLegacyEntry = () => {
    const now = nowIso();
    const entry: LorebookEntry = {
      id: newId("lore"),
      scenario_id: bundle.scenario.id,
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
    onChange({ ...bundle, lorebook: [...bundle.lorebook, entry] });
  };

  const updateLegacyEntry = (id: string, patch: Partial<LorebookEntry>) => {
    onChange({
      ...bundle,
      lorebook: bundle.lorebook.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry))
    });
  };

  const updateLink = (linkId: string, enabled: boolean) => {
    onChange({
      ...bundle,
      lorebookLinks: bundle.lorebookLinks.map((l) => (l.id === linkId ? { ...l, enabled } : l))
    });
  };

  const handleAddLink = (lorebookId: string) => {
    const now = nowIso();
    const newLink: PlotLorebookLink = {
      id: newId("link"),
      plot_id: bundle.scenario.id,
      lorebook_id: lorebookId,
      enabled: true,
      priority: links.length,
      created_at: now
    };
    onChange({ ...bundle, lorebookLinks: [...bundle.lorebookLinks, newLink] });
  };

  const handleRemoveLink = (linkId: string) => {
    onChange({ ...bundle, lorebookLinks: bundle.lorebookLinks.filter((l) => l.id !== linkId) });
  };

  return (
    <div className="grid gap-4">
      {/* 連動中のロアブック */}
      <section className="rounded-md border border-white/10 bg-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">連動中のロアブック</h2>
            <p className="mt-1 text-xs leading-5 text-muted">連動するとキーワード一致時にAIプロンプトへ投入されます。</p>
          </div>
          <Link
            href="/lorebooks"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-brand px-3 text-sm font-semibold text-canvas"
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            管理
          </Link>
        </div>

        {linkedLorebooks.length === 0 ? (
          <p className="rounded-md border border-white/10 bg-panel2 px-3 py-4 text-center text-xs text-muted">
            まだ連動していません。下の「おすすめ」から追加してください。
          </p>
        ) : (
          <div className="grid gap-2">
            {linkedLorebooks.map(({ link, lorebook }) => (
              <div key={link.id} className="rounded-md border border-white/10 bg-panel2 px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight">{lorebook.title}</p>
                    {lorebook.short_description && (
                      <p className="mt-0.5 text-xs text-muted">{lorebook.short_description}</p>
                    )}
                    <p className="mt-1 text-[11px] text-muted/60">{lorebook.entries.length}件のロア</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Link
                      href={`/lorebooks/${lorebook.id}`}
                      className="grid min-h-9 min-w-9 place-items-center rounded-md bg-panel text-muted"
                      aria-label="詳細"
                    >
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemoveLink(link.id)}
                      className="grid min-h-9 min-w-9 place-items-center rounded-md bg-danger/10 text-danger"
                      aria-label="連動解除"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <ToggleRow
                    label="有効"
                    checked={link.enabled}
                    onChange={(enabled) => updateLink(link.id, enabled)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* おすすめロアブック */}
      {unlinkedLorebooks.length > 0 && (
        <section className="rounded-md border border-white/10 bg-panel p-4">
          <h2 className="mb-3 text-sm font-semibold">ロアブックを追加</h2>
          <div className="grid gap-2">
            {unlinkedLorebooks.map((lb) => (
              <div key={lb.id} className="flex items-center gap-2 rounded-md border border-white/10 bg-panel2 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{lb.title}</p>
                  {lb.short_description && <p className="text-xs text-muted">{lb.short_description}</p>}
                  <p className="text-[11px] text-muted/60">{lb.entries.length}件</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleAddLink(lb.id)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-md bg-brand px-2.5 text-xs font-semibold text-canvas"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  連動
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ロアブックがひとつもない場合のCTA */}
      {lorebooks.length === 0 && (
        <div className="rounded-md border border-dashed border-white/20 px-4 py-6 text-center">
          <p className="mb-3 text-xs text-muted">ロアブックがまだありません。</p>
          <Link
            href="/lorebooks"
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-canvas"
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            ロアブックを作成する
          </Link>
        </div>
      )}

      {/* シナリオ専用ロア（レガシー） */}
      <section className="rounded-md border border-white/10 bg-panel p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">シナリオ専用ロア</h2>
            <p className="mt-1 text-xs leading-5 text-muted">このシナリオにのみ適用するロア情報。他シナリオで再利用するにはロアブックをご利用ください。</p>
          </div>
          <button
            type="button"
            onClick={addLegacyEntry}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-panel2 px-3 text-sm font-semibold text-muted"
          >
            <Plus className="h-4 w-4" aria-hidden />
            追加
          </button>
        </div>

        <div className="grid gap-3">
          {legacyEntries.map((entry) => (
            <details key={entry.id} className="rounded-md border border-white/10 bg-panel2 p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold">{entry.title}</summary>
              <div className="mt-3 grid gap-3">
                <Field label="タイトル" value={entry.title} onChange={(title) => updateLegacyEntry(entry.id, { title })} />
                <LegacyEntryTypeSelect value={entry.entry_type ?? "other"} onChange={(entry_type) => updateLegacyEntry(entry.id, { entry_type: entry_type as LorebookEntry["entry_type"] })} />
                <Field label="内容" value={entry.content} onChange={(content) => updateLegacyEntry(entry.id, { content })} multiline />
                <Field
                  label="キーワード（スペース区切り）"
                  value={entry.keywords.join(" ")}
                  onChange={(value) => updateLegacyEntry(entry.id, { keywords: splitTags(value) })}
                  placeholder="灯台 手紙 組織名"
                />
                <Field
                  label="重要度 1〜5"
                  type="number"
                  value={entry.importance}
                  onChange={(value) => updateLegacyEntry(entry.id, { importance: Math.min(5, Math.max(1, Number(value) || 1)) })}
                />
                <ToggleRow label="常時参照" checked={entry.always_include} onChange={(always_include) => updateLegacyEntry(entry.id, { always_include })} />
                <ToggleRow
                  label="hidden（AIのみ・UIに非表示）"
                  checked={entry.is_hidden ?? false}
                  onChange={(is_hidden) => updateLegacyEntry(entry.id, { is_hidden })}
                />
                {entry.is_hidden && (
                  <Field
                    label="AIのみの真実（ユーザーには非表示）"
                    value={entry.hidden_truth ?? ""}
                    onChange={(hidden_truth) => updateLegacyEntry(entry.id, { hidden_truth })}
                    multiline
                  />
                )}
                <div className="grid gap-2">
                  <p className="text-xs text-muted">関連キャラクター</p>
                  {bundle.characters.map((character) => (
                    <ToggleRow
                      key={character.id}
                      label={character.name}
                      checked={entry.related_character_ids.includes(character.id)}
                      onChange={(checked) =>
                        updateLegacyEntry(entry.id, {
                          related_character_ids: checked
                            ? [...entry.related_character_ids, character.id]
                            : entry.related_character_ids.filter((id) => id !== character.id)
                        })
                      }
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...bundle, lorebook: bundle.lorebook.filter((item) => item.id !== entry.id) })}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 text-sm text-danger"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  削除
                </button>
              </div>
            </details>
          ))}
          {legacyEntries.length === 0 && (
            <p className="text-center text-xs text-muted/60">シナリオ専用ロアはありません。</p>
          )}
        </div>
      </section>
    </div>
  );
}

function LegacyEntryTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs font-medium text-muted">種別</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-10 rounded-md border border-white/10 bg-panel px-3 text-sm text-ink"
      >
        <option value="other">その他</option>
        <option value="world">世界観</option>
        <option value="place">場所</option>
        <option value="organization">組織</option>
        <option value="character_secret">キャラの秘密</option>
        <option value="item">アイテム</option>
        <option value="history">歴史</option>
        <option value="rule">ルール</option>
        <option value="foreshadowing">伏線</option>
        <option value="relationship">関係性</option>
      </select>
    </label>
  );
}
