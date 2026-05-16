import { Avatar } from "@/components/ui/Avatar";
import type { Message, VoiceGenerationJob } from "@/lib/domain/types";
import { VoiceButton } from "./VoiceButton";
import { displayContent } from "./displayContent";

export function CharacterBubble({
  message,
  color,
  voiceJob,
  onGenerateVoice
}: {
  message: Message;
  color?: string;
  voiceJob?: VoiceGenerationJob | null;
  onGenerateVoice?: (() => void) | null;
}) {
  const content = displayContent(message.content);
  const lines = content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const hasQuotedLine = lines.some(isDialogueLine);

  return (
    <div className="flex items-end gap-2 pr-10">
      <Avatar name={message.speaker_name} src={message.speaker_avatar_url} color={color} />
      <div className="min-w-0">
        <p className="mb-1 px-1 text-[11px] text-muted">{message.speaker_name}</p>
        <div className="max-w-[min(72vw,20rem)] whitespace-pre-line break-words rounded-2xl rounded-bl-sm bg-gradient-to-b from-panel2 to-[#1e2230] px-3.5 py-2.5 text-[15px] leading-6 text-ink shadow-bubble ring-1 ring-white/[0.04] [overflow-wrap:anywhere]">
          {hasQuotedLine ? (
            <div className="grid gap-1">
              {lines.map((line, index) => (
                <p key={`${message.id}-${index}`} className={isDialogueLine(line) ? "text-ink" : "text-muted italic"}>
                  {line}
                </p>
              ))}
            </div>
          ) : (
            content
          )}
        </div>
        {onGenerateVoice && (
          <VoiceButton voiceJob={voiceJob} onGenerate={onGenerateVoice} />
        )}
      </div>
    </div>
  );
}

function isDialogueLine(line: string) {
  return /^「.*」$/.test(line.trim());
}
