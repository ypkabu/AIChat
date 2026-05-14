import { cn } from "@/lib/utils";

type AvatarProps = {
  name?: string | null;
  src?: string | null;
  color?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl"
};

export function Avatar({ name, src, color, size = "md", className }: AvatarProps) {
  const initial = (name?.trim()?.[0] || "?").toUpperCase();
  return (
    <div
      className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-panel2 font-semibold text-ink", sizes[size], className)}
      style={{ backgroundColor: src ? undefined : color ?? "#2f3542" }}
      aria-label={name ?? "avatar"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <span>{initial}</span>}
    </div>
  );
}
