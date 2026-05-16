import type { Message } from "@/lib/domain/types";
import { displayContent } from "./displayContent";

export function NarrationBlock({ message }: { message: Message }) {
  const content = displayContent(message.content);
  return (
    <div className="flex gap-3 px-1 py-1">
      <span className="mt-0.5 shrink-0 text-base text-muted/60" aria-hidden>
        ≡
      </span>
      <p className="min-w-0 whitespace-pre-line break-words text-[15px] leading-7 text-ink/80 [overflow-wrap:anywhere]">
        {content}
      </p>
    </div>
  );
}
