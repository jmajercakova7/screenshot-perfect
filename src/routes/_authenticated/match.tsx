import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { BadgeCheck, Globe2, Sparkles, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SubjectSelect } from "@/components/tutorme/subject-select";
import { TutorAvatar } from "@/components/tutorme/tutor-avatar";
import { profileQuery } from "@/lib/account-queries";
import { formatPrice } from "@/lib/matching";
import { BUDGETS, preferencesSchema, type LessonPreferences } from "@/lib/preferences";
import { recommendTutors, type Recommendation } from "@/lib/recommend.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/match")({
  head: () => ({
    meta: [
      { title: "AI tutor match — TUTORME." },
      { name: "description", content: "Tell us what you need and AI recommends the best-fit tutors, with reasons." },
      { property: "og:title", content: "AI tutor match — TUTORME." },
      { property: "og:description", content: "Tell us what you need and AI recommends the best-fit tutors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MatchPage,
});

const EMPTY: LessonPreferences = {
  subject: "ib-math-aa-hl",
  goal: "",
  budget: "any",
  languages: "",
  availability: "",
  learning_style: "",
};

function MatchPage() {
  const { user } = Route.useRouteContext();
  const profile = useQuery(profileQuery(user.id));
  const recommend = useServerFn(recommendTutors);
  const [prefs, setPrefs] = useState<LessonPreferences>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ summary: string; recommendations: Recommendation[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Prefill from saved preferences.
  useEffect(() => {
    const saved = preferencesSchema.partial().safeParse(profile.data?.lesson_preferences ?? {});
    const subject = profile.data?.main_subject;
    setPrefs((p) => ({
      ...p,
      ...(saved.success ? Object.fromEntries(Object.entries(saved.data).filter(([, v]) => v !== undefined)) : {}),
      ...(subject && !(saved.success && saved.data.subject) ? { subject } : {}),
    }));
  }, [profile.data]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = preferencesSchema.safeParse(prefs);
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
    setLoading(true);
    setError(null);
    try {
      const res = await recommend({ data: parsed.data });
      if (res.ok) setResult({ summary: res.summary, recommendations: res.recommendations });
      else setError(res.error);
    } catch {
      setError("AI matching didn't finish. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
      <p className="flex items-center gap-2 text-sm font-bold tracking-widest text-leaf uppercase">
        <Sparkles className="size-4" /> AI tutor match
      </p>
      <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Tell us what you need.</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Our AI reads every tutor's profile and picks the ones who fit you best, and explains why.
      </p>

      <div className="mt-10 grid gap-8 lg:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="h-fit space-y-4 rounded-[2rem] border bg-card p-7 shadow-soft lg:sticky lg:top-24">
          <div className="space-y-1.5">
            <Label htmlFor="m-subject">Subject</Label>
            <SubjectSelect id="m-subject" value={prefs.subject} onChange={(subject) => setPrefs({ ...prefs, subject })} className="h-11 rounded-xl bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-goal">What do you want to achieve?</Label>
            <Textarea id="m-goal" rows={3} maxLength={500} value={prefs.goal} onChange={(e) => setPrefs({ ...prefs, goal: e.target.value })} placeholder="e.g. Move from a 5 to a 7 in Paper 3 before May exams. I struggle with proofs." className="rounded-xl bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label>Budget</Label>
            <div className="grid grid-cols-2 gap-2">
              {BUDGETS.map((b) => (
                <button
                  key={b.value}
                  type="button"
                  aria-pressed={prefs.budget === b.value}
                  onClick={() => setPrefs({ ...prefs, budget: b.value })}
                  className={cn(
                    "rounded-xl border-2 px-3 py-2 text-sm font-semibold transition-colors",
                    prefs.budget === b.value ? "border-primary bg-secondary/60" : "border-border hover:border-input",
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-lang">Preferred languages</Label>
            <Input id="m-lang" maxLength={100} value={prefs.languages} onChange={(e) => setPrefs({ ...prefs, languages: e.target.value })} placeholder="e.g. English, German" className="h-11 rounded-xl bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-avail">When are you free?</Label>
            <Input id="m-avail" maxLength={120} value={prefs.availability} onChange={(e) => setPrefs({ ...prefs, availability: e.target.value })} placeholder="e.g. Weekday evenings, I'm in GMT+2" className="h-11 rounded-xl bg-background" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-style">How do you like to learn?</Label>
            <Input id="m-style" maxLength={200} value={prefs.learning_style} onChange={(e) => setPrefs({ ...prefs, learning_style: e.target.value })} placeholder="e.g. Lots of past papers, patient explanations" className="h-11 rounded-xl bg-background" />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
            <Sparkles /> {loading ? "Finding your best matches…" : "Find my best tutors"}
          </Button>
        </form>

        <div>
          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-[2rem] bg-muted" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-[2rem] border border-dashed p-10 text-center">
              <p className="font-semibold">{error}</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/tutors" search={{ subject: prefs.subject }}>Browse tutors instead</Link>
              </Button>
            </div>
          ) : result ? (
            <div className="space-y-5">
              {result.summary && (
                <div className="flex gap-3 rounded-[2rem] bg-accent p-6 text-accent-foreground">
                  <Sparkles className="mt-0.5 size-5 shrink-0" />
                  <p className="font-medium">{result.summary}</p>
                </div>
              )}
              {result.recommendations.map((r, i) => (
                <RecommendationCard key={r.slug} r={r} rank={i + 1} subject={prefs.subject} />
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-[2rem] border border-dashed p-10 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <Sparkles className="size-6" />
              </div>
              <p className="mt-4 font-semibold">Your matches will appear here</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Fill in your needs and we'll recommend up to three tutors, with a clear reason for each.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ r, rank, subject }: { r: Recommendation; rank: number; subject: string }) {
  return (
    <article className="rounded-[2rem] border bg-card p-7 shadow-soft">
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative">
          <TutorAvatar name={r.full_name} />
          <span className="absolute -top-2 -left-2 flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {rank}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="font-sans text-lg font-bold tracking-normal">{r.full_name}</h2>
            {r.verified && <BadgeCheck className="size-4 text-leaf" aria-label="Verified tutor" />}
          </div>
          <p className="text-sm text-muted-foreground">{r.headline}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="size-4 fill-star text-star" /> {r.rating.toFixed(1)} ({r.review_count})
            </span>
            <span className="flex items-center gap-1">
              <Globe2 className="size-4" /> {r.country} · {r.languages.join(", ")}
            </span>
          </div>
        </div>
        <div className="font-display text-2xl font-semibold">{formatPrice(r.price_per_hour)}</div>
      </div>
      <div className="mt-5 rounded-2xl bg-secondary/60 p-4">
        <div className="text-xs font-bold tracking-wide text-secondary-foreground uppercase">Why this tutor</div>
        <p className="mt-1 text-sm leading-relaxed">{r.reason}</p>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {r.highlights.map((h) => (
          <Badge key={h} variant="green">{h}</Badge>
        ))}
        <Button asChild className="ml-auto">
          <Link to="/tutors/$slug" params={{ slug: r.slug }} search={{ subject }}>
            View & request lesson
          </Link>
        </Button>
      </div>
    </article>
  );
}
