"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store/AppStore";
import type { StoryBundle } from "@/lib/domain/types";
import { PromptTab } from "./PromptTab";
import { LorebookTab } from "./LorebookTab";
import { StyleTab } from "./StyleTab";
import { IntroTab } from "./IntroTab";
import { InfoTab } from "./InfoTab";
import { SettingsTab } from "./SettingsTab";

const tabs = ["プロンプト", "ロアブック", "スタイル", "イントロ", "紹介", "設定"] as const;
type Tab = (typeof tabs)[number];

export function ScenarioEditor({ scenarioId }: { scenarioId: string }) {
  const router = useRouter();
  const { getBundle, saveBundle, startOrResumeScenario } = useAppStore();
  const loaded = useMemo(() => getBundle(scenarioId), [getBundle, scenarioId]);
  const [bundle, setBundle] = useState<StoryBundle | null>(loaded);
  const [activeTab, setActiveTab] = useState<Tab>("プロンプト");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setBundle(loaded);
  }, [loaded]);

  if (!bundle) {
    return (
      <main className="app-viewport grid min-h-dvh place-items-center bg-canvas px-4 text-center text-ink">
        <div>
          <p className="mb-4 text-muted">シナリオが見つかりません。</p>
          <Link href="/" className="rounded-md bg-brand px-4 py-3 font-semibold text-canvas">
            一覧へ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="app-viewport min-h-dvh bg-canvas pb-28 text-ink">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-canvas/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Link href="/" className="grid min-h-11 min-w-11 place-items-center rounded-md bg-panel2" aria-label="戻る">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-semibold">{bundle.scenario.title}</h1>
              <p className="text-xs text-muted">作成モード</p>
            </div>
            <button
              type="button"
              className="grid min-h-11 min-w-11 place-items-center rounded-md bg-brand text-canvas"
              aria-label="保存"
              onClick={() => {
                saveBundle(bundle);
                setSaved(true);
                setTimeout(() => setSaved(false), 1400);
              }}
            >
              <Save className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="scrollbar-none flex gap-2 overflow-x-auto">
            {tabs.map((tab) => (
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

      <section className="mx-auto max-w-md px-4 py-4">
        {saved && <div className="mb-3 rounded-md border border-brand/30 bg-brand/12 px-3 py-2 text-sm text-brand">保存しました。</div>}
        {activeTab === "プロンプト" && <PromptTab bundle={bundle} onChange={setBundle} />}
        {activeTab === "ロアブック" && <LorebookTab bundle={bundle} onChange={setBundle} />}
        {activeTab === "スタイル" && <StyleTab bundle={bundle} onChange={setBundle} />}
        {activeTab === "イントロ" && <IntroTab bundle={bundle} onChange={setBundle} />}
        {activeTab === "紹介" && <InfoTab bundle={bundle} onChange={setBundle} />}
        {activeTab === "設定" && <SettingsTab />}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-canvas/95 px-4 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md gap-2">
          <button
            type="button"
            className="min-h-12 flex-1 rounded-md border border-white/10 bg-panel2 font-semibold"
            onClick={() => saveBundle(bundle)}
          >
            保存
          </button>
          <button
            type="button"
            className="inline-flex min-h-12 flex-[1.4] items-center justify-center gap-2 rounded-md bg-brand font-semibold text-canvas"
            onClick={() => {
              saveBundle(bundle);
              const sessionId = startOrResumeScenario(bundle.scenario.id);
              router.push(`/play/${sessionId}`);
            }}
          >
            <Play className="h-4 w-4" aria-hidden />
            プレイ
          </button>
        </div>
      </div>
    </main>
  );
}
