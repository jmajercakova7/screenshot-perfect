import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("font-display text-2xl font-semibold tracking-tight", className)}>
      TUTORME<span className="text-leaf">.</span>
    </Link>
  );
}
