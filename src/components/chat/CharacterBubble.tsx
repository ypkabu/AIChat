import { Avatar } from "@/components/ui/Avatar";
import type { Message, VoiceGenerationJob } from "@/lib/domain/types";
import { VoiceButton } from "./VoiceButton";

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
  const lines = message.content.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const hasQuotedLine = lines.some(isDialogueLine);

  return (
    <div className="flex items-end gap-2 pr-10">
      <Avatar name={message.speaker_name} src={message.speaker_avatar_url} color={color} />
      <div className="min-w-0">
        <p className="mb-1 px-1 text-[11px] text-muted">{message.speaker_name}</p>
        <div className="max-w-[min(72vw,20rem)] whitespace-pre-line break-words rounded-2xl rounded-bl-sm bg-panel2 px-3.5 py-2.5 text-[15px] leading-6 text-ink shadow-sm [overflow-wrap:anywhere]">
          {hasQuotedLine ? (
            <div className="grid gap-1">
              {lines.map((line, index) => (
                <p key={`${message.id}-${index}`} className={isDialogueLine(line) ? "text-ink" : "text-muted italic"}>
                  {line}
                </p>
              ))}
            </div>
          ) : (
            message.content
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
