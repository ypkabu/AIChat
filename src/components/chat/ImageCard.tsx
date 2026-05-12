"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { GeneratedImage } from "@/lib/domain/types";

export function ImageCard({ image }: { image?: GeneratedImage }) {
  const [revealed, setRevealed] = useState(false);
  if (!image) return null;
  const blurred = image.blur_by_default && !revealed;

  return (
    <figure className="overflow-hidden rounded-md border border-white/10 bg-panel shadow-soft">
      <div className="relative aspect-[3/4] bg-panel2">
        {image.public_url ? <img src={image.public_url} alt="" className={`h-full w-full object-cover ${blurred ? "blur-xl scale-105" : ""}`} /> : null}
        {blurred && (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="absolute inset-0 grid place-items-center bg-black/35 text-center text-sm font-semibold text-ink"
          >
            <span className="inline-flex items-center gap-2 rounded-md bg-canvas/80 px-3 py-2">
              <Eye className="h-4 w-4" aria-hidden />
              表示
            </span>
          </button>
        )}
      </div>
      <figcaption className="flex items-start justify-between gap-3 px-3 py-2 text-xs leading-5 text-muted">
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">{image.prompt_summary || "イベント画像"}</span>
        {image.is_nsfw && (
          <span className="inline-flex items-center gap-1 rounded-sm bg-danger/12 px-2 py-1 text-danger">
            {blurred ? <EyeOff className="h-3 w-3" aria-hidden /> : null}
            NSFW
          </span>
        )}
      </figcaption>
    </figure>
  );
}
