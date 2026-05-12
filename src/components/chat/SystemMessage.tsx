import type { Message } from "@/lib/domain/types";

export function SystemMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-center">
      <span className="max-w-[86%] break-words rounded-md bg-panel2 px-3 py-1.5 text-center text-xs leading-5 text-muted [overflow-wrap:anywhere]">{message.content}</span>
    </div>
  );
}
