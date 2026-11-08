"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Plus,
  Save,
  Search,
  Trash2,
} from "lucide-react";
import { updatePaperAction } from "@/actions/papers";
import { MathText } from "@/components/questions/math-text";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/shell";
import { DIFFICULTY_META, QUESTION_TYPE_META } from "@/lib/constants";
import type { PrintOptionKey } from "@/lib/papers/print-options";
import { cn, pluralize } from "@/lib/utils";
import type { SelectableQuestion } from "@/services/questions.service";
import type {
  Difficulty,
  PaperPrintOptions,
  PaperWithSets,
  QuestionType,
  TextDirection,
} from "@/types/domain";
import { PaperDetailsFields } from "./paper-details-fields";

interface EditorItem {
  questionId: string;
  section: string | null;
  marksOverride: number | null;
  optionOrder: string[] | null;
  text: string;
  direction: TextDirection;
  type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  topicLabel: string | null;
}

interface EditorSet {
  id: string;
  label: string;
  items: EditorItem[];
}

function poolItem(row: SelectableQuestion): EditorItem {
  return {
    questionId: row.id,
    section: null,
    marksOverride: null,
    optionOrder: null,
    text: row.question_text,
    direction: row.text_direction,
    type: row.question_type,
    difficulty: row.difficulty,
    marks: row.marks,
    topicLabel: row.topic
      ? [row.topic.chapter_title, row.topic.topic_title, row.topic.subtopic_title]
          .filter(Boolean)
          .join(" · ")
      : null,
  };
}

function setTotal(items: EditorItem[]): number {
  return items.reduce((sum, item) => sum + (item.marksOverride ?? item.marks), 0);
}

export function PaperEditor({
  paper,
  pool,
}: {
  paper: PaperWithSets;
  pool: SelectableQuestion[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const initialSets = useMemo<EditorSet[]>(
    () =>
      paper.sets.map((set) => ({
        id: set.id,
        label: set.set_label,
        items: set.items.flatMap((row) => {
          if (!row.question) return [];
          return [
            {
              questionId: row.question_id,
              section: row.section,
              marksOverride: row.marks_override,
              optionOrder: row.option_order,
              text: row.question.question_text,
              direction: row.question.text_direction,
              type: row.question.question_type,
              difficulty: row.question.difficulty,
              marks: row.question.marks,
              topicLabel: null,
            },
          ];
        }),
      })),
    [paper.sets],
  );

  const [sets, setSets] = useState<EditorSet[]>(initialSets);
  const [activeSetId, setActiveSetId] = useState(
    initialSets[0]?.id ?? "",
  );
  const [title, setTitle] = useState(paper.title);
  const [duration, setDuration] = useState(paper.duration_minutes);
  const [session, setSession] = useState(paper.exam_session ?? "");
  const [instructions, setInstructions] = useState(paper.instructions ?? "");
  const [printOptions, setPrintOptions] = useState<PaperPrintOptions>(paper.print_options);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"" | QuestionType>("");
  const [error, setError] = useState<string | null>(null);

  const activeSet = sets.find((set) => set.id === activeSetId) ?? sets[0] ?? null;
  const activeIds = useMemo(
    () => new Set((activeSet?.items ?? []).map((item) => item.questionId)),
    [activeSet],
  );

  const available = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return pool.filter((row) => {
      if (activeIds.has(row.id)) return false;
      if (type && row.question_type !== type) return false;
      if (needle && !row.question_text.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [pool, activeIds, type, search]);

  const paperMarks = Math.max(0, ...sets.map((set) => setTotal(set.items)));
  const allQuestions = sets.reduce((sum, set) => sum + set.items.length, 0);

  function updatePrintOption(key: PrintOptionKey, value: boolean) {
    setPrintOptions((current) => ({ ...current, [key]: value }));
  }

  function updateActiveItems(updater: (items: EditorItem[]) => EditorItem[]) {
    if (!activeSet) return;
    setSets((current) =>
      current.map((set) =>
        set.id === activeSet.id ? { ...set, items: updater(set.items) } : set,
      ),
    );
    setError(null);
  }

  function removeItem(questionId: string) {
    updateActiveItems((items) => items.filter((item) => item.questionId !== questionId));
  }

  function moveItem(index: number, direction: -1 | 1) {
    updateActiveItems((items) => {
      const target = index + direction;
      if (target < 0 || target >= items.length) return items;
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addQuestion(row: SelectableQuestion) {
    if (!activeSet || activeIds.has(row.id)) return;
    updateActiveItems((items) => [...items, poolItem(row)]);
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Give the paper a title.");
      return;
    }
    if (sets.length === 0) {
      setError("This paper has no sets to save.");
      return;
    }
    const empty = sets.find((set) => set.items.length === 0);
    if (empty) {
      setError(`Set ${empty.label} needs at least one question.`);
      return;
    }

    startTransition(async () => {
      const result = await updatePaperAction({
        paper_id: paper.id,
        title: title.trim(),
        duration_minutes: duration,
        instructions: instructions.trim() || null,
        exam_session: session.trim() || null,
        print_options: printOptions,
        sets: sets.map((set) => ({
          id: set.id,
          items: set.items.map((item) => ({
            question_id: item.questionId,
            section: item.section,
            marks_override: item.marksOverride,
            option_order: item.optionOrder,
          })),
        })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      router.push(`/papers/${result.data.id}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {error ? <Alert tone="danger">{error}</Alert> : null}

      {sets.length === 0 ? (
        <Alert tone="warning" title="This paper has no sets">
          Duplicate it or generate a replacement paper from the builder.
        </Alert>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <PaperDetailsFields
            heading="Paper details"
            title={title}
            onTitleChange={setTitle}
            duration={duration}
            onDurationChange={setDuration}
            session={session}
            onSessionChange={setSession}
            instructions={instructions}
            onInstructionsChange={setInstructions}
            printOptions={printOptions}
            onPrintOptionChange={updatePrintOption}
          />

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Questions by set</CardTitle>
              <span className="text-[11px] text-slate-500">
                {allQuestions} {pluralize(allQuestions, "question")} across {sets.length}{" "}
                {pluralize(sets.length, "set")}
              </span>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {sets.map((set) => (
                  <button
                    key={set.id}
                    type="button"
                    onClick={() => setActiveSetId(set.id)}
                    className={cn(
                      "inline-flex h-9 items-center rounded-lg border px-3 text-xs font-medium transition",
                      set.id === activeSet?.id
                        ? "border-brand-300 bg-brand-50 text-brand-700"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
                    )}
                  >
                    Set {set.label}
                    <span className="ml-2 text-[10px] text-slate-400">
                      {set.items.length} Q · {setTotal(set.items)} marks
                    </span>
                  </button>
                ))}
              </div>

              {!activeSet || activeSet.items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-500">
                  Set {activeSet?.label ?? "?"} is empty. Add a question below.
                </p>
              ) : (
                <ol className="space-y-2">
                  {activeSet.items.map((item, index) => {
                    const typeMeta = QUESTION_TYPE_META[item.type];
                    const level = DIFFICULTY_META[item.difficulty];
                    return (
                      <li
                        key={item.questionId}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                      >
                        <span className="w-5 shrink-0 pt-0.5 text-xs font-medium text-slate-400">
                          {index + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <Badge tone="brand">{typeMeta.short}</Badge>
                            <Badge className={level.className}>{level.label}</Badge>
                            <span className="text-[11px] text-slate-500">
                              {item.marksOverride ?? item.marks}{" "}
                              {pluralize(item.marksOverride ?? item.marks, "mark")}
                            </span>
                            {item.section ? (
                              <span className="text-[10px] uppercase tracking-wide text-slate-400">
                                {item.section}
                              </span>
                            ) : null}
                          </div>
                          <MathText content={item.text} direction={item.direction} compact />
                          {item.topicLabel ? (
                            <p className="mt-1 text-[11px] text-slate-500">{item.topicLabel}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveItem(index, -1)}
                            disabled={index === 0}
                            aria-label="Move question up"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                          >
                            <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(index, 1)}
                            disabled={index === activeSet.items.length - 1}
                            aria-label="Move question down"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                          >
                            <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem(item.questionId)}
                            aria-label="Remove question from this set"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-rose-500 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>
                Add questions{activeSet ? ` to Set ${activeSet.label}` : ""}
              </CardTitle>
              <span className="text-[11px] text-slate-500">
                {available.length} {pluralize(available.length, "match", "matches")}
              </span>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_160px]">
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search question text…"
                    className="pl-9"
                    aria-label="Search question bank"
                  />
                </div>
                <Select
                  value={type}
                  onChange={(event) => setType(event.target.value as "" | QuestionType)}
                  aria-label="Filter by type"
                >
                  <option value="">Any type</option>
                  {Object.entries(QUESTION_TYPE_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </Select>
              </div>

              {available.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-500">
                  No more questions match. Add more to the bank first.
                </p>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto overscroll-contain pr-1">
                  {available.map((row) => {
                    const typeMeta = QUESTION_TYPE_META[row.question_type];
                    const level = DIFFICULTY_META[row.difficulty];
                    return (
                      <li
                        key={row.id}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <Badge tone="brand">{typeMeta.short}</Badge>
                            <Badge className={level.className}>{level.label}</Badge>
                            <span className="text-[11px] text-slate-500">
                              {row.marks} {pluralize(row.marks, "mark")}
                            </span>
                          </div>
                          <MathText
                            content={row.question_text}
                            direction={row.text_direction}
                            compact
                            className="line-clamp-3"
                          />
                          {row.topic ? (
                            <p className="mt-1 text-[11px] text-slate-500">
                              {[
                                row.topic.chapter_title,
                                row.topic.topic_title,
                                row.topic.subtopic_title,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addQuestion(row)}
                          disabled={!activeSet}
                          className="shrink-0"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                          Add
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-20 xl:h-fit">
          <Card>
            <CardHeader>
              <CardTitle>Save changes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid grid-cols-2 gap-2 text-xs">
                <dt className="text-slate-500">Sets</dt>
                <dd className="text-right font-medium text-slate-800">{sets.length}</dd>
                <dt className="text-slate-500">Questions</dt>
                <dd className="text-right font-medium text-slate-800">{allQuestions}</dd>
                <dt className="text-slate-500">Paper marks</dt>
                <dd className="text-right font-medium text-slate-800">{paperMarks}</dd>
              </dl>

              <Button type="submit" disabled={pending || sets.length === 0} className="w-full">
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                Save changes
              </Button>
              <Link
                href={`/papers/${paper.id}`}
                className={cn(buttonClasses("outline", "md"), "w-full")}
              >
                Cancel
              </Link>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Marks are recalculated from each set. The paper total follows the largest set.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  );
}
