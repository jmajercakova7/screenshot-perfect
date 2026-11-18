import { describe, expect, it } from "vitest";
import { overallStatus, validateFile } from "./verification";

const d = (doc_type: string, status: string, created_at: string) => ({ doc_type, status, created_at });

describe("tutor verification status", () => {
  it("is not started with no documents", () => {
    expect(overallStatus([])).toBe("not_started");
  });

  it("is verified only when identity and qualifications are both approved", () => {
    expect(overallStatus([d("identity", "approved", "1")])).toBe("in_review");
    expect(
      overallStatus([d("identity", "approved", "1"), d("qualification", "approved", "2")]),
    ).toBe("verified");
  });

  it("needs action when the latest document of a type was rejected", () => {
    expect(
      overallStatus([d("identity", "approved", "1"), d("qualification", "rejected", "2")]),
    ).toBe("action_needed");
  });

  it("uses the newest upload: a re-upload after rejection goes back to review", () => {
    expect(
      overallStatus([
        d("identity", "approved", "1"),
        d("qualification", "rejected", "2"),
        d("qualification", "pending", "3"),
      ]),
    ).toBe("in_review");
  });
});

describe("verification file rules", () => {
  it("accepts PDF, JPG and PNG up to 10 MB", () => {
    expect(validateFile({ type: "application/pdf", size: 10 * 1024 * 1024 })).toBeNull();
    expect(validateFile({ type: "image/png", size: 1000 })).toBeNull();
  });
  it("rejects other file types and files over 10 MB", () => {
    expect(validateFile({ type: "application/zip", size: 1000 })).not.toBeNull();
    expect(validateFile({ type: "image/jpeg", size: 10 * 1024 * 1024 + 1 })).not.toBeNull();
  });
});
