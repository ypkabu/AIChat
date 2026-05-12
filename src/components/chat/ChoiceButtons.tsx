"use client";

import type { SuggestedReply } from "@/lib/domain/types";

export function ChoiceButtons({
  choices,
  disabled,
  showDebug,
  onChoice
}: {
  choices: SuggestedReply[];
  disabled?: boolean;
  showDebug?: boolean;
  onChoice: (choice: SuggestedReply) => void;
}) {
  if (!choices.length) return null;

  return (
    <div className="mx-3 mb-3 mt-2 grid max-h-[28dvh] gap-2 overflow-y-auto rounded-md border border-white/10 bg-panel p-2 shadow-soft">
      <div className="px-1 text-xs font-semibold text-muted">選択肢</div>
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          disabled={disabled}
          onClick={() => onChoice(choice)}
          className="min-h-12 rounded-md border border-white/10 bg-panel2 px-3 text-left text-sm font-medium leading-5 text-ink disabled:opacity-50"
        >
          {choice.label}
          {showDebug && (choice.intent || choice.tone || choice.progression) && (
            <span className="mt-0.5 block text-[10px] font-normal text-white/30">
              {[choice.intent, choice.tone, choice.progression].filter(Boolean).join(" · ")}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
