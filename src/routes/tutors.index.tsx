import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubjectSelect } from "@/components/tutorme/subject-select";
import { TutorCard } from "@/components/tutorme/tutor-card";
import { rankTutors, type PriceFilter } from "@/lib/matching";
import { isSubject, subjectName } from "@/lib/subjects";
import { tutorsQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

type TutorSearch = {
  subject?: string | undefined;
  price?: PriceFilter | undefined;
  q?: string | undefined;
};

export const Route = createFileRoute("/tutors/")({
  validateSearch: (s: Record<string, unknown>): TutorSearch => ({
    subject: isSubject(s["subject"]) ? s["subject"] : undefined,
    price: s["price"] === "free" || s["price"] === "paid" ? s["price"] : undefined,
    q: typeof s["q"] === "string" && s["q"] ? s["q"].slice(0, 60) : undefined,
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(tutorsQuery()),
  head: () => ({
    meta: [
      { title: "Find a tutor — TUTORME." },
      {
        name: "description",
        content:
          "Browse verified tutors for IB, SAT, languages and programming. Filter free volunteer or paid lessons.",
      },
      { property: "og:title", content: "Find a tutor — TUTORME." },
      {
        property: "og:description",
        content: "Browse verified free and paid tutors, ranked by how well they match you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TutorsPage,
});

const PRICE_OPTIONS: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "free", label: "Free" },
  { value: "paid", label: "Paid" },
];

function TutorsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/tutors/" });
  const { data: tutors } = useSuspenseQuery(tutorsQuery());
  const price = search.price ?? "all";
  const results = rankTutors(tutors, { subject: search.subject, price, query: search.q });

  const update = (patch: Partial<TutorSearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold tracking-widest text-leaf uppercase">Find a tutor</p>
        <h1 className="text-4xl font-semibold md:text-5xl">
          {search.subject ? subjectName(search.subject) : "Every subject, every budget"}
        </h1>
        <p className="text-muted-foreground">
          {results.length} {results.length === 1 ? "tutor" : "tutors"}
          {search.subject ? ", ranked by how well they match you" : " available"}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-3xl border bg-card p-3 shadow-soft md:flex-row md:items-center">
        <SubjectSelect
          value={search.subject ?? ""}
          onChange={(subject) => update({ subject })}
          placeholder="Any subject"
          className="h-11 rounded-2xl bg-background md:w-80"
        />
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            defaultValue={search.q ?? ""}
            onChange={(e) => update({ q: e.target.value || undefined })}
            placeholder="Search by name or keyword"
            className="h-11 rounded-2xl bg-background pl-10"
            maxLength={60}
          />
        </div>
        <div className="flex rounded-full bg-muted p-1" role="group" aria-label="Price">
          {PRICE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={price === o.value}
              onClick={() => update({ price: o.value === "all" ? undefined : o.value })}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                price === o.value
                  ? "bg-card text-foreground shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        {(search.subject || search.q || search.price) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ search: {}, replace: true })}
          >
            <X /> Clear
          </Button>
        )}
      </div>

      {results.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed p-12 text-center">
          <h2 className="text-2xl font-semibold">No tutors match yet</h2>
          <p className="mt-2 text-muted-foreground">Try a different filter or clear your search.</p>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map((t, i) => (
            <TutorCard
              key={t.id}
              tutor={t}
              match={search.subject ? t.match : undefined}
              highlightSubject={search.subject}
              topMatch={!!search.subject && i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
