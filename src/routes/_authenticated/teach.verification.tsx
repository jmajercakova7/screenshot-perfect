import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, FileText, Lock, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerificationBadge } from "@/components/tutorme/verification-badge";
import { supabase } from "@/integrations/supabase/client";
import { myDocumentsQuery } from "@/lib/account-queries";
import {
  DOC_STATUS_LABEL,
  DOC_TYPES,
  latestByType,
  overallStatus,
  validateFile,
  type DocStatus,
  type DocType,
} from "@/lib/verification";

const BUCKET = "verification-documents";

export const Route = createFileRoute("/_authenticated/teach/verification")({
  head: () => ({
    meta: [
      { title: "Verification — TUTORME." },
      { name: "description", content: "Upload your verification documents securely." },
      { property: "og:title", content: "Verification — TUTORME." },
      { property: "og:description", content: "Upload your verification documents securely." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VerificationPage,
});

const DOC_VARIANT: Record<DocStatus, "secondary" | "green" | "destructive"> = {
  pending: "secondary",
  approved: "green",
  rejected: "destructive",
};

function VerificationPage() {
  const { user } = Route.useRouteContext();
  const docs = useQuery(myDocumentsQuery(user.id));
  const list = docs.data ?? [];
  const latest = latestByType(list);
  const status = overallStatus(list);

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 md:py-16">
      <Link to="/teach" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Teach on TUTORME.
      </Link>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold md:text-5xl">Verification</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Upload proof of identity and your qualifications. Once both are approved, a verified
            badge appears on your public profile.
          </p>
        </div>
        {!docs.isLoading && <VerificationBadge status={status} className="px-3 py-1 text-sm" />}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
        <Lock className="mt-0.5 size-4 shrink-0" />
        <p>
          Your files are stored privately. Only you and the TUTORME. review team can open them —
          learners never see your documents, only your verification status.
        </p>
      </div>

      <div className="mt-8 space-y-5">
        {DOC_TYPES.map((t) => (
          <DocSection
            key={t.type}
            userId={user.id}
            type={t.type}
            title={t.title}
            help={t.help}
            required={t.required}
            latestStatus={latest[t.type]?.status as DocStatus | undefined}
            history={list.filter((d) => d.doc_type === t.type)}
          />
        ))}
      </div>
    </div>
  );
}

type DocRow = {
  id: string;
  file_name: string;
  file_path: string;
  status: string;
  reviewer_note: string | null;
  created_at: string;
};

function DocSection({
  userId,
  type,
  title,
  help,
  required,
  latestStatus,
  history,
}: {
  userId: string;
  type: DocType;
  title: string;
  help: string;
  required: boolean;
  latestStatus: DocStatus | undefined;
  history: DocRow[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-documents", userId] });
    queryClient.invalidateQueries({ queryKey: ["my-tutor", userId] });
  };

  async function upload(file: File) {
    const problem = validateFile(file);
    if (problem) return void toast.error(problem);
    setBusy(true);
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = `${userId}/${type}/${crypto.randomUUID()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setBusy(false);
      return void toast.error("Upload failed. Please try again.");
    }
    const { error } = await supabase.from("verification_documents").insert({
      user_id: userId,
      doc_type: type,
      file_path: path,
      file_name: file.name.slice(0, 200),
      mime_type: file.type,
      size_bytes: file.size,
    });
    if (error) {
      await supabase.storage.from(BUCKET).remove([path]);
      setBusy(false);
      return void toast.error("Couldn't save your document. Please try again.");
    }
    setBusy(false);
    toast.success("Document uploaded — it's now under review.");
    refresh();
  }

  async function remove(doc: DocRow) {
    const { error } = await supabase.from("verification_documents").delete().eq("id", doc.id);
    if (error) return void toast.error("Couldn't remove that document.");
    await supabase.storage.from(BUCKET).remove([doc.file_path]);
    refresh();
  }

  async function view(doc: DocRow) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(doc.file_path, 60);
    if (error || !data) return void toast.error("Couldn't open that file.");
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  const canUpload = latestStatus !== "pending" && latestStatus !== "approved";

  return (
    <section className="rounded-[2rem] border bg-card p-7 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-sans text-lg font-bold tracking-normal">{title}</h2>
            {required ? <Badge variant="outline">Required</Badge> : <Badge variant="muted">Optional</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{help}</p>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            aria-label={`Upload ${title}`}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
          />
          {canUpload && (
            <Button variant={latestStatus === "rejected" ? "default" : "outline"} onClick={() => inputRef.current?.click()} disabled={busy}>
              <Upload /> {busy ? "Uploading…" : latestStatus === "rejected" ? "Upload a new file" : "Upload file"}
            </Button>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <ul className="mt-5 space-y-2">
          {history.map((doc) => {
            const s = doc.status as DocStatus;
            return (
              <li key={doc.id} className="rounded-2xl border bg-background p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <FileText className="size-5 text-muted-foreground" />
                  <button type="button" onClick={() => view(doc)} className="min-w-0 flex-1 truncate text-left text-sm font-semibold hover:underline">
                    {doc.file_name}
                  </button>
                  <span className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "d MMM yyyy")}</span>
                  <Badge variant={DOC_VARIANT[s] ?? "secondary"}>{DOC_STATUS_LABEL[s] ?? s}</Badge>
                  {s === "pending" && (
                    <Button variant="ghost" size="icon" aria-label="Remove document" onClick={() => remove(doc)}>
                      <Trash2 />
                    </Button>
                  )}
                </div>
                {doc.reviewer_note && (
                  <p className="mt-2 rounded-xl bg-muted p-3 text-sm">
                    <span className="font-semibold">Reviewer note:</span> {doc.reviewer_note}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
