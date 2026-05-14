"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  imageUrl: string | null;
  isGenerating?: boolean;
  transition?: "fade" | "instant";
  overlayOpacity?: number;
};

export function SceneBackground({
  imageUrl,
  isGenerating = false,
  transition = "fade",
  overlayOpacity = 60
}: Props) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(imageUrl);
  const [incomingUrl, setIncomingUrl] = useState<string | null>(null);
  const [crossfading, setCrossfading] = useState(false);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (imageUrl === currentUrl) return;

    if (fadeTimer.current) {
      clearTimeout(fadeTimer.current);
      fadeTimer.current = null;
    }

    if (transition === "instant" || !currentUrl) {
      setCurrentUrl(imageUrl);
      setIncomingUrl(null);
      setCrossfading(false);
      return;
    }

    // Start crossfade: incoming image fades in over the current
    setIncomingUrl(imageUrl);
    setCrossfading(true);
    fadeTimer.current = setTimeout(() => {
      setCurrentUrl(imageUrl);
      setIncomingUrl(null);
      setCrossfading(false);
    }, 700);
  }, [imageUrl, transition, currentUrl]);

  useEffect(() => {
    return () => {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {/* Current/base image */}
      {currentUrl ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`base-${currentUrl}`}
            src={currentUrl}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              crossfading ? "opacity-0" : "opacity-100"
            }`}
            loading="eager"
            decoding="async"
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-canvas" />
      )}

      {/* Incoming image (crossfade target) */}
      {incomingUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={`incoming-${incomingUrl}`}
            src={incomingUrl}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
              crossfading ? "opacity-100" : "opacity-0"
            }`}
            loading="eager"
            decoding="async"
          />
        </>
      )}

      {/* Dark overlay for text readability */}
      <div
        className="absolute inset-0"
        style={{ background: `rgba(0,0,0,${overlayOpacity / 100})` }}
      />

      {/* Bottom gradient: makes chat input / choices more readable */}
      <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-canvas/95 via-canvas/60 to-transparent" />

      {/* Top gradient: keeps header legible */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-canvas/70 to-transparent" />

      {/* Generating indicator – subtle pulse ring */}
      {isGenerating && (
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] text-white/70 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
          生成中
        </div>
      )}
    </div>
  );
}
