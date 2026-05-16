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
    <div className="grid gap-1.5 overflow-y-auto overscroll-contain rounded-lg border border-white/[0.06] bg-white/[0.03] p-2 shadow-float backdrop-blur-sm animate-slide-up">
      <div className="px-1 text-xs font-semibold text-muted">選択肢</div>
      {choices.map((choice) => (
        <button
          key={choice.id}
          type="button"
          disabled={disabled}
          onClick={() => onChoice(choice)}
          className="min-h-12 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 text-left text-sm font-medium leading-5 text-ink transition-all duration-150 hover:border-brand/30 hover:bg-white/[0.07] active:scale-[0.98] disabled:opacity-50"
        >
          {choice.label}
          {showDebug && (
            <>
              {(choice.intent || choice.tone || choice.progression || choice.agency) && (
                <span className="mt-0.5 block text-[10px] font-normal text-white/30">
                  {[choice.intent, choice.tone, choice.agency, choice.progression].filter(Boolean).join(" · ")}
                </span>
              )}
              {choice.effect && (choice.effect.affection !== 0 || choice.effect.trust !== 0 || choice.effect.tension !== 0) && (
                <span className="block text-[10px] font-normal text-white/25">
                  {[
                    choice.effect.trust !== 0 && `trust${choice.effect.trust > 0 ? "+" : ""}${choice.effect.trust}`,
                    choice.effect.affection !== 0 && `affection${choice.effect.affection > 0 ? "+" : ""}${choice.effect.affection}`,
                    choice.effect.tension !== 0 && `tension${choice.effect.tension > 0 ? "+" : ""}${choice.effect.tension}`
                  ].filter(Boolean).join(" ")}
                </span>
              )}
              {choice.why && (
                <span className="block text-[10px] font-normal text-white/20 italic">
                  {choice.why}
                </span>
              )}
            </>
          )}
        </button>
      ))}
    </div>
  );
}
