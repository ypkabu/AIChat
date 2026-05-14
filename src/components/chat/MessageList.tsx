"use client";

import { EventMessage } from "./EventMessage";
import { CharacterBubble } from "./CharacterBubble";
import { ImageCard } from "./ImageCard";
import { NarrationBlock } from "./NarrationBlock";
import { SystemMessage } from "./SystemMessage";
import { UserBubble } from "./UserBubble";
import type { GeneratedImage, Message, ScenarioCharacter, VoiceGenerationJob } from "@/lib/domain/types";

export function MessageList({
  messages,
  characters,
  images,
  voiceJobs,
  showAuxiliaryActions = true,
  onGenerateEventImage,
  onGenerateVoice
}: {
  messages: Message[];
  characters: ScenarioCharacter[];
  images: GeneratedImage[];
  voiceJobs?: VoiceGenerationJob[];
  showAuxiliaryActions?: boolean;
  onGenerateEventImage: (message: Message) => void;
  onGenerateVoice?: ((message: Message, characterId: string | null) => void) | null;
}) {
  const displayMessages = expandLooseNdjsonMessages(messages);
  return (
    <div className="grid gap-3 px-3 py-4">
      {displayMessages.map((message) => {
        if (message.message_type === "user") return <UserBubble key={message.id} message={message} />;
        if (message.message_type === "character") {
          const character = characters.find((item) => item.id === message.speaker_id || item.name === message.speaker_name);
          const voiceJob = voiceJobs?.filter((job) => job.message_id === message.id).at(-1) ?? null;
          const handleVoice = onGenerateVoice ? () => onGenerateVoice(message, character?.id ?? null) : null;
          return <CharacterBubble key={message.id} message={message} color={character?.display_color} voiceJob={voiceJob} onGenerateVoice={handleVoice} />;
        }
        if (message.message_type === "narration") return <NarrationBlock key={message.id} message={message} />;
        if (message.message_type === "image") {
          const imageId = typeof message.metadata.imageId === "string" ? message.metadata.imageId : "";
          return <ImageCard key={message.id} image={images.find((image) => image.id === imageId)} />;
        }
        if (message.message_type === "event") {
          return <EventMessage key={message.id} message={message} onGenerateImage={showAuxiliaryActions ? () => onGenerateEventImage(message) : undefined} />;
        }
        return <SystemMessage key={message.id} message={message} />;
      })}
    </div>
  );
}

function expandLooseNdjsonMessages(messages: Message[]): Message[] {
  return messages.flatMap((message) => {
    if (!mayContainLooseNdjson(message.content)) return [message];
    const source = unwrapEscapedJsonObjects(message.content);
    const expanded: Message[] = [];
    let searchIndex = 0;
    while (searchIndex < source.length) {
      const start = source.indexOf("{", searchIndex);
      if (start === -1) break;
      const end = findJsonObjectEnd(source, start);
      if (end === -1) break;
      const item = parseLooseNdjsonObject(message, source.slice(start, end + 1), expanded.length);
      if (item) expanded.push(item);
      searchIndex = end + 1;
    }
    return expanded.length ? expanded : [];
  });
}

function mayContainLooseNdjson(content: string) {
  return (content.includes('"type"') || content.includes('\\"type\\"')) && content.includes("{") && content.includes("}");
}

function unwrapEscapedJsonObjects(content: string) {
  if (!content.includes('\\"type\\"')) return content;
  return content.replace(/\\"/g, '"').replace(/\\n/g, "\n");
}

function parseLooseNdjsonObject(message: Message, text: string, index: number): Message | null {
  const trimmed = text.trim();
  try {
    const raw = JSON.parse(trimmed) as Record<string, unknown>;
    const type = String(raw.type ?? "").toLowerCase();
    if (type === "narration") {
      return {
        ...message,
        id: `${message.id}-ndjson-${index}`,
        message_type: "narration",
        speaker_type: "system",
        speaker_name: null,
        content: String(raw.content ?? "")
      };
    }
    if (type === "dialogue" || type === "character") {
      return {
        ...message,
        id: `${message.id}-ndjson-${index}`,
        message_type: "character",
        speaker_type: "character",
        speaker_name: String(raw.speaker ?? raw.characterName ?? "語り手"),
        content: String(raw.content ?? "")
      };
    }
    return null;
  } catch {
    return null;
  }
}

function findJsonObjectEnd(text: string, start: number) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
    } else if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}
