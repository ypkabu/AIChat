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
  onGenerateEventImage,
  onGenerateVoice
}: {
  messages: Message[];
  characters: ScenarioCharacter[];
  images: GeneratedImage[];
  voiceJobs?: VoiceGenerationJob[];
  onGenerateEventImage: (message: Message) => void;
  onGenerateVoice?: ((message: Message, characterId: string | null) => void) | null;
}) {
  return (
    <div className="grid gap-3 px-3 py-4">
      {messages.map((message) => {
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
          return <EventMessage key={message.id} message={message} onGenerateImage={() => onGenerateEventImage(message)} />;
        }
        return <SystemMessage key={message.id} message={message} />;
      })}
    </div>
  );
}
