"use client";

import { Cloud, LogOut, Mail, RefreshCw, UserRound } from "lucide-react";
import { useState } from "react";
import { useAppStore } from "@/lib/store/AppStore";

export function SupabaseAuthPanel() {
  const {
    remote,
    remoteSaving,
    signInRemoteAnonymously,
    signInRemoteWithEmail,
    signOutRemote,
    syncRemoteNow
  } = useAppStore();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  if (!remote.configured) {
    return (
      <section className="rounded-md border border-white/10 bg-panel p-3 text-sm text-muted">
        Supabase 未設定です。`.env.local` を設定するとクラウド保存を使えます。
      </section>
    );
  }

  if (remote.user) {
    return (
      <section className="grid gap-2 rounded-md border border-brand/25 bg-brand/10 p-3">
        <div className="flex items-center gap-2 text-sm text-brand">
          <Cloud className="h-4 w-4" aria-hidden />
          <span className="font-semibold">Supabase 保存中</span>
          <span className="ml-auto text-xs text-muted">{remoteSaving ? "同期中" : "同期待機"}</span>
        </div>
        <p className="truncate text-xs text-muted">{remote.user.email ?? remote.user.id}</p>
        {remote.error && <p className="rounded-sm bg-panel2 px-2 py-1 text-xs text-accent">{remote.error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-panel2 text-sm font-semibold"
            onClick={() => void syncRemoteNow()}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            今すぐ同期
          </button>
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-white/10 bg-panel2 text-sm font-semibold text-muted"
            onClick={() => void signOutRemote()}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            切断
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-2 rounded-md border border-white/10 bg-panel p-3">
      <div className="flex items-center gap-2 text-sm text-ink">
        <Cloud className="h-4 w-4 text-brand" aria-hidden />
        <span className="font-semibold">Supabase 保存</span>
        {remote.loading && <span className="ml-auto text-xs text-muted">接続中</span>}
      </div>
      <button
        type="button"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand text-sm font-semibold text-canvas"
        onClick={async () => {
          setMessage(null);
          try {
            await signInRemoteAnonymously();
          } catch {
            setMessage("匿名ログインが無効なら、メールリンクでログインしてください。");
          }
        }}
      >
        <UserRound className="h-4 w-4" aria-hidden />
        匿名でクラウド保存
      </button>
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email@example.com"
          className="min-h-11 min-w-0 flex-1 rounded-md border border-white/10 bg-panel2 px-3 text-base outline-none focus:border-brand"
        />
        <button
          type="button"
          disabled={!email.trim()}
          className="grid min-h-11 min-w-11 place-items-center rounded-md bg-panel2 text-muted disabled:opacity-40"
          aria-label="メールリンクを送信"
          onClick={async () => {
            setMessage(null);
            await signInRemoteWithEmail(email.trim());
            setMessage("確認メールを送信しました。");
          }}
        >
          <Mail className="h-5 w-5" aria-hidden />
        </button>
      </div>
      {(message || remote.error) && <p className="text-xs leading-5 text-accent">{message ?? remote.error}</p>}
    </section>
  );
}
