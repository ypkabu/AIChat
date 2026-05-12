"use client";

import { ShieldCheck } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";

export function AgeGate() {
  const { state, updateSettings } = useAppStore();

  if (!state.settings.startup_age_gate || state.settings.adult_confirmed) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/70 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-6 backdrop-blur-sm sm:place-items-center">
      <section className="w-full max-w-md rounded-t-lg border border-white/10 bg-panel p-5 shadow-soft sm:rounded-lg">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-brand/14 text-brand">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">成人確認</h2>
            <p className="text-sm text-muted">このアプリは 18 歳以上の個人利用向けです。</p>
          </div>
        </div>
        <p className="mb-4 text-sm leading-6 text-muted">
          NSFW 機能は完全にオプトインです。非合意、近親相姦、実在人物の性的ディープフェイク、搾取、違法コンテンツ、非同意の親密画像などは禁止カテゴリとして扱います。
        </p>
        <div className="grid gap-2">
          <button
            type="button"
            className="min-h-12 rounded-md bg-brand px-4 font-semibold text-canvas"
            onClick={() => updateSettings({ adult_confirmed: true })}
          >
            18歳以上です
          </button>
          <button
            type="button"
            className="min-h-12 rounded-md border border-white/10 bg-panel2 px-4 font-semibold text-muted"
            onClick={() => updateSettings({ startup_age_gate: false })}
          >
            NSFWなしで続ける
          </button>
        </div>
      </section>
    </div>
  );
}
