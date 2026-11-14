export type PriceFilter = "all" | "free" | "paid";

export type MatchableTutor = {
  subjects: string[];
  price_per_hour: number;
  rating: number;
  review_count: number;
  verified: boolean;
  full_name: string;
};

export type MatchCriteria = {
  subject?: string | undefined;
  price?: PriceFilter | undefined;
  query?: string | undefined;
};

/** A volunteer tutor teaches for free. */
export function isVolunteer(t: Pick<MatchableTutor, "price_per_hour">) {
  return t.price_per_hour === 0;
}

/**
 * Score 0–100 for how well a tutor fits the learner. Subject fit dominates,
 * then trust (verification), then quality (rating, weighted by review volume).
 */
export function matchScore(t: MatchableTutor, c: MatchCriteria): number {
  let score = 0;
  if (c.subject) {
    if (!t.subjects.includes(c.subject)) return 0;
    score += 50;
  } else {
    score += 30;
  }
  if (t.verified) score += 20;
  score += Math.max(0, Math.min(5, Number(t.rating)) - 4) * 15; // up to 15 for 5.0
  score += Math.min(15, Math.log10(1 + t.review_count) * 6.5);
  return Math.round(Math.min(100, score));
}

/** Filter by subject, price type and name/keyword, then rank best match first. */
export function rankTutors<T extends MatchableTutor & { headline?: string }>(
  tutors: T[],
  c: MatchCriteria,
): Array<T & { match: number }> {
  const q = c.query?.trim().toLowerCase();
  return tutors
    .filter((t) => (c.subject ? t.subjects.includes(c.subject) : true))
    .filter((t) => {
      if (c.price === "free") return isVolunteer(t);
      if (c.price === "paid") return !isVolunteer(t);
      return true;
    })
    .filter((t) =>
      q ? `${t.full_name} ${t.headline ?? ""}`.toLowerCase().includes(q) : true,
    )
    .map((t) => ({ ...t, match: matchScore(t, c) }))
    .sort((a, b) => b.match - a.match || a.price_per_hour - b.price_per_hour);
}

export function formatPrice(pricePerHour: number) {
  return pricePerHour === 0 ? "Free" : `$${pricePerHour}/hr`;
}
