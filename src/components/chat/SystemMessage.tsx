import type { Message } from "@/lib/domain/types";
import { displayContent } from "./displayContent";

export function SystemMessage({ message }: { message: Message }) {
  const content = displayContent(message.content);
  return (
    <div className="flex justify-center">
      <span className="max-w-[86%] break-words rounded-md bg-panel2 px-3 py-1.5 text-center text-xs leading-5 text-muted [overflow-wrap:anywhere]">{content}</span>
    </div>
  );
}
