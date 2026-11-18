import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, ExternalLink, FileText, ShieldAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { isAdminQuery } from "@/lib/account-queries";
import { DOC_TYPES } from "@/lib/verification";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Review documents — TUTORME." },
      { name: "description", content: "Review tutor verification documents." },
      { property: "og:title", content: "Review documents — TUTORME." },
      { property: "og:description", content: "Review tutor verification documents." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const { user } = Route.useRouteContext();
  const admin = useQuery(isAdminQuery(user.id));
  const [tab, setTab] = useState<"pending" | "done">("pending");

  const docs = useQuery({
    queryKey: ["review-docs", tab],
    enabled: admin.data === true,
    queryFn: async () => {
      let q = supabase.from("verification_documents").select("*").order("created_at", { ascending: tab === "pending" }).limit(100);
      q = tab === "pending" ? q.eq("status", "pending") : q.neq("status", "pending");
      const { data, error } = await q;
      if (error) throw error;
      const ids = Array.from(new Set(data.map((d) => d.user_id)));
      const { data: people } = ids.length
        ? await supabase.from("profiles").select("id, full_name").in("id", ids)
        : { data: [] as { id: string; full_name: string }[] };
      const names = new Map((people ?? []).map((p) => [p.id, p.full_name]));
      return data.map((d) => ({ ...d, tutor_name: names.get(d.user_id) || "Unnamed tutor" }));
    },
  });

  if (admin.isLoading) return <div className="mx-auto max-w-4xl px-5 py-16"><div className="h-40 animate-pulse rounded-3xl bg-muted" /></div>;
  if (!admin.data) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center">
        <ShieldAlert className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-3xl font-semibold">Reviewers only</h1>
        <p className="mt-2 text-muted-foreground">This page is for the TUTORME. review team.</p>
        <Button asChild variant="outline" className="mt-6"><Link to="/dashboard">Back to My learning</Link></Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 md:py-16">
      <h1 className="text-4xl font-semibold md:text-5xl">Review documents</h1>
      <div className="mt-6 inline-flex rounded-full bg-muted p-1" role="tablist">
        {(["pending", "done"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={cn("rounded-full px-4 py-2 text-sm font-semibold", tab === t ? "bg-card shadow-soft" : "text-muted-foreground")}>
            {t === "pending" ? "Waiting for review" : "Reviewed"}
          </button>
        ))}
      </div>
      {docs.isLoading ? (
        <div className="mt-6 h-32 animate-pulse rounded-3xl bg-muted" />
      ) : !docs.data?.length ? (
        <div className="mt-6 rounded-3xl border border-dashed p-12 text-center font-semibold">Nothing here right now.</div>
      ) : (
        <ul className="mt-6 space-y-4">
          {docs.data.map((d) => <ReviewItem key={d.id} d={d} />)}
        </ul>
      )}
    </div>
  );
}

type Doc = {
  id: string;
  tutor_name: string;
  doc_type: string;
  file_name: string;
  file_path: string;
  status: string;
  reviewer_note: string | null;
  created_at: string;
};

function ReviewItem({ d }: { d: Doc }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState(d.reviewer_note ?? "");
  const [busy, setBusy] = useState(false);
  const typeTitle = DOC_TYPES.find((t) => t.type === d.doc_type)?.title ?? d.doc_type;

  async function open() {
    const { data, error } = await supabase.storage.from("verification-documents").createSignedUrl(d.file_path, 60);
    if (error || !data) return void toast.error("Couldn't open that file.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function decide(status: "approved" | "rejected") {
    if (status === "rejected" && !note.trim()) return void toast.error("Add a short note so the tutor knows what to fix.");
    setBusy(true);
    const { error } = await supabase.from("verification_documents").update({ status, reviewer_note: note.trim().slice(0, 500) || null }).eq("id", d.id);
    setBusy(false);
    if (error) return void toast.error("Couldn't save the review.");
    toast.success(status === "approved" ? "Approved" : "Rejected");
    queryClient.invalidateQueries({ queryKey: ["review-docs"] });
  }

  return (
    <li className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">{d.tutor_name}</span>
        <Badge variant="secondary">{typeTitle}</Badge>
        {d.status !== "pending" && <Badge variant={d.status === "approved" ? "green" : "destructive"}>{d.status === "approved" ? "Approved" : "Rejected"}</Badge>}
        <span className="ml-auto text-xs text-muted-foreground">{format(new Date(d.created_at), "d MMM yyyy, HH:mm")}</span>
      </div>
      <button type="button" onClick={open} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold hover:underline">
        <FileText className="size-4" /> {d.file_name} <ExternalLink className="size-3.5" />
      </button>
      {d.status === "pending" ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4">
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note for the tutor (required to reject)" aria-label="Reviewer note" className="h-10 min-w-60 flex-1 rounded-xl" />
          <Button onClick={() => decide("approved")} disabled={busy}><Check /> Approve</Button>
          <Button variant="outline" onClick={() => decide("rejected")} disabled={busy}><X /> Reject</Button>
        </div>
      ) : (
        d.reviewer_note && <p className="mt-3 rounded-xl bg-muted p-3 text-sm">{d.reviewer_note}</p>
      )}
    </li>
  );
}
