"use client";

import Link from "next/link";
import { BookOpen, Brain, Images, Settings, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "物語", icon: BookOpen },
  { href: "/memory", label: "メモリ", icon: Brain },
  { href: "/gallery", label: "画像", icon: Images },
  { href: "/settings", label: "設定", icon: Settings }
];

export function BottomNav({ active }: { active: "home" | "memory" | "gallery" | "settings" }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-canvas/92 px-3 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-2 backdrop-blur-xl">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            (active === "home" && item.href === "/") ||
            (active === "memory" && item.href === "/memory") ||
            (active === "gallery" && item.href === "/gallery") ||
            (active === "settings" && item.href === "/settings");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "grid min-h-12 place-items-center rounded-md px-2 py-1 text-[11px] text-muted",
                isActive && "bg-brand/14 text-brand"
              )}
            >
              <Icon className="mb-0.5 h-5 w-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppMark() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-md bg-brand/18 text-brand">
        <Sparkles className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <p className="text-sm font-semibold leading-tight text-ink">Story Roleplay</p>
        <p className="text-[11px] leading-tight text-muted">18+ personal PWA</p>
      </div>
    </div>
  );
}
