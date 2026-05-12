"use client";

import { Check, EyeOff, Pencil, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import { BottomNav } from "@/components/ui/BottomNav";

export function MemoryManager() {
  const { state, approveMemoryCandidate, rejectMemoryCandidate, updateMemory, deleteMemory } = useAppStore();
  const [showSensitive, setShowSensitive] = useState(!state.settings.hide_sensitive_memories);
  const [scenarioFilter, setScenarioFilter] = useState("all");
  const scenarios = state.scenarios;
  const memories = useMemo(
    () =>
      state.memories.filter((memory) => {
        if (scenarioFilter !== "all" && memory.scenario_id !== scenarioFilter) return false;
        if (!showSensitive && memory.sensitivity !== "normal") return false;
        return true;
      }),
    [scenarioFilter, showSensitive, state.memories]
  );
  const candidates = state.memoryCandidates.filter((candidate) => candidate.status === "pending");

  return (
    <main className="app-viewport min-h-dvh bg-canvas pb-24 text-ink">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-canvas/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <h1 className="text-lg font-semibold">メモリ管理</h1>
          <p className="text-xs text-muted">通常メモリは承認後に保存。sensitive/explicit は明示的に表示します。</p>
        </div>
      </header>

      <section className="mx-auto grid max-w-md gap-4 px-4 py-4">
        <div className="grid gap-2 rounded-md border border-white/10 bg-panel p-3">
          <label className="grid gap-1.5">
            <span className="text-xs text-muted">シナリオ別</span>
            <select value={scenarioFilter} onChange={(event) => setScenarioFilter(event.target.value)} className="min-h-11 rounded-md bg-panel2 px-3">
              <option value="all">すべて</option>
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center justify-between rounded-md bg-panel2 px-3 text-sm">
            <span>NSFW関連メモリを表示</span>
            <input type="checkbox" className="h-5 w-5 accent-brand" checked={showSensitive} onChange={(event) => setShowSensitive(event.target.checked)} />
          </label>
        </div>

        <section className="grid gap-3">
          <h2 className="text-sm font-semibold text-muted">承認待ち候補</h2>
          {candidates.length === 0 && <p className="rounded-md bg-panel p-3 text-sm text-muted">候補はまだありません。</p>}
          {candidates.map((candidate) => (
            <article key={candidate.id} className="grid gap-2 rounded-md border border-white/10 bg-panel p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm leading-6">{candidate.content}</p>
                <span className="rounded-sm bg-panel2 px-2 py-1 text-[11px] text-muted">{candidate.sensitivity}</span>
              </div>
              <p className="text-xs leading-5 text-muted">{candidate.reason}</p>
              <div className="flex gap-2">
                <button type="button" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold text-canvas" onClick={() => approveMemoryCandidate(candidate.id)}>
                  <Check className="h-4 w-4" aria-hidden />
                  保存
                </button>
                <button type="button" className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-md bg-panel2 text-sm font-semibold text-muted" onClick={() => rejectMemoryCandidate(candidate.id)}>
                  <X className="h-4 w-4" aria-hidden />
                  却下
                </button>
              </div>
            </article>
          ))}
        </section>

        <section className="grid gap-3">
          <h2 className="text-sm font-semibold text-muted">保存済みメモリ</h2>
          {memories.length === 0 && <p className="rounded-md bg-panel p-3 text-sm text-muted">保存済みメモリはまだありません。</p>}
          {memories.map((memory) => (
            <article key={memory.id} className="grid gap-2 rounded-md border border-white/10 bg-panel p-3">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-sm bg-brand/12 px-2 py-1 text-[11px] text-brand">{memory.type}</span>
                <span className="rounded-sm bg-panel2 px-2 py-1 text-[11px] text-muted">重要度 {memory.importance}</span>
                <span className="rounded-sm bg-panel2 px-2 py-1 text-[11px] text-muted">{memory.sensitivity}</span>
                {!memory.include_in_prompt && (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-panel2 px-2 py-1 text-[11px] text-muted">
                    <EyeOff className="h-3 w-3" aria-hidden />
                    prompt除外
                  </span>
                )}
              </div>
              <textarea
                value={memory.content}
                onChange={(event) => updateMemory(memory.id, { content: event.target.value })}
                className="min-h-24 rounded-md border border-white/10 bg-panel2 px-3 py-2 text-sm leading-6 outline-none focus:border-brand"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="flex min-h-10 items-center justify-between rounded-md bg-panel2 px-3 text-sm">
                  prompt
                  <input
                    type="checkbox"
                    checked={memory.include_in_prompt}
                    onChange={(event) => updateMemory(memory.id, { include_in_prompt: event.target.checked })}
                    className="h-5 w-5 accent-brand"
                  />
                </label>
                <label className="flex min-h-10 items-center gap-2 rounded-md bg-panel2 px-3 text-sm">
                  <Pencil className="h-4 w-4" aria-hidden />
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={memory.importance}
                    onChange={(event) => updateMemory(memory.id, { importance: Number(event.target.value) })}
                    className="w-full bg-transparent outline-none"
                  />
                </label>
              </div>
              <button type="button" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-danger/30 bg-danger/10 text-sm text-danger" onClick={() => deleteMemory(memory.id)}>
                <Trash2 className="h-4 w-4" aria-hidden />
                削除
              </button>
            </article>
          ))}
        </section>
      </section>
      <BottomNav active="memory" />
    </main>
  );
}
