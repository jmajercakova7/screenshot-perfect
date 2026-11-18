import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, CalendarClock, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { myTutorQuery } from "@/lib/account-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/teach/inbox")({
  head: () => ({
    meta: [
      { title: "Lesson requests — TUTORME." },
      { name: "description", content: "Review lesson requests and accept or decline them." },
      { property: "og:title", content: "Lesson requests — TUTORME." },
      { property: "og:description", content: "Review lesson requests and accept or decline them." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: InboxPage,
});

type Filter = "pending" | "answered";

const STATUS = {
  pending: { label: "New", variant: "secondary" },
  accepted: { label: "Accepted", variant: "green" },
  declined: { label: "Declined", variant: "muted" },
  cancelled: { label: "Cancelled by learner", variant: "outline" },
} as const;

function InboxPage() {
  const { user } = Route.useRouteContext();
  const tutor = useQuery(myTutorQuery(user.id));
  const [filter, setFilter] = useState<Filter>("pending");

  const requests = useQuery({
    queryKey: ["inbox", tutor.data?.id],
    enabled: !!tutor.data,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_requests")
        .select("id, learner_id, subject, goal, preferred_times, status, tutor_reply, created_at, responded_at")
        .eq("tutor_id", tutor.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const ids = Array.from(new Set(data.map((r) => r.learner_id)));
      const { data: people } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as { id: string; full_name: string }[] };
      const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
      return data.map((r) => ({ ...r, learner_name: names.get(r.learner_id) || "A learner" }));
    },
  });

  if (!tutor.isLoading && !tutor.data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-4xl font-semibold">Set up your tutor profile first</h1>
        <p className="mt-3 text-muted-foreground">Learners can send you requests once your profile is live.</p>
        <Button asChild variant="hero" size="lg" className="mt-6">
          <Link to="/teach">Create tutor profile</Link>
        </Button>
      </div>
    );
  }

  const all = requests.data ?? [];
  const pendingCount = all.filter((r) => r.status === "pending").length;
  const shown = all.filter((r) => (filter === "pending" ? r.status === "pending" : r.status !== "pending"));

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 md:py-16">
      <Link to="/teach" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Teach on TUTORME.
      </Link>
      <h1 className="mt-4 text-4xl font-semibold md:text-5xl">Lesson requests</h1>

      <div className="mt-6 inline-flex rounded-full bg-muted p-1" role="tablist">
        {(["pending", "answered"] as const).map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              filter === f ? "bg-card text-foreground shadow-soft" : "text-muted-foreground",
            )}
          >
            {f === "pending" ? `New (${pendingCount})` : "Answered"}
          </button>
        ))}
      </div>

      {requests.isLoading || tutor.isLoading ? (
        <div className="mt-6 space-y-3">
          <div className="h-32 animate-pulse rounded-3xl bg-muted" />
          <div className="h-32 animate-pulse rounded-3xl bg-muted" />
        </div>
      ) : shown.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed p-12 text-center">
          <p className="font-semibold">{filter === "pending" ? "You're all caught up" : "Nothing answered yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">New lesson requests will appear here.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {shown.map((r) => (
            <RequestItem key={r.id} r={r} tutorId={tutor.data!.id} />
          ))}
        </ul>
      )}
    </div>
  );
}

type Req = {
  id: string;
  learner_name: string;
  subject: string;
  goal: string;
  preferred_times: string;
  status: string;
  tutor_reply: string | null;
  created_at: string;
  responded_at: string | null;
};

function RequestItem({ r, tutorId }: { r: Req; tutorId: string }) {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState<"accepted" | "declined" | null>(null);
  const status = STATUS[r.status as keyof typeof STATUS] ?? STATUS.pending;

  async function respond(next: "accepted" | "declined") {
    setBusy(next);
    const { error } = await supabase
      .from("lesson_requests")
      .update({ status: next, tutor_reply: reply.trim().slice(0, 500) || null })
      .eq("id", r.id);
    setBusy(null);
    if (error) return void toast.error("Couldn't update this request. It may have been cancelled.");
    toast.success(next === "accepted" ? "Lesson accepted" : "Request declined");
    queryClient.invalidateQueries({ queryKey: ["inbox", tutorId] });
    queryClient.invalidateQueries({ queryKey: ["inbox-count", tutorId] });
  }

  return (
    <li className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">{r.learner_name}</span>
        <Badge variant={status.variant}>{status.label}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">{format(new Date(r.created_at), "d MMM yyyy, HH:mm")}</span>
      </div>
      <div className="mt-1 text-sm font-semibold text-muted-foreground">{r.subject}</div>
      <p className="mt-3 whitespace-pre-line">{r.goal}</p>
      {r.preferred_times && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarClock className="size-4" /> {r.preferred_times}
        </p>
      )}

      {r.status === "pending" ? (
        <div className="mt-5 space-y-3 border-t pt-5">
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Add a short note for the learner (optional), e.g. a suggested time."
            aria-label="Reply to learner"
            className="rounded-xl bg-background"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => respond("accepted")} disabled={!!busy}>
              <Check /> {busy === "accepted" ? "Accepting…" : "Accept"}
            </Button>
            <Button variant="outline" onClick={() => respond("declined")} disabled={!!busy}>
              <X /> {busy === "declined" ? "Declining…" : "Decline"}
            </Button>
          </div>
        </div>
      ) : (
        r.tutor_reply && (
          <p className="mt-4 rounded-2xl bg-muted p-3 text-sm">
            <span className="font-semibold">Your reply:</span> {r.tutor_reply}
          </p>
        )
      )}
    </li>
  );
}
