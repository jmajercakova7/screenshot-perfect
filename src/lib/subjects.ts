export type Subject = { slug: string; name: string; group: string };

export const SUBJECTS: Subject[] = [
  { slug: "ib-math-aa-hl", name: "IB Mathematics AA HL", group: "IB Diploma" },
  { slug: "ib-math-aa-sl", name: "IB Mathematics AA SL", group: "IB Diploma" },
  { slug: "ib-math-ai-sl", name: "IB Mathematics AI SL", group: "IB Diploma" },
  { slug: "ib-physics-hl", name: "IB Physics HL", group: "IB Diploma" },
  { slug: "ib-chemistry-hl", name: "IB Chemistry HL", group: "IB Diploma" },
  { slug: "ib-biology-hl", name: "IB Biology HL", group: "IB Diploma" },
  { slug: "ib-economics-hl", name: "IB Economics HL", group: "IB Diploma" },
  { slug: "ib-english-a", name: "IB English A: Language & Literature", group: "IB Diploma" },
  { slug: "sat-math", name: "SAT Math", group: "Exams" },
  { slug: "gcse-maths", name: "GCSE Maths", group: "Exams" },
  { slug: "a-level-chemistry", name: "A-Level Chemistry", group: "Exams" },
  { slug: "esl", name: "English as a Second Language", group: "Languages" },
  { slug: "spanish", name: "Spanish", group: "Languages" },
  { slug: "python", name: "Python Programming", group: "Skills" },
];

export const SUBJECT_GROUPS = Array.from(new Set(SUBJECTS.map((s) => s.group)));

export function subjectName(slug: string | null | undefined): string {
  if (!slug) return "";
  return SUBJECTS.find((s) => s.slug === slug)?.name ?? slug;
}

export function isSubject(slug: unknown): slug is string {
  return typeof slug === "string" && SUBJECTS.some((s) => s.slug === slug);
}
