import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, KeyRound, Printer } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { correctOptionLabel, resolveOptions } from "@/lib/papers/answer-key";
import { getPaperWithSets } from "@/services/papers.service";
import { MathText } from "@/components/questions/math-text";
import { DeletePaperButton } from "@/components/papers/delete-paper-button";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/shell";
import { cn } from "@/lib/utils";
import type { PaperQuestionRow } from "@/types/domain";

export const metadata = { title: "Paper" };

export default async function PaperDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ set?: string }>;
}) {
  const { id } = await params;
  const { set: requestedSet } = await searchParams;
  const { supabase } = await requireSession(`/papers/${id}`);

  const paper = await getPaperWithSets(supabase, id);
  if (!paper) notFound();

  const activeSet =
    paper.sets.find((set) => set.set_label === requestedSet) ?? paper.sets[0] ?? null;

  const sections = new Map<string, PaperQuestionRow[]>();
  activeSet?.items.forEach((item) => {
    const key = item.section ?? "Questions";
    const list = sections.get(key) ?? [];
    list.push(item);
    sections.set(key, list);
  });

  return (
    <>
      <div className="mb-4">
        <Link
          href="/papers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          All papers
        </Link>
      </div>

      <PageHeader
        title={paper.title}
        description={`${paper.class_name}${paper.subject ? ` · ${paper.subject.subject_name}` : ""} · ${paper.sets.length} set(s) · ${paper.total_marks} marks · ${paper.duration_minutes} minutes`}
        actions={
          <>
            <DeletePaperButton id={paper.id} />
            <Link
              href={`/papers/${paper.id}/print?set=${activeSet?.set_label ?? "A"}`}
              className={buttonClasses("primary", "md")}
            >
              <Printer className="h-4 w-4" aria-hidden />
              Print / PDF
            </Link>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {paper.sets.map((set) => (
          <Link
            key={set.id}
            href={`/papers/${paper.id}?set=${set.set_label}`}
            className={cn(
              "inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition",
              set.set_label === activeSet?.set_label
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
            )}
          >
            Set {set.set_label}
            <span className="ml-2 text-[10px] text-slate-400">{set.items.length} Q</span>
          </Link>
        ))}
        <Badge tone="neutral" className="sm:ml-auto">
          Seed {paper.seed}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>
              {activeSet ? `Set ${activeSet.set_label} — paper body` : "No sets"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!activeSet || activeSet.items.length === 0 ? (
              <p className="text-sm text-slate-500">This set has no questions.</p>
            ) : (
              [...sections.entries()].map(([section, items]) => (
                <section key={section}>
                  <h3 className="mb-3 border-b border-slate-100 pb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {section}
                  </h3>
                  <ol className="space-y-4">
                    {items.map((item) => {
                      if (!item.question) return null;
                      const options = resolveOptions(item.question, item.option_order);
                      return (
                        <li key={item.id} className="flex gap-3">
                          <span className="w-5 shrink-0 text-sm font-medium text-slate-400">
                            {item.display_order}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <MathText
                              content={item.question.question_text}
                              direction={item.question.text_direction}
                              compact
                            />
                            {options.length > 0 ? (
                              <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                                {options.map((option) => (
                                  <div
                                    key={option.key}
                                    className="flex gap-1.5 text-[13px] text-slate-600"
                                  >
                                    <span className="font-medium text-slate-400">
                                      {option.label}.
                                    </span>
                                    <MathText
                                      content={option.text}
                                      direction={item.question!.text_direction}
                                      compact
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <span className="w-8 shrink-0 text-right text-[11px] text-slate-500">
                            ({item.marks_override ?? item.question.marks})
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))
            )}
          </CardContent>
        </Card>

        <aside className="xl:sticky xl:top-20 xl:h-fit">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-slate-400" aria-hidden />
              <CardTitle>Answer key</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!activeSet || activeSet.items.length === 0 ? (
                <p className="text-sm text-slate-500">Nothing to key.</p>
              ) : (
                <ol className="space-y-2">
                  {activeSet.items.map((item) => {
                    if (!item.question) return null;
                    const label = correctOptionLabel(item.question, item.option_order);
                    return (
                      <li key={item.id} className="flex gap-2 text-xs">
                        <span className="w-5 shrink-0 text-slate-400">
                          {item.display_order}.
                        </span>
                        {label ? (
                          <span className="font-medium text-slate-800">
                            Option {label}
                          </span>
                        ) : item.question.correct_answer ? (
                          <MathText
                            content={item.question.correct_answer}
                            direction={item.question.text_direction}
                            compact
                            className="line-clamp-2 text-slate-600"
                          />
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
              <Link
                href={`/papers/${paper.id}/print?set=${activeSet?.set_label ?? "A"}`}
                className={cn(buttonClasses("outline", "sm"), "mt-2 w-full")}
              >
                <Printer className="h-3.5 w-3.5" aria-hidden />
                Open print layout
              </Link>
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
