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
  const segments = parseSegments(content);

  return (
    <div className="flex items-start gap-2.5 pr-10">
      <Avatar name={message.speaker_name} src={message.speaker_avatar_url} color={color} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="mb-1 px-0.5 text-[11px] font-medium text-muted">{message.speaker_name}</p>
        <div className="max-w-[min(78vw,22rem)] whitespace-pre-line break-words rounded-2xl rounded-tl-md bg-[#1c1f2b] px-3.5 py-3 text-[15px] leading-7 text-ink/90 ring-1 ring-white/[0.06] [overflow-wrap:anywhere]">
          <div className="grid gap-2">
            {segments.map((seg, i) => (
              <p
                key={`${message.id}-seg-${i}`}
                className={seg.isDialogue
                  ? "font-medium text-ink"
                  : "text-[14px] leading-6 text-ink/60"
                }
              >
                {seg.text}
              </p>
            ))}
          </div>
        </div>
        {onGenerateVoice && (
          <VoiceButton voiceJob={voiceJob} onGenerate={onGenerateVoice} />
        )}
      </div>
    </div>
  );
}

type Segment = { text: string; isDialogue: boolean };

function parseSegments(content: string): Segment[] {
  const lines = content.split(/\n+/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [{ text: content, isDialogue: false }];

  const segments: Segment[] = [];
  let currentNarration: string[] = [];

  const flushNarration = () => {
    if (currentNarration.length > 0) {
      segments.push({ text: currentNarration.join("\n"), isDialogue: false });
      currentNarration = [];
    }
  };

  for (const line of lines) {
    if (isDialogueLine(line)) {
      flushNarration();
      segments.push({ text: line, isDialogue: true });
    } else {
      currentNarration.push(line);
    }
  }
  flushNarration();

  // If no dialogue was found, treat everything as a single narration segment
  if (segments.length === 0) {
    return [{ text: content, isDialogue: false }];
  }

  return segments;
}

function isDialogueLine(line: string) {
  const trimmed = line.trim();
  return (
    /^「.*」$/.test(trimmed) ||
    /^『.*』$/.test(trimmed) ||
    /^（.*）$/.test(trimmed) ||
    /^\(.*\)$/.test(trimmed)
  );
}
