import { Avatar } from "@/components/ui/Avatar";
import type { Message } from "@/lib/domain/types";
import { displayContent } from "./displayContent";

export function UserBubble({ message }: { message: Message }) {
  const aiGenerated = message.metadata?.aiGeneratedUser === true;
  const content = displayContent(message.content);
  return (
    <div className="flex flex-row-reverse items-end gap-2 pl-10">
      <Avatar name={message.speaker_name} src={message.speaker_avatar_url} color="#86a8ff" />
      <div className="min-w-0">
        <p className="mb-1 px-1 text-right text-[11px] text-muted">{message.speaker_name}</p>
        <div className="relative max-w-[min(72vw,20rem)] whitespace-pre-line break-words rounded-2xl rounded-br-sm bg-brand px-3.5 py-2.5 text-[15px] leading-6 text-canvas shadow-sm [overflow-wrap:anywhere]">
          {content}
          {aiGenerated && <span className="absolute -bottom-2 -right-1 rounded-full bg-panel px-1.5 text-[10px] text-brand">✦</span>}
        </div>
      </div>
    </div>
  );
}
