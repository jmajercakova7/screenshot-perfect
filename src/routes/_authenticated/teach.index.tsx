import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ArrowRight, ExternalLink, Inbox, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { VerificationBadge } from "@/components/tutorme/verification-badge";
import { supabase } from "@/integrations/supabase/client";
import { myTutorQuery, profileQuery } from "@/lib/account-queries";
import { SUBJECTS, SUBJECT_GROUPS } from "@/lib/subjects";

export const Route = createFileRoute("/_authenticated/teach/")({
  head: () => ({
    meta: [
      { title: "Teach on TUTORME." },
      { name: "description", content: "Set up your tutor profile, get verified and manage lesson requests." },
      { property: "og:title", content: "Teach on TUTORME." },
      { property: "og:description", content: "Set up your tutor profile, get verified and manage lesson requests." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeachPage,
});

const listingSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your name").max(100),
  headline: z.string().trim().min(5, "Headline needs at least 5 characters").max(140),
  bio: z.string().trim().min(20, "Tell learners a bit more about you (20+ characters)").max(1500),
  country: z.string().trim().min(2, "Enter your country").max(60),
  timezone: z.string().trim().min(2, "Enter your time zone, e.g. GMT+2").max(20),
  languages: z.array(z.string().trim().min(1).max(30)).min(1, "Add at least one language").max(8),
  subjects: z.array(z.string()).min(1, "Pick at least one subject").max(10),
  price_per_hour: z.number().int().min(0).max(500),
});

function slugify(name: string) {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${base || "tutor"}-${Math.random().toString(36).slice(2, 6)}`;
}

function TeachPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const tutor = useQuery(myTutorQuery(user.id));
  const profile = useQuery(profileQuery(user.id));
  const pending = useQuery({
    queryKey: ["inbox-count", tutor.data?.id],
    enabled: !!tutor.data,
    queryFn: async () => {
      const { count } = await supabase
        .from("lesson_requests")
        .select("id", { count: "exact", head: true })
        .eq("tutor_id", tutor.data!.id)
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  const [form, setForm] = useState({
    full_name: "",
    headline: "",
    bio: "",
    country: "",
    timezone: "",
    languages: "",
    subjects: [] as string[],
    volunteer: true,
    price: "20",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = tutor.data;
    if (t) {
      setForm({
        full_name: t.full_name,
        headline: t.headline,
        bio: t.bio,
        country: t.country,
        timezone: t.timezone,
        languages: t.languages.join(", "),
        subjects: t.subjects,
        volunteer: t.price_per_hour === 0,
        price: String(t.price_per_hour || 20),
      });
    } else if (profile.data?.full_name) {
      setForm((f) => ({ ...f, full_name: f.full_name || profile.data!.full_name }));
    }
  }, [tutor.data, profile.data]);

  async function save(e: FormEvent) {
    e.preventDefault();
    const parsed = listingSchema.safeParse({
      full_name: form.full_name,
      headline: form.headline,
      bio: form.bio,
      country: form.country,
      timezone: form.timezone,
      languages: form.languages.split(",").map((s) => s.trim()).filter(Boolean),
      subjects: form.subjects,
      price_per_hour: form.volunteer ? 0 : Math.round(Number(form.price)),
    });
    if (!parsed.success) return void toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
    setSaving(true);
    const { error } = tutor.data
      ? await supabase.from("tutors").update(parsed.data).eq("id", tutor.data.id)
      : await supabase.from("tutors").insert({ ...parsed.data, user_id: user.id, slug: slugify(parsed.data.full_name) });
    setSaving(false);
    if (error) return void toast.error("Couldn't save your profile. Please check the details.");
    toast.success(tutor.data ? "Profile updated" : "Your tutor profile is live!");
    queryClient.invalidateQueries({ queryKey: ["my-tutor", user.id] });
    queryClient.invalidateQueries({ queryKey: ["tutors"] });
  }

  const toggleSubject = (slug: string, on: boolean) =>
    setForm((f) => ({ ...f, subjects: on ? [...f.subjects, slug].slice(0, 10) : f.subjects.filter((s) => s !== slug) }));

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
      <p className="text-sm font-bold tracking-widest text-leaf uppercase">Teach on TUTORME.</p>
      <h1 className="mt-2 text-4xl font-semibold md:text-5xl">Share what you know.</h1>
      <p className="mt-2 max-w-xl text-muted-foreground">
        Any account can teach and learn at the same time. Set up your profile, get verified, and
        answer lesson requests.
      </p>

      {tutor.data && (
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link to="/teach/verification" className="rounded-3xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift">
            <ShieldCheck className="size-6 text-leaf" />
            <div className="mt-3 font-bold">Verification</div>
            <VerificationBadge status={tutor.data.verification_status} className="mt-2" />
          </Link>
          <Link to="/teach/inbox" className="rounded-3xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift">
            <Inbox className="size-6 text-leaf" />
            <div className="mt-3 font-bold">Lesson requests</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {pending.data ? `${pending.data} waiting for your reply` : "No new requests"}
            </div>
          </Link>
          <Link to="/tutors/$slug" params={{ slug: tutor.data.slug }} className="rounded-3xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift">
            <ExternalLink className="size-6 text-leaf" />
            <div className="mt-3 font-bold">Public profile</div>
            <div className="mt-1 text-sm text-muted-foreground">See what learners see</div>
          </Link>
        </div>
      )}

      <form onSubmit={save} className="mt-8 rounded-[2rem] border bg-card p-7 shadow-soft md:p-10">
        <h2 className="text-2xl font-semibold">{tutor.data ? "Your tutor profile" : "Create your tutor profile"}</h2>
        {!tutor.data && (
          <p className="mt-1 text-sm text-muted-foreground">
            Your profile appears in search straight away, marked "Not verified" until your documents are approved.
          </p>
        )}
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <Field label="Name" id="t-name">
            <Input id="t-name" value={form.full_name} maxLength={100} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="h-11 rounded-xl" />
          </Field>
          <Field label="Headline" id="t-headline">
            <Input id="t-headline" value={form.headline} maxLength={140} placeholder="e.g. Patient IB Maths tutor and former examiner" onChange={(e) => setForm({ ...form, headline: e.target.value })} className="h-11 rounded-xl" />
          </Field>
          <Field label="About you" id="t-bio" className="md:col-span-2">
            <Textarea id="t-bio" value={form.bio} maxLength={1500} rows={4} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="rounded-xl" />
          </Field>
          <Field label="Country" id="t-country">
            <Input id="t-country" value={form.country} maxLength={60} onChange={(e) => setForm({ ...form, country: e.target.value })} className="h-11 rounded-xl" />
          </Field>
          <Field label="Time zone" id="t-tz">
            <Input id="t-tz" value={form.timezone} maxLength={20} placeholder="GMT+2" onChange={(e) => setForm({ ...form, timezone: e.target.value })} className="h-11 rounded-xl" />
          </Field>
          <Field label="Languages (comma separated)" id="t-lang" className="md:col-span-2">
            <Input id="t-lang" value={form.languages} maxLength={200} placeholder="English, Afrikaans" onChange={(e) => setForm({ ...form, languages: e.target.value })} className="h-11 rounded-xl" />
          </Field>
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">Subjects you teach</legend>
          <div className="mt-3 grid gap-5 md:grid-cols-2">
            {SUBJECT_GROUPS.map((g) => (
              <div key={g}>
                <div className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{g}</div>
                <div className="mt-2 space-y-2">
                  {SUBJECTS.filter((s) => s.group === g).map((s) => (
                    <label key={s.slug} className="flex items-center gap-2 text-sm">
                      <Checkbox checked={form.subjects.includes(s.slug)} onCheckedChange={(v) => toggleSubject(s.slug, v === true)} />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold">Pricing</legend>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button type="button" variant={form.volunteer ? "default" : "outline"} onClick={() => setForm({ ...form, volunteer: true })}>
              Volunteer (free)
            </Button>
            <Button type="button" variant={!form.volunteer ? "default" : "outline"} onClick={() => setForm({ ...form, volunteer: false })}>
              Paid
            </Button>
            {!form.volunteer && (
              <div className="flex items-center gap-2">
                <span className="text-sm">$</span>
                <Input aria-label="Price per hour in dollars" type="number" min={1} max={500} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="h-10 w-24 rounded-xl" />
                <span className="text-sm text-muted-foreground">per hour · TUTORME. keeps 10%</span>
              </div>
            )}
          </div>
        </fieldset>

        <Button type="submit" variant="hero" size="lg" className="mt-8" disabled={saving}>
          {saving ? "Saving…" : tutor.data ? "Save changes" : "Publish my profile"} <ArrowRight />
        </Button>
      </form>
    </div>
  );
}

function Field({ label, id, className, children }: { label: string; id: string; className?: string; children: ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
