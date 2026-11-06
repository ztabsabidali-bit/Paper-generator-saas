"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Loader2,
  Search,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import {
  createPaperFromSelectionAction,
  listSelectableQuestionsAction,
} from "@/actions/papers";
import { MathText } from "@/components/questions/math-text";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/shell";
import { DIFFICULTY_META, QUESTION_TYPE_META, SET_LABELS } from "@/lib/constants";
import { defaultPaperTitle } from "@/lib/papers/labels";
import { DEFAULT_PRINT_OPTIONS, type PrintOptionKey } from "@/lib/papers/print-options";
import { cn, pluralize } from "@/lib/utils";
import { PaperDetailsFields } from "./paper-details-fields";
import { PaperScopeFields } from "./paper-scope-fields";
import type { QuestionType } from "@/types/database";
import type { PaperPrintOptions, SubjectWithTopics } from "@/types/domain";
import type { SelectableQuestion } from "@/services/questions.service";

const SECTION_ORDER: QuestionType[] = ["mcq", "short", "long"];
const SECTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

export function ManualPaperBuilder({
  catalog,
  defaultSession,
  defaultInstructions,
}: {
  catalog: SubjectWithTopics[];
  defaultSession: string;
  defaultInstructions: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [className, setClassName] = useState(catalog[0]?.class_name ?? "");
  const [subjectId, setSubjectId] = useState(catalog[0]?.id ?? "");
  const [title, setTitle] = useState(() => defaultPaperTitle(catalog[0]));
  const [titleTouched, setTitleTouched] = useState(false);
  const [duration, setDuration] = useState(120);
  const [session, setSession] = useState(defaultSession);
  const [setCount, setSetCount] = useState(1);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [instructions, setInstructions] = useState(defaultInstructions);
  const [printOptions, setPrintOptions] = useState<PaperPrintOptions>(() => ({
    ...DEFAULT_PRINT_OPTIONS,
  }));

  function updatePrintOption(key: PrintOptionKey, value: boolean) {
    setPrintOptions((current) => ({ ...current, [key]: value }));
  }

  const [chapter, setChapter] = useState("");
  const [topic, setTopic] = useState("");
  const [subtopic, setSubtopic] = useState("");
  const [type, setType] = useState<"" | QuestionType>("");
  const [difficulty, setDifficulty] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [rows, setRows] = useState<SelectableQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SelectableQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const subject = useMemo(
    () => catalog.find((item) => item.id === subjectId) ?? null,
    [catalog, subjectId],
  );

  const chapterOptions = useMemo(
    () => (subject ? [...new Set(subject.topics.map((item) => item.chapter_title))] : []),
    [subject],
  );
  const topicOptions = useMemo(() => {
    if (!subject) return [];
    const names = subject.topics
      .filter((item) => !chapter || item.chapter_title === chapter)
      .map((item) => item.topic_title)
      .filter((name): name is string => Boolean(name));
    return [...new Set(names)];
  }, [subject, chapter]);
  const subtopicOptions = useMemo(() => {
    if (!subject) return [];
    const names = subject.topics
      .filter((item) => !chapter || item.chapter_title === chapter)
      .filter((item) => !topic || item.topic_title === topic)
      .map((item) => item.subtopic_title)
      .filter((name): name is string => Boolean(name));
    return [...new Set(names)];
  }, [subject, chapter, topic]);

  // Debounce only the free-text box so typing does not hammer the server.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!subjectId) {
      setRows([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    listSelectableQuestionsAction({
      subject_id: subjectId,
      chapter: chapter || undefined,
      topic: topic || undefined,
      subtopic: subtopic || undefined,
      type: type || undefined,
      difficulty: difficulty || undefined,
      search: debouncedSearch || undefined,
    }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setRows(result.data);
        setError(null);
      } else {
        setRows([]);
        setError(result.error);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [subjectId, chapter, topic, subtopic, type, difficulty, debouncedSearch]);

  const selectedIds = useMemo(() => new Set(selected.map((row) => row.id)), [selected]);

  const sections = useMemo(
    () =>
      SECTION_ORDER.map((sectionType) => ({
        type: sectionType,
        picks: selected.filter((row) => row.question_type === sectionType),
      }))
        .filter((section) => section.picks.length > 0)
        .map((section, index) => ({
          ...section,
          label: SECTION_LETTERS[index] ?? String(index + 1),
          title: `Section ${SECTION_LETTERS[index] ?? index + 1} — ${
            QUESTION_TYPE_META[section.type].label
          }`,
        })),
    [selected],
  );

  const totalMarks = selected.reduce((sum, row) => sum + row.marks, 0);

  const swapRisks = useMemo(() => {
    if (setCount < 2) return [];
    return sections
      .map((section) => {
        const available = rows.filter((row) => row.question_type === section.type).length;
        const needed = section.picks.length * setCount;
        return available < needed ? { type: section.type, available, needed } : null;
      })
      .filter((risk): risk is { type: QuestionType; available: number; needed: number } =>
        Boolean(risk),
      );
  }, [sections, rows, setCount]);

  function onClassChange(value: string) {
    setClassName(value);
    const first = catalog.find((item) => item.class_name === value);
    setSubjectId(first?.id ?? "");
    resetFilters();
    setSelected([]);
    clearResult();
    if (!titleTouched) setTitle(defaultPaperTitle(first));
  }

  function onSubjectChange(value: string) {
    setSubjectId(value);
    resetFilters();
    setSelected([]);
    clearResult();
    if (!titleTouched) {
      setTitle(defaultPaperTitle(catalog.find((item) => item.id === value)));
    }
  }

  function resetFilters() {
    setChapter("");
    setTopic("");
    setSubtopic("");
    setType("");
    setDifficulty("");
    setSearch("");
    setDebouncedSearch("");
  }

  function clearResult() {
    setWarnings([]);
    setCreatedId(null);
    setError(null);
  }

  function toggleQuestion(row: SelectableQuestion) {
    setSelected((current) =>
      current.some((item) => item.id === row.id)
        ? current.filter((item) => item.id !== row.id)
        : [...current, row],
    );
    clearResult();
  }

  function removeQuestion(id: string) {
    setSelected((current) => current.filter((item) => item.id !== id));
    clearResult();
  }

  // Move a pick up or down inside its own section (the printed order).
  function moveQuestion(id: string, direction: -1 | 1) {
    setSelected((current) => {
      const item = current.find((row) => row.id === id);
      if (!item) return current;
      const sameType = current.filter((row) => row.question_type === item.question_type);
      const position = sameType.findIndex((row) => row.id === id);
      const neighbour = sameType[position + direction];
      if (!neighbour) return current;
      const from = current.findIndex((row) => row.id === id);
      const to = current.findIndex((row) => row.id === neighbour.id);
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  }

  function generate() {
    setError(null);
    setWarnings([]);

    startTransition(async () => {
      const result = await createPaperFromSelectionAction({
        title: title.trim(),
        class_name: className,
        subject_id: subjectId,
        question_ids: selected.map((row) => row.id),
        pool_ids: rows.map((row) => row.id),
        set_count: setCount,
        shuffle_options: shuffleOptions,
        duration_minutes: duration,
        instructions: instructions.trim() || null,
        exam_session: session.trim() || null,
        print_options: printOptions,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      if (result.data.warnings.length > 0) {
        setWarnings(result.data.warnings);
        setCreatedId(result.data.id);
        return;
      }

      router.push(`/papers/${result.data.id}`);
    });
  }

  const canGenerate = Boolean(title.trim()) && Boolean(subjectId) && selected.length > 0 && !pending;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-6">
        {error ? <Alert tone="danger">{error}</Alert> : null}

        {warnings.length > 0 && createdId ? (
          <Alert tone="warning" title="Paper generated with warnings">
            <ul className="mt-1 list-disc space-y-1 pl-4">
              {warnings.slice(0, 6).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
            <Link
              href={`/papers/${createdId}`}
              className={cn(buttonClasses("primary", "sm"), "mt-3")}
            >
              Open paper
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>1 · Scope</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PaperScopeFields
              catalog={catalog}
              className={className}
              subjectId={subjectId}
              onClassChange={onClassChange}
              onSubjectChange={onSubjectChange}
            />
            <p className="text-[11px] text-slate-500">
              {chapterOptions.length} {pluralize(chapterOptions.length, "chapter")} ·{" "}
              {subject?.topics.length ?? 0} {pluralize(subject?.topics.length ?? 0, "topic")}{" "}
              in this subject.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>2 · Pick questions</CardTitle>
            <span className="text-[11px] text-slate-500">
              {loading ? "Loading…" : `${rows.length} matching`}
            </span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <Select
                value={chapter}
                onChange={(event) => {
                  setChapter(event.target.value);
                  setTopic("");
                  setSubtopic("");
                }}
                aria-label="Filter by chapter"
              >
                <option value="">All chapters</option>
                {chapterOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>

              <Select
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  setSubtopic("");
                }}
                aria-label="Filter by topic"
                disabled={!chapter}
              >
                <option value="">All topics</option>
                {topicOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>

              <Select
                value={subtopic}
                onChange={(event) => setSubtopic(event.target.value)}
                aria-label="Filter by subtopic"
                disabled={!topic}
              >
                <option value="">All subtopics</option>
                {subtopicOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>

              <Select
                value={type}
                onChange={(event) => setType(event.target.value as "" | QuestionType)}
                aria-label="Filter by type"
              >
                <option value="">Any type</option>
                {SECTION_ORDER.map((value) => (
                  <option key={value} value={value}>
                    {QUESTION_TYPE_META[value].short}
                  </option>
                ))}
              </Select>

              <Select
                value={difficulty}
                onChange={(event) => setDifficulty(event.target.value)}
                aria-label="Filter by difficulty"
              >
                <option value="">Any level</option>
                {Object.entries(DIFFICULTY_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </Select>

              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search question text…"
                  className="pl-9"
                  aria-label="Search questions"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-10 text-xs text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Loading questions…
              </div>
            ) : rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-3 py-8 text-center text-xs text-slate-500">
                No questions match these filters.{" "}
                <Link href="/questions/new" className="font-medium text-brand-700">
                  Add a question
                </Link>
                .
              </div>
            ) : (
              <ul className="max-h-[32rem] space-y-2 overflow-y-auto overscroll-contain pr-1">
                {rows.map((row) => {
                  const checked = selectedIds.has(row.id);
                  const typeMeta = QUESTION_TYPE_META[row.question_type];
                  const level = DIFFICULTY_META[row.difficulty];
                  return (
                    <li key={row.id}>
                      <label
                        className={cn(
                          "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition",
                          checked
                            ? "border-brand-300 bg-brand-50/50"
                            : "border-slate-200 bg-white hover:border-slate-300",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleQuestion(row)}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-1.5">
                            <Badge tone="brand">{typeMeta.short}</Badge>
                            <Badge className={level.className}>{level.label}</Badge>
                            <span className="text-[11px] text-slate-500">
                              {row.marks} {pluralize(row.marks, "mark")}
                            </span>
                          </div>
                          <div className="max-h-24 overflow-hidden">
                            <MathText
                              content={row.question_text}
                              direction={row.text_direction}
                              compact
                            />
                          </div>
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
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <PaperDetailsFields
          heading="3 · Paper details"
          title={title}
          onTitleChange={(value) => {
            setTitle(value);
            setTitleTouched(true);
          }}
          duration={duration}
          onDurationChange={setDuration}
          session={session}
          onSessionChange={setSession}
          setCount={setCount}
          onSetCountChange={setSetCount}
          instructions={instructions}
          onInstructionsChange={setInstructions}
          shuffleOptions={shuffleOptions}
          onShuffleOptionsChange={setShuffleOptions}
          printOptions={printOptions}
          onPrintOptionChange={updatePrintOption}
        />
      </div>

      <aside className="flex flex-col gap-4 xl:sticky xl:top-20 xl:h-fit">
        <Card>
          <CardHeader>
            <CardTitle>Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="brand">
                {selected.length} {pluralize(selected.length, "question")}
              </Badge>
              <Badge>{totalMarks} marks</Badge>
              <Badge>
                {setCount} set{setCount > 1 ? "s" : ""}
              </Badge>
            </div>

            {sections.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-500">
                Tick questions on the left. They become Set A exactly as ordered here.
              </p>
            ) : (
              <div className="space-y-3">
                {sections.map((section) => (
                  <div key={section.type}>
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {section.title}
                    </p>
                    <ul className="space-y-1.5">
                      {section.picks.map((row, index) => (
                        <li
                          key={row.id}
                          className="flex items-start gap-1.5 rounded-md border border-slate-200 px-2 py-1.5"
                        >
                          <span className="mt-0.5 w-4 shrink-0 text-[11px] font-semibold text-slate-500">
                            {index + 1}.
                          </span>
                          <span className="min-w-0 flex-1 text-[11px] leading-snug text-slate-700">
                            <span className="line-clamp-2">
                              {row.question_text.replace(/[#*_`$]/g, "").slice(0, 90)}
                            </span>
                            <span className="mt-0.5 block text-[10px] text-slate-500">
                              {row.marks} {pluralize(row.marks, "mark")}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center">
                            <button
                              type="button"
                              onClick={() => moveQuestion(row.id, -1)}
                              disabled={index === 0}
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                              aria-label="Move up"
                            >
                              <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveQuestion(row.id, 1)}
                              disabled={index === section.picks.length - 1}
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                              aria-label="Move down"
                            >
                              <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeQuestion(row.id)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                              aria-label="Remove question"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {swapRisks.length > 0 ? (
              <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Not enough spare questions in this filter for {setCount} sets:
                {swapRisks.map((risk) => (
                  <span key={risk.type}>
                    {" "}
                    {QUESTION_TYPE_META[risk.type].short} {risk.available}/{risk.needed}.
                  </span>
                ))}{" "}
                Variants will repeat some questions.
              </p>
            ) : null}

            {selected.length > 0 ? (
              <p className="text-[11px] leading-relaxed text-slate-500">
                {setCount > 1
                  ? `Sets ${SET_LABELS.slice(1, setCount).join(", ")} keep this structure and marks, swapping in unused questions of the same type.`
                  : "Single set: prints exactly these questions, in this order."}
              </p>
            ) : null}

            <Button type="button" onClick={generate} disabled={!canGenerate} className="w-full">
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Wand2 className="h-4 w-4" aria-hidden />
              )}
              {pending ? "Building…" : "Generate paper"}
            </Button>

            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden />
              The seed is stored, so a reprint is identical.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
