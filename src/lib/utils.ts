import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function nowIso() {
  return new Date().toISOString();
}

export function newId(prefix?: string) {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  return prefix ? `${prefix}-${id}` : id;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function splitTags(value: string) {
  return value
    .split(/[,\s、]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function joinTags(tags: string[]) {
  return tags.join(" ");
}

export function formatDate(value?: string | null) {
  if (!value) return "未プレイ";
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function estimateTokenLikeCount(text: string) {
  return Math.max(1, Math.ceil(text.length / 2));
}

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
