import type { Message } from "@/lib/domain/types";

export function NarrationBlock({ message }: { message: Message }) {
  return (
    <div className="flex gap-2 break-words rounded-md border border-white/10 bg-black/18 px-3 py-3 text-sm leading-6 text-muted [overflow-wrap:anywhere]">
      <span className="mt-0.5 shrink-0 text-muted/80" aria-hidden>
        ≡
      </span>
      <p className="min-w-0 whitespace-pre-line break-words [overflow-wrap:anywhere]">{message.content}</p>
    </div>
  );
}
