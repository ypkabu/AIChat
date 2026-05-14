"use client";

import { RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type VersionInfo = {
  appVersion: string;
  commitHash: string;
  buildTime: string;
  environment: string;
  supabaseProjectRefTail: string | null;
};

function swStatusText(registration: ServiceWorkerRegistration | null) {
  if (!("serviceWorker" in navigator)) return "unsupported";
  if (!registration) return "not registered";
  if (registration.waiting) return "update waiting";
  if (registration.active) return "active";
  return "installing";
}

export function AppVersionPanel() {
  const [version, setVersion] = useState<VersionInfo | null>(null);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState("checking");
  const [cacheStatus, setCacheStatus] = useState<string | null>(null);

  const refresh = async () => {
    const response = await fetch("/api/debug/version", { cache: "no-store" });
    if (response.ok) {
      setVersion(await response.json() as VersionInfo);
    }
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      setServiceWorkerStatus(swStatusText(registration ?? null));
    } else {
      setServiceWorkerStatus("unsupported");
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const clearPwaCaches = async () => {
    if (!("caches" in window)) {
      setCacheStatus("Cache API unsupported");
      return;
    }
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    setCacheStatus(`${keys.length} cache cleared`);
  };

  return (
    <section className="grid gap-3 rounded-md border border-white/10 bg-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">App Version</h2>
        <button
          type="button"
          onClick={() => void refresh()}
          className="grid min-h-9 min-w-9 place-items-center rounded-md bg-panel2 text-muted"
          aria-label="バージョン情報を更新"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted">version</dt>
        <dd className="min-w-0 truncate">{version?.appVersion ?? "loading"}</dd>
        <dt className="text-muted">commit</dt>
        <dd className="min-w-0 truncate">{version?.commitHash ?? "loading"}</dd>
        <dt className="text-muted">build</dt>
        <dd className="min-w-0 truncate">{version?.buildTime ?? "loading"}</dd>
        <dt className="text-muted">env</dt>
        <dd>{version?.environment ?? "loading"}</dd>
        <dt className="text-muted">supabase</dt>
        <dd>{version?.supabaseProjectRefTail ?? "none"}</dd>
        <dt className="text-muted">service worker</dt>
        <dd>{serviceWorkerStatus}</dd>
      </dl>
      <button
        type="button"
        onClick={() => void clearPwaCaches()}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-panel2 text-xs font-semibold text-muted"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
        PWA Cache Clear
      </button>
      {cacheStatus && <p className="text-xs text-muted">{cacheStatus}</p>}
    </section>
  );
}
