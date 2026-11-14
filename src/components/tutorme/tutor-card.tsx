import { Link } from "@tanstack/react-router";
import { BadgeCheck, Globe2, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice, isVolunteer } from "@/lib/matching";
import { subjectName } from "@/lib/subjects";
import type { Tutor } from "@/lib/tutors.functions";
import { TutorAvatar } from "./tutor-avatar";

export function TutorCard({
  tutor,
  match,
  highlightSubject,
  topMatch,
}: {
  tutor: Tutor;
  match?: number | undefined;
  highlightSubject?: string | undefined;
  topMatch?: boolean;
}) {
  const volunteer = isVolunteer(tutor);
  return (
    <Link
      to="/tutors/$slug"
      params={{ slug: tutor.slug }}
      search={{ subject: highlightSubject }}
      className="group relative flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
    >
      {topMatch && (
        <span className="absolute -top-3 left-6 rounded-full bg-leaf px-3 py-1 text-xs font-bold text-navy-foreground">
          Top match
        </span>
      )}
      <div className="flex items-start gap-4">
        <TutorAvatar name={tutor.full_name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate font-sans text-base font-bold tracking-normal">
              {tutor.full_name}
            </h3>
            {tutor.verified && (
              <BadgeCheck className="size-4 shrink-0 text-leaf" aria-label="Verified tutor" />
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{tutor.headline}</p>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-semibold">{formatPrice(tutor.price_per_hour)}</div>
          {volunteer && <div className="text-xs font-semibold text-accent-foreground">Volunteer</div>}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tutor.subjects.slice(0, 3).map((s) => (
          <Badge key={s} variant={s === highlightSubject ? "default" : "muted"}>
            {subjectName(s)}
          </Badge>
        ))}
      </div>

      <div className="mt-auto flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Star className="size-4 fill-star text-star" />
          <span className="font-semibold text-foreground">{Number(tutor.rating).toFixed(1)}</span>
          <span>({tutor.review_count})</span>
        </span>
        <span className="flex items-center gap-1">
          <Globe2 className="size-4" /> {tutor.country}
        </span>
        {typeof match === "number" && (
          <span className="font-semibold text-foreground">{match}% match</span>
        )}
      </div>
    </Link>
  );
}
