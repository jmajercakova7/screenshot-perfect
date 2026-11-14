import { describe, expect, it } from "vitest";
import { formatPrice, matchScore, rankTutors } from "./matching";

const base = { rating: 4.8, review_count: 50, verified: true, headline: "" };
const tutors = [
  { ...base, full_name: "Paid Maths", subjects: ["ib-math-aa-hl"], price_per_hour: 35 },
  { ...base, full_name: "Free Maths", subjects: ["ib-math-aa-hl"], price_per_hour: 0 },
  { ...base, full_name: "Spanish Only", subjects: ["spanish"], price_per_hour: 0 },
  { ...base, full_name: "Unverified Maths", subjects: ["ib-math-aa-hl"], price_per_hour: 20, verified: false },
];

describe("tutor matching", () => {
  it("only shows tutors who teach the chosen subject", () => {
    const names = rankTutors(tutors, { subject: "ib-math-aa-hl" }).map((t) => t.full_name);
    expect(names).not.toContain("Spanish Only");
    expect(names).toHaveLength(3);
  });

  it("the free filter shows only volunteer tutors", () => {
    const result = rankTutors(tutors, { subject: "ib-math-aa-hl", price: "free" });
    expect(result.map((t) => t.full_name)).toEqual(["Free Maths"]);
  });

  it("the paid filter hides volunteer tutors", () => {
    const result = rankTutors(tutors, { price: "paid" });
    expect(result.every((t) => t.price_per_hour > 0)).toBe(true);
  });

  it("verified tutors rank above unverified ones with the same reviews", () => {
    const result = rankTutors(tutors, { subject: "ib-math-aa-hl" });
    expect(result.at(-1)?.full_name).toBe("Unverified Maths");
  });

  it("a tutor who does not teach the subject scores 0", () => {
    expect(matchScore(tutors[2]!, { subject: "ib-math-aa-hl" })).toBe(0);
  });

  it("volunteer lessons show as Free", () => {
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(35)).toBe("$35/hr");
  });
});
