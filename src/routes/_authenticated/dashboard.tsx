import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import { ArrowRight, BadgeCheck, CalendarClock, Hourglass, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SubjectSelect } from "@/components/tutorme/subject-select";
import { TutorAvatar } from "@/components/tutorme/tutor-avatar";
import { supabase } from "@/integrations/supabase/client";
import { subjectName } from "@/lib/subjects";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My learning — TUTORME." },
      { name: "description", content: "Your subjects and lesson requests on TUTORME." },
      { property: "og:title", content: "My learning — TUTORME." },
      { property: "og:description", content: "Your subjects and lesson requests on TUTORME." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const STATUS: Record<string, { label: string; variant: "secondary" | "green" | "muted" | "outline" }> = {
  pending: { label: "Waiting for tutor", variant: "secondary" },
  accepted: { label: "Accepted", variant: "green" },
  declined: { label: "Declined", variant: "muted" },
  cancelled: { label: "Cancelled", variant: "outline" },
};

function Dashboard() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();

  const profile = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const requests = useQuery({
    queryKey: ["lesson_requests", user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_requests")
        .select("id, subject, goal, preferred_times, status, created_at, tutors(full_name, slug, price_per_hour)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const setSubject = useMutation({
    mutationFn: async (slug: string) => {
      const { error } = await supabase.from("profiles").update({ main_subject: slug }).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile", user.id] }),
    onError: () => toast.error("Couldn't save your subject."),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lesson_requests").update({ status: "cancelled" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Request cancelled");
      queryClient.invalidateQueries({ queryKey: ["lesson_requests", user.id] });
    },
  });

  const firstName = (profile.data?.full_name || user.email || "").split(/[ @]/)[0];
  const isTutor = profile.data?.account_type === "tutor";
  const mainSubject = profile.data?.main_subject ?? undefined;

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
      <p className="text-sm font-bold tracking-widest text-leaf uppercase">My learning</p>
      <h1 className="mt-2 text-4xl font-semibold md:text-5xl">
        {profile.isLoading ? "Welcome" : `Hi ${firstName || "there"}`}
        <span className="text-leaf">.</span>
      </h1>

      {isTutor && (
        <div className="mt-8 flex flex-col gap-4 rounded-[2rem] bg-accent p-7 text-accent-foreground md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <BadgeCheck className="mt-1 size-6 shrink-0" />
            <div>
              <h2 className="font-sans text-lg font-bold tracking-normal">Your tutor application is in</h2>
              <p className="text-accent-foreground/80">
                Next step is verification of your identity and qualifications. Meanwhile, you can
                still learn on TUTORME. too.
              </p>
            </div>
          </div>
          <Badge variant="default" className="self-start md:self-center">
            <Hourglass /> Verification pending
          </Badge>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr]">
        <section className="h-fit rounded-[2rem] border bg-card p-7 shadow-soft">
          <h2 className="text-2xl font-semibold">What are you learning?</h2>
          <p className="mt-1 text-sm text-muted-foreground">We'll use this to match you with tutors.</p>
          <SubjectSelect
            value={mainSubject}
            onChange={(slug) => setSubject.mutate(slug)}
            placeholder="Choose your main subject"
            className="mt-5 h-11 rounded-xl bg-background"
          />
          <Button asChild variant="hero" size="lg" className="mt-4 w-full">
            <Link to="/tutors" search={{ subject: mainSubject }}>
              <Search /> {mainSubject ? `Find ${subjectName(mainSubject)} tutors` : "Find tutors"}
            </Link>
          </Button>
        </section>

        <section className="rounded-[2rem] border bg-card p-7 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Lesson requests</h2>
            {requests.data && requests.data.length > 0 && (
              <span className="text-sm text-muted-foreground">{requests.data.length} total</span>
            )}
          </div>

          {requests.isLoading ? (
            <div className="mt-6 space-y-3">
              <div className="h-24 animate-pulse rounded-2xl bg-muted" />
              <div className="h-24 animate-pulse rounded-2xl bg-muted" />
            </div>
          ) : !requests.data || requests.data.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed p-10 text-center">
              <p className="font-semibold">No lesson requests yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Find a tutor you like and send your first request.
              </p>
              <Button asChild variant="outline" className="mt-5">
                <Link to="/tutors" search={{ subject: mainSubject }}>
                  Browse tutors <ArrowRight />
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {requests.data.map((r) => {
                const status = STATUS[r.status] ?? { label: "Waiting for tutor", variant: "secondary" as const };
                return (
                  <li key={r.id} className="rounded-2xl border bg-background p-5">
                    <div className="flex items-start gap-4">
                      {r.tutors && <TutorAvatar name={r.tutors.full_name} className="size-12 rounded-xl text-base" />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {r.tutors ? (
                            <Link to="/tutors/$slug" params={{ slug: r.tutors.slug }} className="font-bold hover:underline">
                              {r.tutors.full_name}
                            </Link>
                          ) : (
                            <span className="font-bold">Tutor</span>
                          )}
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <div className="mt-0.5 text-sm text-muted-foreground">
                          {r.subject} · {r.tutors?.price_per_hour === 0 ? "Free lesson" : `$${r.tutors?.price_per_hour}/hr`}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm">{r.goal}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span>Sent {format(new Date(r.created_at), "d MMM yyyy")}</span>
                          {r.preferred_times && (
                            <span className="flex items-center gap-1">
                              <CalendarClock className="size-3.5" /> {r.preferred_times}
                            </span>
                          )}
                        </div>
                      </div>
                      {r.status === "pending" && (
                        <Button variant="ghost" size="sm" onClick={() => cancel.mutate(r.id)} disabled={cancel.isPending}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
