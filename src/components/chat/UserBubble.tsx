import { Avatar } from "@/components/ui/Avatar";
import type { Message } from "@/lib/domain/types";
import { displayContent } from "./displayContent";

export function UserBubble({ message }: { message: Message }) {
  const aiGenerated = message.metadata?.aiGeneratedUser === true;
  const content = displayContent(message.content);
  return (
    <div className="flex flex-row-reverse items-start gap-2.5 pl-10">
      <Avatar name={message.speaker_name} src={message.speaker_avatar_url} color="#6c5ce7" size="sm" />
      <div className="min-w-0">
        <p className="mb-1 px-0.5 text-right text-[11px] font-medium text-muted">{message.speaker_name}</p>
        <div className="relative max-w-[min(78vw,22rem)] whitespace-pre-line break-words rounded-2xl rounded-tr-md bg-gradient-to-br from-[#5b4dc7] to-[#4834a8] px-3.5 py-3 text-[15px] leading-7 text-white shadow-[0_2px_12px_rgba(91,77,199,0.3)] ring-1 ring-white/10 [overflow-wrap:anywhere]">
          {content}
          {aiGenerated && <span className="absolute -bottom-2 -right-1 rounded-full bg-panel px-1.5 text-[10px] text-brand">✦</span>}
        </div>
      </div>
    </div>
  );
}
