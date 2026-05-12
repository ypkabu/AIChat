import { Camera } from "lucide-react";
import type { Message } from "@/lib/domain/types";

export function EventMessage({ message, onGenerateImage }: { message: Message; onGenerateImage?: () => void }) {
  const isSilentContinue = message.metadata.action === "continue_without_user_speech";
  if (isSilentContinue) {
    return (
      <div className="my-1 flex items-center gap-3 px-3 text-xs text-muted/60">
        <span className="h-px flex-1 bg-white/8" />
        <span>{message.content}</span>
        <span className="h-px flex-1 bg-white/8" />
      </div>
    );
  }

  const isImageJob = typeof message.metadata.imageJobId === "string";
  const status = typeof message.metadata.status === "string" ? message.metadata.status : null;
  return (
    <div className="break-words rounded-md border border-accent/25 bg-accent/10 p-3 text-sm leading-6 text-ink [overflow-wrap:anywhere]">
      <div className="mb-2 flex items-center gap-2 text-accent">
        <Camera className="h-4 w-4" aria-hidden />
        <span className="text-xs font-semibold">{isImageJob ? "画像生成ジョブ" : "重要イベント候補"}</span>
        {status && <span className="rounded-sm bg-canvas/70 px-2 py-0.5 text-[11px] uppercase text-muted">{status}</span>}
      </div>
      <p className="text-muted break-words [overflow-wrap:anywhere]">{message.content}</p>
      {!isImageJob && onGenerateImage && (
        <button type="button" onClick={onGenerateImage} className="mt-3 min-h-11 w-full rounded-md bg-accent px-3 font-semibold text-canvas">
          この場面を画像化
        </button>
      )}
    </div>
  );
}
