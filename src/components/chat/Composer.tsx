"use client";

import { Camera, ImagePlus, Send, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

export function Composer({
  value,
  disabled,
  allowFreeInput,
  imageEnabled,
  showAuxiliaryActions = true,
  onChange,
  onSend,
  onGenerateImage
}: {
  value: string;
  disabled?: boolean;
  allowFreeInput: boolean;
  imageEnabled: boolean;
  showAuxiliaryActions?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onGenerateImage: (kind: "scene" | "event" | "character") => void;
}) {
  const [open, setOpen] = useState(false);
  const showImageActions = showAuxiliaryActions && imageEnabled;

  useEffect(() => {
    if (!showAuxiliaryActions) setOpen(false);
  }, [showAuxiliaryActions]);

  return (
    <div className="border-t border-white/10 bg-canvas/95 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-xl">
      {open && showImageActions && (
        <div className="mb-2 grid gap-2 rounded-md border border-white/10 bg-panel p-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-muted">画像生成</span>
            <button type="button" className="grid min-h-9 min-w-9 place-items-center rounded-md bg-panel2" onClick={() => setOpen(false)} aria-label="閉じる">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <button type="button" className="min-h-11 rounded-md bg-panel2 text-sm font-semibold" onClick={() => onGenerateImage("scene")}>
            この場面を画像化
          </button>
          <button type="button" className="min-h-11 rounded-md bg-panel2 text-sm font-semibold" onClick={() => onGenerateImage("event")}>
            イベントCGを生成
          </button>
          <button type="button" className="min-h-11 rounded-md bg-panel2 text-sm font-semibold" onClick={() => onGenerateImage("character")}>
            キャラ画像を生成
          </button>
        </div>
      )}
      <div className="flex items-end gap-2">
        {showAuxiliaryActions && (
          <button
            type="button"
            disabled={!showImageActions || disabled}
            className="grid min-h-11 min-w-11 place-items-center rounded-md bg-panel2 text-muted disabled:opacity-40"
            onClick={() => setOpen((current) => !current)}
            aria-label="画像生成メニュー"
          >
            <ImagePlus className="h-5 w-5" aria-hidden />
          </button>
        )}
        <textarea
          value={value}
          disabled={!allowFreeInput || disabled}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") onSend();
          }}
          rows={1}
          placeholder={allowFreeInput ? "返答を入力" : "自由入力はOFFです"}
          className="max-h-32 min-h-11 flex-1 resize-none rounded-md border border-white/10 bg-panel2 px-3 py-2.5 text-base leading-6 text-ink outline-none focus:border-brand disabled:opacity-50"
        />
        <button
          type="button"
          disabled={disabled || !value.trim()}
          onClick={onSend}
          className="grid min-h-11 min-w-11 place-items-center rounded-md bg-brand text-canvas disabled:opacity-40"
          aria-label="送信"
        >
          {disabled ? <Sparkles className="h-5 w-5 animate-pulse" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
