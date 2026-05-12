"use client";

import { useRef, useState } from "react";
import { Loader2, Pause, Play, RefreshCw, Volume2 } from "lucide-react";
import type { VoiceGenerationJob } from "@/lib/domain/types";

export function VoiceButton({
  voiceJob,
  onGenerate
}: {
  voiceJob?: VoiceGenerationJob | null;
  onGenerate: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    const src = voiceJob?.audio_data_uri;
    if (!src) return;
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    if (!audioRef.current || audioRef.current.src !== src) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setPlaying(false);
      audioRef.current.onerror = () => setPlaying(false);
    }
    void audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  if (!voiceJob) {
    return (
      <button
        type="button"
        onClick={onGenerate}
        className="mt-1 grid h-7 w-7 place-items-center rounded-full bg-panel2 text-muted transition-colors hover:text-ink"
        aria-label="音声を生成"
      >
        <Volume2 className="h-3.5 w-3.5" aria-hidden />
      </button>
    );
  }

  if (voiceJob.status === "queued" || voiceJob.status === "generating") {
    return (
      <div className="mt-1 grid h-7 w-7 place-items-center rounded-full bg-panel2 text-muted" aria-label="音声生成中">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      </div>
    );
  }

  if (voiceJob.status === "failed") {
    return (
      <button
        type="button"
        onClick={onGenerate}
        className="mt-1 grid h-7 w-7 place-items-center rounded-full bg-danger/20 text-danger transition-colors hover:bg-danger/30"
        aria-label="音声生成を再試行"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      className={`mt-1 grid h-7 w-7 place-items-center rounded-full transition-colors ${playing ? "bg-brand text-canvas" : "bg-panel2 text-muted hover:text-ink"}`}
      aria-label={playing ? "一時停止" : "再生"}
    >
      {playing ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
    </button>
  );
}
