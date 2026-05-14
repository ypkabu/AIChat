import type { Message } from "@/lib/domain/types";
import { displayContent } from "./displayContent";

export function NarrationBlock({ message }: { message: Message }) {
  const content = displayContent(message.content);
  return (
    <div className="flex gap-2 break-words rounded-md border border-white/10 bg-black/18 px-3 py-3 text-sm leading-6 text-muted [overflow-wrap:anywhere]">
      <span className="mt-0.5 shrink-0 text-muted/80" aria-hidden>
        ≡
      </span>
      <p className="min-w-0 whitespace-pre-line break-words [overflow-wrap:anywhere]">{content}</p>
    </div>
  );
}
