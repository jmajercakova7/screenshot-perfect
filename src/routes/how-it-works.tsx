import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeCheck, FileCheck2, IdCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How TUTORME. works — for learners and tutors" },
      {
        name: "description",
        content:
          "Pick a subject, get matched with a verified tutor and request a lesson. Volunteer lessons are free; paid tutors set their own prices.",
      },
      { property: "og:title", content: "How TUTORME. works" },
      {
        property: "og:description",
        content: "Pick a subject, get matched with a verified tutor and request a lesson.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HowItWorks,
});

const LEARNER_STEPS = [
  ["Create a free account", "Sign up as a learner in under a minute."],
  ["Choose your subject", "From IB Mathematics AA HL to Spanish or Python."],
  ["Compare matched tutors", "Ranked by subject fit, verification and reviews. Filter free or paid."],
  ["Request a lesson", "Tell the tutor your goal and when you're free. Track it in My learning."],
];

const TUTOR_STEPS = [
  ["Apply as a tutor", "Tell us what you teach and whether you volunteer or charge."],
  ["Get verified", "We check your identity and qualifications before your badge goes live."],
  ["Set your price", "Teach for free, or choose your own hourly rate."],
  ["Teach the world", "Receive lesson requests from learners in every time zone."],
];

const CHECKS = [
  { icon: IdCard, label: "Identity check" },
  { icon: FileCheck2, label: "Qualifications reviewed" },
  { icon: ShieldCheck, label: "Background check where required" },
  { icon: BadgeCheck, label: "Verified badge on profile" },
];

function Steps({ title, steps, tone }: { title: string; steps: string[][]; tone: string }) {
  return (
    <div className="rounded-[2rem] border bg-card p-8 shadow-soft">
      <h2 className="text-3xl font-semibold">{title}</h2>
      <ol className="mt-8 space-y-6">
        {steps.map(([t, b], i) => (
          <li key={t} className="flex gap-4">
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full font-display font-semibold ${tone}`}
            >
              {i + 1}
            </span>
            <div>
              <div className="font-bold">{t}</div>
              <div className="text-sm text-muted-foreground">{b}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function HowItWorks() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16 md:py-24">
      <div className="max-w-2xl">
        <p className="text-sm font-bold tracking-widest text-leaf uppercase">How it works</p>
        <h1 className="mt-3 text-5xl font-semibold md:text-6xl">From question to lesson in four steps.</h1>
      </div>

      <div className="mt-12 grid gap-5 md:grid-cols-2">
        <Steps title="For learners" steps={LEARNER_STEPS} tone="bg-secondary text-secondary-foreground" />
        <Steps title="For tutors" steps={TUTOR_STEPS} tone="bg-accent text-accent-foreground" />
      </div>

      <div className="mt-5 grid gap-8 rounded-[2rem] bg-gradient-navy p-8 text-primary-foreground md:grid-cols-[1fr_1.2fr] md:p-12">
        <div>
          <h2 className="text-3xl font-semibold">Safety comes first</h2>
          <p className="mt-3 text-primary-foreground/75">
            Every tutor goes through verification before they can show the verified badge.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {CHECKS.map((c) => (
            <li key={c.label} className="flex items-center gap-3 rounded-2xl bg-primary-foreground/10 p-4">
              <c.icon className="size-5 text-leaf" /> <span className="font-semibold">{c.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="rounded-[2rem] bg-accent p-8">
          <h3 className="font-sans text-lg font-bold tracking-normal text-accent-foreground">Volunteer lessons</h3>
          <p className="mt-2 text-accent-foreground/80">Always free for learners. No fees, no catch.</p>
        </div>
        <div className="rounded-[2rem] bg-secondary p-8">
          <h3 className="font-sans text-lg font-bold tracking-normal text-secondary-foreground">Paid lessons</h3>
          <p className="mt-2 text-secondary-foreground/80">
            Tutors set their own price. TUTORME. keeps a 10% commission to run the platform.
          </p>
        </div>
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Button asChild variant="hero" size="lg">
          <Link to="/tutors">Find a tutor</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/auth" search={{ mode: "signup", as: "tutor" }}>
            Become a tutor
          </Link>
        </Button>
      </div>
    </div>
  );
}
