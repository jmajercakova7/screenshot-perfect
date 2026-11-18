import { z } from "zod";
import { SUBJECTS } from "./subjects";

export const BUDGETS = [
  { value: "free", label: "Free only", max: 0 },
  { value: "under_25", label: "Up to $25/hr", max: 25 },
  { value: "under_50", label: "Up to $50/hr", max: 50 },
  { value: "any", label: "Any price", max: Number.POSITIVE_INFINITY },
] as const;

export const preferencesSchema = z.object({
  subject: z.enum(SUBJECTS.map((s) => s.slug) as [string, ...string[]]),
  goal: z.string().trim().min(10, "Describe your goal in a sentence or two").max(500),
  budget: z.enum(["free", "under_25", "under_50", "any"]),
  languages: z.string().trim().max(100).default(""),
  availability: z.string().trim().max(120).default(""),
  learning_style: z.string().trim().max(200).default(""),
});

export type LessonPreferences = z.infer<typeof preferencesSchema>;

export function budgetMax(budget: LessonPreferences["budget"]): number {
  return BUDGETS.find((b) => b.value === budget)?.max ?? Number.POSITIVE_INFINITY;
}
