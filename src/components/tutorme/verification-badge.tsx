import { BadgeCheck, CircleAlert, Hourglass, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, type VerificationStatus } from "@/lib/verification";

const VARIANT = {
  verified: "green",
  in_review: "secondary",
  action_needed: "destructive",
  not_started: "muted",
} as const;

const ICON = {
  verified: BadgeCheck,
  in_review: Hourglass,
  action_needed: CircleAlert,
  not_started: CircleDashed,
};

export function VerificationBadge({ status, className }: { status: string; className?: string }) {
  const s = (status in STATUS_LABEL ? status : "not_started") as VerificationStatus;
  const Icon = ICON[s];
  return (
    <Badge variant={VARIANT[s]} className={className}>
      <Icon /> {STATUS_LABEL[s]}
    </Badge>
  );
}
