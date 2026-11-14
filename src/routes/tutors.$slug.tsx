import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowLeft, BadgeCheck, Clock, Globe2, Languages, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { SubjectSelect } from "@/components/tutorme/subject-select";
import { TutorAvatar } from "@/components/tutorme/tutor-avatar";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { formatPrice, isVolunteer } from "@/lib/matching";
import { isSubject, subjectName } from "@/lib/subjects";
import { tutorQuery } from "@/lib/queries";
import type { Tutor } from "@/lib/tutors.functions";

export const Route = createFileRoute("/tutors/$slug")({
  validateSearch: (s: Record<string, unknown>): { subject?: string | undefined } => ({
    subject: isSubject(s["subject"]) ? s["subject"] : undefined,
  }),
  loader: async ({ context, params }) => {
    const tutor = await context.queryClient.ensureQueryData(tutorQuery(params.slug));
    if (!tutor) throw notFound();
    return { name: tutor.full_name, headline: tutor.headline };
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.name} — Tutor on TUTORME.` : "Tutor — TUTORME.";
    const description = loaderData?.headline ?? "A tutor on TUTORME.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-4xl font-semibold">Tutor not found</h1>
      <Button asChild className="mt-6">
        <Link to="/tutors">Browse tutors</Link>
      </Button>
    </div>
  ),
  component: TutorPage,
});

function TutorPage() {
  const { slug } = Route.useParams();
  const { subject } = Route.useSearch();
  const { data } = useSuspenseQuery(tutorQuery(slug));
  const tutor = data!;
  const volunteer = isVolunteer(tutor);

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      <Link
        to="/tutors"
        search={{ subject }}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to tutors
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border bg-card p-8 shadow-soft">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <TutorAvatar name={tutor.full_name} className="size-20 rounded-3xl text-2xl" />
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-4xl font-semibold">{tutor.full_name}</h1>
                  {tutor.verified ? (
                    <Badge variant="green">
                      <BadgeCheck /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="muted">Verification in progress</Badge>
                  )}
                </div>
                <p className="mt-2 text-lg text-muted-foreground">{tutor.headline}</p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="size-4 fill-star text-star" />
                    <b className="text-foreground">{Number(tutor.rating).toFixed(1)}</b> ·{" "}
                    {tutor.review_count} reviews
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe2 className="size-4" /> {tutor.country} ({tutor.timezone})
                  </span>
                  <span className="flex items-center gap-1">
                    <Languages className="size-4" /> {tutor.languages.join(", ")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-4" /> Replies {tutor.response_time}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border bg-card p-8 shadow-soft">
            <h2 className="text-2xl font-semibold">About</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{tutor.bio}</p>
            <h3 className="mt-8 font-sans text-sm font-bold tracking-wide text-muted-foreground uppercase">
              Teaches
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {tutor.subjects.map((s) => (
                <Badge key={s} variant={s === subject ? "default" : "secondary"} className="px-3 py-1 text-sm">
                  {subjectName(s)}
                </Badge>
              ))}
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-3">
            <Stat label="Lessons taught" value={tutor.lessons_taught.toLocaleString()} />
            <Stat label="Price" value={formatPrice(tutor.price_per_hour)} sub={volunteer ? "Volunteer tutor" : "per hour"} />
            <div className="rounded-3xl border bg-card p-5 shadow-soft">
              <div className="text-xs font-bold tracking-wide text-muted-foreground uppercase">Checks passed</div>
              <ul className="mt-2 space-y-1 text-sm">
                {tutor.verifications.map((v) => (
                  <li key={v} className="flex items-center gap-1.5">
                    <BadgeCheck className="size-4 text-leaf" /> {v}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <RequestLesson tutor={tutor} initialSubject={subject} />
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string | undefined }) {
  return (
    <div className="rounded-3xl border bg-card p-5 shadow-soft">
      <div className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{label}</div>
      <div className="mt-1 font-display text-3xl font-semibold">{value}</div>
      {sub && <div className="text-sm text-muted-foreground">{sub}</div>}
    </div>
  );
}

const requestSchema = z.object({
  subject: z.string().min(1, "Choose a subject").max(80),
  goal: z.string().trim().min(10, "Tell the tutor a little more (at least 10 characters)").max(1000),
  preferred_times: z.string().trim().max(200),
});

function RequestLesson({
  tutor,
  initialSubject,
}: {
  tutor: Tutor;
  initialSubject?: string | undefined;
}) {
  const { session, ready } = useSession();
  const navigate = useNavigate();
  const [subject, setSubject] = useState(
    initialSubject && tutor.subjects.includes(initialSubject) ? initialSubject : tutor.subjects[0],
  );
  const [goal, setGoal] = useState("");
  const [times, setTimes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const volunteer = isVolunteer(tutor);

  // Prefill the subject from the learner's saved main subject when it fits.
  useEffect(() => {
    if (!session || initialSubject) return;
    supabase
      .from("profiles")
      .select("main_subject")
      .eq("id", session.user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.main_subject && tutor.subjects.includes(data.main_subject)) setSubject(data.main_subject);
      });
  }, [session, initialSubject, tutor.subjects]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = requestSchema.safeParse({ subject, goal, preferred_times: times });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("lesson_requests").insert({
      tutor_id: tutor.id,
      learner_id: session!.user.id,
      subject: subjectName(parsed.data.subject),
      goal: parsed.data.goal,
      preferred_times: parsed.data.preferred_times,
    });
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't send your request. Please try again.");
      return;
    }
    toast.success(`Request sent to ${tutor.full_name.split(" ")[0]}!`);
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="rounded-[2rem] border bg-card p-7 shadow-lift">
      <div className="flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold">Request a lesson</h2>
        <span className="font-display text-2xl font-semibold">{formatPrice(tutor.price_per_hour)}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {volunteer
          ? "This tutor volunteers — your lesson is free."
          : "You only pay once the tutor accepts your request."}
      </p>

      {!ready ? (
        <div className="mt-6 h-40 animate-pulse rounded-2xl bg-muted" />
      ) : !session ? (
        <div className="mt-6 rounded-2xl bg-secondary p-5">
          <p className="font-semibold text-secondary-foreground">Create a free account to request a lesson.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Button asChild>
              <Link to="/auth" search={{ mode: "signup", redirect: `/tutors/${tutor.slug}` }}>
                Join free
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/auth" search={{ mode: "signin", redirect: `/tutors/${tutor.slug}` }}>
                I already have an account
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="req-subject">Subject</Label>
            <SubjectSelect
              id="req-subject"
              value={subject}
              onChange={setSubject}
              only={tutor.subjects}
              className="h-11 rounded-xl bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-goal">What do you want help with?</Label>
            <Textarea
              id="req-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. I'm struggling with integration by parts and have my mock exam in 3 weeks."
              maxLength={1000}
              rows={4}
              className="rounded-xl bg-background"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-times">When are you free?</Label>
            <Input
              id="req-times"
              value={times}
              onChange={(e) => setTimes(e.target.value)}
              placeholder="e.g. Weekday evenings after 6pm"
              maxLength={200}
              className="h-11 rounded-xl bg-background"
            />
          </div>
          <Button type="submit" variant="hero" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Send lesson request"}
          </Button>
        </form>
      )}
    </div>
  );
}
