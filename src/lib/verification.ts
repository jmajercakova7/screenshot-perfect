export type DocType = "identity" | "qualification" | "background_check";
export type DocStatus = "pending" | "approved" | "rejected";
export type VerificationStatus = "not_started" | "in_review" | "action_needed" | "verified";

export const DOC_TYPES: { type: DocType; title: string; help: string; required: boolean }[] = [
  {
    type: "identity",
    title: "Proof of identity",
    help: "Passport, national ID card or driver's licence.",
    required: true,
  },
  {
    type: "qualification",
    title: "Qualifications",
    help: "Degree, teaching licence, student ID or exam certificate.",
    required: true,
  },
  {
    type: "background_check",
    title: "Background check",
    help: "Optional. A police clearance or safeguarding certificate.",
    required: false,
  },
];

export const ALLOWED_MIME = ["application/pdf", "image/jpeg", "image/png"] as const;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const STATUS_LABEL: Record<VerificationStatus, string> = {
  not_started: "Not started",
  in_review: "Under review",
  action_needed: "Action needed",
  verified: "Verified",
};

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  pending: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

type Doc = { doc_type: string; status: string; created_at: string };

/** Latest upload for each document type. */
export function latestByType<T extends Doc>(docs: T[]): Partial<Record<DocType, T>> {
  const out: Partial<Record<DocType, T>> = {};
  for (const d of docs) {
    const k = d.doc_type as DocType;
    const cur = out[k];
    if (!cur || d.created_at > cur.created_at) out[k] = d;
  }
  return out;
}

/**
 * Overall status: verified once the latest identity AND qualification documents
 * are approved; any rejected latest document means action is needed.
 * Mirrors public.refresh_tutor_verification in the database.
 */
export function overallStatus(docs: Doc[]): VerificationStatus {
  const latest = Object.values(latestByType(docs));
  if (latest.length === 0) return "not_started";
  if (latest.some((d) => d.status === "rejected")) return "action_needed";
  const map = latestByType(docs);
  if (map.identity?.status === "approved" && map.qualification?.status === "approved") return "verified";
  return "in_review";
}

export function validateFile(file: { type: string; size: number }): string | null {
  if (!(ALLOWED_MIME as readonly string[]).includes(file.type)) return "Upload a PDF, JPG or PNG file.";
  if (file.size <= 0) return "That file is empty.";
  if (file.size > MAX_FILE_BYTES) return "Files must be 10 MB or smaller.";
  return null;
}
