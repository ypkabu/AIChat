"use client";

import { useEffect, useRef, useState } from "react";
import { AppStoreProvider } from "@/lib/store/AppStore";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    });

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
      }

      registration.addEventListener("updatefound", () => {
        const nextWorker = registration.installing;
        if (!nextWorker) return;
        nextWorker.addEventListener("statechange", () => {
          if (nextWorker.state === "installed" && navigator.serviceWorker.controller) {
            setWaitingWorker(nextWorker);
          }
        });
      });
    }).catch(() => undefined);
  }, []);

  const applyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  return (
    <AppStoreProvider>
      {children}
      {waitingWorker && (
        <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+76px)] z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border border-brand/20 bg-panel/90 px-4 py-3 text-sm text-ink shadow-glow-brand backdrop-blur-xl animate-slide-up">
          <span className="min-w-0 flex-1">新しいバージョンがあります。</span>
          <button
            type="button"
            onClick={applyUpdate}
            className="min-h-9 rounded-lg bg-gradient-brand px-4 text-xs font-semibold text-canvas shadow-glow-sm transition-all duration-150 active:scale-95"
          >
            更新
          </button>
        </div>
      )}
    </AppStoreProvider>
  );
}
