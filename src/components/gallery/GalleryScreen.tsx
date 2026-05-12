"use client";

import { useState } from "react";
import { BottomNav } from "@/components/ui/BottomNav";
import { ImageCard } from "@/components/chat/ImageCard";
import { useAppStore } from "@/lib/store/AppStore";

export function GalleryScreen() {
  const { state } = useAppStore();
  const [filter, setFilter] = useState<"all" | "sfw" | "nsfw">("all");
  const images = state.images.filter((image) => {
    if (filter === "sfw") return !image.is_nsfw;
    if (filter === "nsfw") return image.is_nsfw;
    return true;
  });

  return (
    <main className="app-viewport min-h-dvh bg-canvas pb-24 text-ink">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-canvas/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto max-w-md">
          <h1 className="text-lg font-semibold">ギャラリー</h1>
          <p className="text-xs text-muted">イベント画像とキャライメージを一覧表示します。</p>
        </div>
      </header>
      <section className="mx-auto max-w-md px-4 py-4">
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-md bg-panel p-1">
          {[
            ["all", "すべて"],
            ["sfw", "通常"],
            ["nsfw", "NSFW"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value as typeof filter)}
              className={`min-h-10 rounded-sm text-sm ${filter === value ? "bg-brand font-semibold text-canvas" : "text-muted"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {images.length === 0 ? (
          <p className="rounded-md bg-panel p-4 text-sm text-muted">まだ画像はありません。プレイ画面の画像生成ボタンから作れます。</p>
        ) : (
          <div className="grid gap-3">
            {images.map((image) => (
              <ImageCard key={image.id} image={image} />
            ))}
          </div>
        )}
      </section>
      <BottomNav active="gallery" />
    </main>
  );
}
