import { cn } from "@/lib/utils";

const TONES = [
  "bg-secondary text-secondary-foreground",
  "bg-accent text-accent-foreground",
  "bg-primary text-primary-foreground",
];

export function TutorAvatar({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const tone = TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex size-14 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-semibold",
        tone,
        className,
      )}
    >
      {initials}
    </div>
  );
}
