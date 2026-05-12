"use client";

import { useEffect } from "react";
import { AppStoreProvider } from "@/lib/store/AppStore";

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return <AppStoreProvider>{children}</AppStoreProvider>;
}
