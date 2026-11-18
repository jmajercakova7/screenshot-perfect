import { createServerFn } from "@tanstack/react-start";
import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rankTutors } from "./matching";
import { budgetMax, preferencesSchema } from "./preferences";
import { subjectName } from "./subjects";

export type Recommendation = {
  slug: string;
  full_name: string;
  headline: string;
  price_per_hour: number;
  rating: number;
  review_count: number;
  verified: boolean;
  country: string;
  languages: string[];
  reason: string;
  highlights: string[];
};

export type RecommendResult =
  | { ok: true; summary: string; recommendations: Recommendation[] }
  | { ok: false; error: string };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "picks"],
  properties: {
    summary: { type: "string", description: "One or two friendly sentences addressed to the learner." },
    picks: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["slug", "reason", "highlights"],
        properties: {
          slug: { type: "string" },
          reason: { type: "string", description: "2-3 sentences on why this tutor fits the learner's needs." },
          highlights: { type: "array", maxItems: 3, items: { type: "string" } },
        },
      },
    },
  },
} as const;

export const recommendTutors = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => preferencesSchema.parse(input))
  .handler(async ({ data: prefs, context }): Promise<RecommendResult> => {
    const { supabase, userId } = context;

    // Remember the learner's preferences for next time.
    await supabase
      .from("profiles")
      .update({ lesson_preferences: prefs, main_subject: prefs.subject })
      .eq("id", userId);

    const { data: tutors, error } = await supabase
      .from("tutors")
      .select("slug, full_name, headline, bio, country, timezone, languages, subjects, price_per_hour, rating, review_count, lessons_taught, verified, verification_status, response_time, user_id");
    if (error) return { ok: false, error: "Couldn't load tutors right now." };

    const max = budgetMax(prefs.budget);
    const candidates = rankTutors(
      tutors.filter((t) => t.user_id !== userId && t.price_per_hour <= max).map((t) => ({ ...t, rating: Number(t.rating) })),
      { subject: prefs.subject },
    ).slice(0, 8);

    if (candidates.length === 0) {
      return {
        ok: true,
        summary: `No tutors teach ${subjectName(prefs.subject)} within that budget yet. Try a wider budget.`,
        recommendations: [],
      };
    }

    const learner = {
      subject: subjectName(prefs.subject),
      goal: prefs.goal,
      budget: prefs.budget,
      preferred_languages: prefs.languages || "no preference",
      availability: prefs.availability || "flexible",
      learning_style: prefs.learning_style || "not specified",
    };
    const pool = candidates.map((t) => ({
      slug: t.slug,
      name: t.full_name,
      headline: t.headline,
      bio: t.bio,
      country: t.country,
      timezone: t.timezone,
      languages: t.languages,
      subjects: t.subjects.map(subjectName),
      price: t.price_per_hour === 0 ? "free (volunteer)" : `$${t.price_per_hour}/hr`,
      rating: t.rating,
      reviews: t.review_count,
      lessons_taught: t.lessons_taught,
      verification: t.verification_status,
      replies: t.response_time,
    }));

    let text = "";
    try {
      const res = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions:
          "You are TUTORME.'s tutor matching assistant. Choose up to 3 tutors from the provided list who best fit the learner. " +
          "Weigh subject expertise for the learner's specific goal, budget, language, time-zone fit with their availability, teaching style, and trust (verification, reviews). " +
          "Only use slugs from the list. Never invent facts about tutors. Write in plain, encouraging English addressed to the learner as 'you'. Keep highlights to 2-5 words each.",
        input: [
          {
            role: "user",
            content: `Return JSON.\n\nLearner needs:\n${JSON.stringify(learner)}\n\nAvailable tutors:\n${JSON.stringify(pool)}`,
          },
        ],
        text: { format: { type: "json_schema", name: "tutor_recommendations", strict: true, schema: SCHEMA } },
      });
      for (const item of res.output ?? []) {
        if (item.type === "message") {
          for (const c of item.content) if (c.type === "output_text") text += c.text;
        }
      }
    } catch (err) {
      if (err instanceof GatewayError) {
        console.error("recommendTutors gateway error", err.code, err.ids);
        if (err.code === "rate_limited") return { ok: false, error: "Lots of people are matching right now. Please try again in a minute." };
        if (err.code === "payment_required") return { ok: false, error: "AI matching is paused right now. Please browse tutors instead." };
      } else {
        console.error("recommendTutors failed", err);
      }
      return { ok: false, error: "AI matching didn't finish. Please try again." };
    }

    let parsed: { summary: string; picks: { slug: string; reason: string; highlights: string[] }[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, error: "AI matching didn't finish. Please try again." };
    }

    const bySlug = new Map(candidates.map((t) => [t.slug, t]));
    const recommendations: Recommendation[] = [];
    for (const p of parsed.picks ?? []) {
      const t = bySlug.get(p.slug);
      if (!t || recommendations.some((r) => r.slug === t.slug)) continue;
      recommendations.push({
        slug: t.slug,
        full_name: t.full_name,
        headline: t.headline,
        price_per_hour: t.price_per_hour,
        rating: t.rating,
        review_count: t.review_count,
        verified: t.verified,
        country: t.country,
        languages: t.languages,
        reason: String(p.reason).slice(0, 600),
        highlights: (p.highlights ?? []).slice(0, 3).map((h) => String(h).slice(0, 40)),
      });
    }
    return { ok: true, summary: String(parsed.summary ?? "").slice(0, 400), recommendations };
  });
