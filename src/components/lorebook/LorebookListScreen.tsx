"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, BookOpen, Plus, Trash2 } from "lucide-react";
import { useAppStore } from "@/lib/store/AppStore";
import { BottomNav } from "@/components/ui/BottomNav";

export function LorebookListScreen() {
  const router = useRouter();
  const { listLorebooks, createLorebook, deleteLorebook } = useAppStore();
  const lorebooks = listLorebooks();

  const handleCreate = () => {
    const id = createLorebook();
    router.push(`/lorebooks/${id}`);
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？連動しているプロットからも解除されます。`)) return;
    deleteLorebook(id);
  };

  return (
    <main className="app-viewport min-h-dvh bg-canvas pb-32 text-ink">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-canvas/95 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link href="/" className="grid min-h-11 min-w-11 place-items-center rounded-md bg-panel2" aria-label="戻る">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </Link>
            <div>
              <h1 className="text-base font-semibold">ロアブック</h1>
              <p className="text-xs text-muted">{lorebooks.length}件</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            className="grid min-h-11 min-w-11 place-items-center rounded-md bg-brand text-canvas"
            aria-label="新規作成"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-md px-4 py-4">
        {lorebooks.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-brand/15 text-brand">
              <BookOpen className="h-8 w-8" aria-hidden />
            </div>
            <div>
              <p className="mb-1 text-base font-semibold">ロアブックがありません</p>
              <p className="text-sm text-muted">世界観・用語・キャラの秘密などを<br />保存してシナリオに連動できます。</p>
            </div>
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex min-h-12 items-center gap-2 rounded-md bg-brand px-6 text-base font-semibold text-canvas"
            >
              <Plus className="h-5 w-5" aria-hidden />
              最初のロアブックを作成
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {lorebooks.map((lb) => (
              <div key={lb.id} className="rounded-md border border-white/10 bg-panel">
                <Link
                  href={`/lorebooks/${lb.id}`}
                  className="flex items-start gap-3 p-4"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand/15 text-brand">
                    <BookOpen className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-tight">{lb.title}</p>
                    {lb.short_description && (
                      <p className="mt-1 text-xs text-muted line-clamp-2">{lb.short_description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-[11px] text-muted/70">
                      <span>{lb.entries.length}件のロア</span>
                      <span>{lb.visibility === "private" ? "非公開" : "公開"}</span>
                    </div>
                  </div>
                </Link>
                <div className="flex items-center justify-end border-t border-white/10 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => handleDelete(lb.id, lb.title)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <BottomNav active="lorebooks" />
    </main>
  );
}
