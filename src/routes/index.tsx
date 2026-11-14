import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, BadgeCheck, Globe2, HeartHandshake, Search, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubjectSelect } from "@/components/tutorme/subject-select";
import heroImage from "@/assets/hero-learning.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TUTORME. — Learn together. Grow together." },
      {
        name: "description",
        content:
          "Find free volunteer or paid tutors worldwide. Verified tutors, smart matching, and lessons for anyone who wants to learn.",
      },
      { property: "og:title", content: "TUTORME. — Learn together. Grow together." },
      {
        property: "og:description",
        content: "Free and paid tutoring for anyone, anywhere, with verified tutors and smart matching.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const PILLARS = [
  {
    icon: HeartHandshake,
    title: "Accessibility",
    body: "Volunteer tutors teach for free, so money is never the reason someone stops learning.",
  },
  {
    icon: Globe2,
    title: "Global community",
    body: "Learners and tutors connect across countries, languages and time zones.",
  },
  {
    icon: BadgeCheck,
    title: "Trust",
    body: "Tutor identities and qualifications are checked before the verified badge appears.",
  },
  {
    icon: Sparkles,
    title: "Personalisation",
    body: "Matching ranks tutors by your subject, budget and what matters most to you.",
  },
];

function Home() {
  const navigate = useNavigate();
  const [subject, setSubject] = useState<string>("ib-math-aa-hl");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-sky">
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:py-24 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="animate-rise">
            <span className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3 py-1 text-xs font-semibold text-muted-foreground">
              <span className="size-2 rounded-full bg-leaf" /> Free & paid tutoring, worldwide
            </span>
            <h1 className="mt-6 text-5xl leading-[1.02] font-semibold md:text-7xl">
              Learn together.
              <br />
              Grow <em className="font-normal text-leaf">together.</em>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Making education more accessible, one connection at a time. Find a verified tutor
              for any subject — many teach for free.
            </p>

            <form
              className="mt-8 flex max-w-xl flex-col gap-2 rounded-3xl border bg-card p-2 shadow-lift sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/tutors", search: { subject } });
              }}
            >
              <SubjectSelect
                value={subject}
                onChange={setSubject}
                placeholder="What do you want to learn?"
                className="h-12 flex-1 rounded-2xl border-0 bg-transparent text-base shadow-none focus:ring-0"
              />
              <Button type="submit" variant="hero" size="lg">
                <Search /> Find tutors
              </Button>
            </form>
            <p className="mt-4 text-sm text-muted-foreground">
              Try <span className="font-semibold text-foreground">IB Mathematics AA HL</span> — 4
              tutors ready, 1 volunteer.
            </p>
          </div>

          <div className="relative animate-rise [animation-delay:150ms]">
            <img
              src={heroImage}
              alt="A student learning maths with a tutor on a video call"
              width={1280}
              height={1440}
              className="aspect-[8/9] w-full rounded-[2rem] object-cover shadow-lift"
            />
            <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-lift md:-left-10">
              <div className="flex size-11 items-center justify-center rounded-xl bg-accent font-display font-semibold text-accent-foreground">
                AO
              </div>
              <div>
                <div className="flex items-center gap-1 text-sm font-bold">
                  Amara Okafor <BadgeCheck className="size-4 text-leaf" />
                </div>
                <div className="text-xs text-muted-foreground">IB Maths AA HL · 96% match</div>
              </div>
            </div>
            <div className="absolute top-6 -right-2 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lift md:-right-6">
              <Star className="size-4 fill-star text-star" /> 4.9 average rating
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-bold tracking-widest text-leaf uppercase">Why TUTORME.</p>
          <h2 className="mt-3 text-4xl font-semibold md:text-5xl">
            Good teaching shouldn't depend on where you live or what you can pay.
          </h2>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-3xl border bg-card p-6 shadow-soft">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <p.icon className="size-5" />
              </div>
              <h3 className="mt-5 font-sans text-lg font-bold tracking-normal">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Free vs paid */}
      <section className="mx-auto grid max-w-6xl gap-5 px-5 pb-20 md:grid-cols-2 md:pb-28">
        <div className="rounded-[2rem] bg-accent p-8 md:p-10">
          <p className="text-sm font-bold text-accent-foreground">Volunteer tutoring</p>
          <h3 className="mt-3 text-3xl font-semibold text-accent-foreground">Free, always.</h3>
          <p className="mt-3 max-w-sm text-accent-foreground/80">
            Students, graduates and professionals give their time to help learners who need it
            most.
          </p>
          <Button asChild variant="default" className="mt-6">
            <Link to="/tutors" search={{ price: "free" }}>
              Browse free tutors <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="rounded-[2rem] bg-secondary p-8 md:p-10">
          <p className="text-sm font-bold text-secondary-foreground">Paid tutoring</p>
          <h3 className="mt-3 text-3xl font-semibold text-secondary-foreground">
            Tutors set their price.
          </h3>
          <p className="mt-3 max-w-sm text-secondary-foreground/80">
            Experienced teachers and examiners, from $15 an hour. Compare ratings, credentials and
            price side by side.
          </p>
          <Button asChild variant="default" className="mt-6">
            <Link to="/tutors" search={{ price: "paid" }}>
              Browse expert tutors <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20 md:pb-28">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 rounded-[2rem] bg-gradient-navy p-10 text-primary-foreground md:flex-row md:items-center md:p-14">
          <div>
            <h2 className="text-4xl font-semibold md:text-5xl">Ready to start?</h2>
            <p className="mt-3 max-w-md text-primary-foreground/75">
              Create a free account, pick your subject and request your first lesson in minutes.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="green">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start learning
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/auth" search={{ mode: "signup", as: "tutor" }}>
                Become a tutor
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
