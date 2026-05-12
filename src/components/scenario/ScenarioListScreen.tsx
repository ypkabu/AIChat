"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit3, Play, Plus, Users } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { formatDate } from "@/lib/utils";
import { AgeGate } from "@/components/settings/AgeGate";
import { SupabaseAuthPanel } from "@/components/settings/SupabaseAuthPanel";
import { AppMark, BottomNav } from "@/components/ui/BottomNav";

export function ScenarioListScreen() {
  const router = useRouter();
  const { state, createScenario, startOrResumeScenario } = useAppStore();

  const monthlyCost = state.usageLogs.reduce((sum, log) => sum + log.estimated_cost_jpy, 0);
  const remaining = Math.max(0, state.settings.monthly_budget_jpy - monthlyCost);

  return (
    <main className="app-viewport min-h-dvh bg-canvas pb-32 text-ink">
      <AgeGate />
      <header className="sticky top-0 z-20 border-b border-white/10 bg-canvas/92 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <AppMark />
          <button
            type="button"
            className="grid min-h-11 min-w-11 place-items-center rounded-md bg-brand text-canvas"
            aria-label="新規シナリオ"
            onClick={() => {
              const id = createScenario();
              router.push(`/scenarios/${id}/edit`);
            }}
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-md px-4 py-4 pb-10">
        <div className="mb-4">
          <SupabaseAuthPanel />
        </div>
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-md border border-white/10 bg-panel p-3">
            <p className="text-[11px] text-muted">今月合計</p>
            <p className="mt-1 text-lg font-semibold">{monthlyCost.toFixed(0)}円</p>
          </div>
          <div className="rounded-md border border-white/10 bg-panel p-3">
            <p className="text-[11px] text-muted">残額</p>
            <p className="mt-1 text-lg font-semibold">{remaining.toFixed(0)}円</p>
          </div>
          <div className="rounded-md border border-white/10 bg-panel p-3">
            <p className="text-[11px] text-muted">低コスト</p>
            <p className="mt-1 text-lg font-semibold">{state.settings.low_cost_mode ? "ON" : "OFF"}</p>
          </div>
        </div>

        <div className="grid gap-3">
          {state.scenarios.map((scenario) => {
            const characterCount = state.characters.filter((character) => character.scenario_id === scenario.id).length;
            const session = state.sessions.find((item) => item.scenario_id === scenario.id && item.status === "active");
            return (
              <article key={scenario.id} className="rounded-md border border-white/10 bg-panel p-4 shadow-soft">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-lg font-semibold leading-snug">{scenario.title}</h2>
                    <p className="mt-1 line-clamp-3 text-sm leading-6 text-muted">{scenario.description || "説明はまだありません。"}</p>
                  </div>
                  <span className="rounded-sm bg-panel2 px-2 py-1 text-[11px] text-muted">{scenario.visibility}</span>
                </div>

                <div className="mb-3 flex flex-wrap gap-1.5">
                  {scenario.tags.length ? (
                    scenario.tags.map((tag) => (
                      <span key={tag} className="rounded-sm bg-brand/12 px-2 py-1 text-[11px] text-brand">
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-sm bg-panel2 px-2 py-1 text-[11px] text-muted">タグなし</span>
                  )}
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 text-xs text-muted">
                  <span>更新: {formatDate(scenario.updated_at)}</span>
                  <span>最終プレイ: {formatDate(scenario.last_played_at)}</span>
                  <span>進行: {scenario.progress_percent}%</span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" aria-hidden />
                    {characterCount}人
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/scenarios/${scenario.id}/edit`}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-white/10 bg-panel2 px-3 text-sm font-semibold"
                  >
                    <Edit3 className="h-4 w-4" aria-hidden />
                    編集
                  </Link>
                  <button
                    type="button"
                    className="inline-flex min-h-11 flex-[1.3] items-center justify-center gap-2 rounded-md bg-brand px-3 text-sm font-semibold text-canvas"
                    onClick={() => {
                      const sessionId = session?.id || startOrResumeScenario(scenario.id);
                      router.push(`/play/${sessionId}`);
                    }}
                  >
                    <Play className="h-4 w-4" aria-hidden />
                    {session ? "続きから" : "プレイ開始"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <BottomNav active="home" />
    </main>
  );
}
