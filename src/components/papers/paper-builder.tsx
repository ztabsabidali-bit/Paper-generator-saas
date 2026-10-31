"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { generatePaperAction, getPoolCountsAction } from "@/actions/papers";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/shell";
import { groupChapters } from "@/lib/catalog";
import { DIFFICULTY_META, QUESTION_TYPE_META, SET_LABELS } from "@/lib/constants";
import { cn, pluralize } from "@/lib/utils";
import type { QuestionType } from "@/types/database";
import type { SubjectWithTopics } from "@/types/domain";
import type { BlueprintRow } from "@/lib/validation/paper";
import type { PoolCounts } from "@/services/questions.service";

interface PaperBuilderProps {
  catalog: SubjectWithTopics[];
  defaultSession: string;
  defaultInstructions: string;
}

const DEFAULT_BLUEPRINT: BlueprintRow[] = [
  { type: "mcq", enabled: true, count: 10, marks: 1, difficulty: "mixed" },
  { type: "short", enabled: true, count: 5, marks: 3, difficulty: "mixed" },
  { type: "long", enabled: true, count: 2, marks: 8, difficulty: "mixed" },
];

function poolForType(counts: PoolCounts | null, type: QuestionType) {
  if (!counts) return 0;
  const row = counts.byType[type];
  return row.easy + row.medium + row.hard;
}

export function PaperBuilder({
  catalog,
  defaultSession,
  defaultInstructions,
}: PaperBuilderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [className, setClassName] = useState(catalog[0]?.class_name ?? "");
  const [subjectId, setSubjectId] = useState(catalog[0]?.id ?? "");
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [blueprint, setBlueprint] = useState<BlueprintRow[]>(DEFAULT_BLUEPRINT);
  const [setCount, setSetCount] = useState(2);
  const [shuffleOptions, setShuffleOptions] = useState(true);
  const [title, setTitle] = useState(() =>
    catalog[0]
      ? `${catalog[0].class_name} · ${catalog[0].subject_name} — Final Term`
      : "",
  );
  const [titleTouched, setTitleTouched] = useState(false);
  const [duration, setDuration] = useState(120);
  const [session, setSession] = useState(defaultSession);
  const [instructions, setInstructions] = useState(defaultInstructions);

  const [counts, setCounts] = useState<PoolCounts | null>(null);
  const [countsLoading, setCountsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const classNames = useMemo(
    () => [...new Set(catalog.map((subject) => subject.class_name))],
    [catalog],
  );
  const subjects = useMemo(
    () => catalog.filter((subject) => subject.class_name === className),
    [catalog, className],
  );
  const subject = useMemo(
    () => catalog.find((item) => item.id === subjectId) ?? null,
    [catalog, subjectId],
  );
  const chapters = useMemo(() => groupChapters(subject), [subject]);

  const topicIds = useMemo(
    () =>
      chapters
        .filter((chapter) => selectedChapters.includes(chapter.chapterTitle))
        .flatMap((chapter) => chapter.topics.map((topic) => topic.id)),
    [chapters, selectedChapters],
  );
  const topicKey = topicIds.join(",");

  useEffect(() => {
    if (!topicKey) {
      setCounts(null);
      return;
    }
    let cancelled = false;
    setCountsLoading(true);
    getPoolCountsAction(topicKey.split(",")).then((result) => {
      if (cancelled) return;
      setCounts(result.ok ? result.data : null);
      setCountsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [topicKey]);

  const enabledRows = blueprint.filter((row) => row.enabled && row.count > 0);
  const questionsPerSet = enabledRows.reduce((sum, row) => sum + row.count, 0);
  const marksPerSet = enabledRows.reduce((sum, row) => sum + row.count * row.marks, 0);
  const totalPrintRun = questionsPerSet * setCount;
  const poolTotal = counts?.total ?? 0;
  const overDraw = counts
    ? enabledRows.some((row) => row.count * setCount > poolForType(counts, row.type))
    : false;

  function onClassChange(value: string) {
    setClassName(value);
    const first = catalog.find((item) => item.class_name === value);
    setSubjectId(first?.id ?? "");
    setSelectedChapters([]);
    setWarnings([]);
    setCreatedId(null);
  }

  function onSubjectChange(value: string) {
    setSubjectId(value);
    setSelectedChapters([]);
    setWarnings([]);
    setCreatedId(null);
    if (!titleTouched) {
      const next = catalog.find((item) => item.id === value);
      setTitle(next ? `${next.class_name} · ${next.subject_name} — Final Term` : "");
    }
  }

  function toggleChapter(chapterTitle: string) {
    setSelectedChapters((current) =>
      current.includes(chapterTitle)
        ? current.filter((item) => item !== chapterTitle)
        : [...current, chapterTitle],
    );
    setWarnings([]);
    setCreatedId(null);
  }

  function updateRow(type: QuestionType, patch: Partial<BlueprintRow>) {
    setBlueprint((current) =>
      current.map((row) => (row.type === type ? { ...row, ...patch } : row)),
    );
    setWarnings([]);
    setCreatedId(null);
  }

  function generate() {
    setError(null);
    setWarnings([]);

    startTransition(async () => {
      const result = await generatePaperAction({
        title: title.trim(),
        class_name: className,
        subject_id: subjectId,
        topic_ids: topicIds,
        blueprint,
        set_count: setCount,
        shuffle_options: shuffleOptions,
        duration_minutes: duration,
        instructions: instructions.trim() || null,
        exam_session: session.trim() || null,
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

  const canGenerate =
    Boolean(title.trim()) &&
    Boolean(subjectId) &&
    topicIds.length > 0 &&
    enabledRows.length > 0 &&
    !pending;

  if (catalog.length === 0) {
    return (
      <Alert tone="warning" title="No subjects configured yet">
        An admin needs to add classes, subjects and chapters before papers can be generated.
      </Alert>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Class" htmlFor="class">
                <Select
                  id="class"
                  value={className}
                  onChange={(event) => onClassChange(event.target.value)}
                >
                  {classNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Subject" htmlFor="subject">
                <Select
                  id="subject"
                  value={subjectId}
                  onChange={(event) => onSubjectChange(event.target.value)}
                >
                  {subjects.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.subject_name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium text-slate-700">Chapters</p>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedChapters(
                      selectedChapters.length === chapters.length
                        ? []
                        : chapters.map((chapter) => chapter.chapterTitle),
                    )
                  }
                  className="text-[11px] font-medium text-brand-700 hover:text-brand-800"
                >
                  {selectedChapters.length === chapters.length ? "Clear all" : "Select all"}
                </button>
              </div>

              {chapters.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-xs text-slate-500">
                  This subject has no chapters yet.{" "}
                  <Link href="/subjects" className="font-medium text-brand-700">
                    Add chapters
                  </Link>
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {chapters.map((chapter) => {
                    const selected = selectedChapters.includes(chapter.chapterTitle);
                    return (
                      <button
                        key={chapter.chapterTitle}
                        type="button"
                        onClick={() => toggleChapter(chapter.chapterTitle)}
                        className={cn(
                          "flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition",
                          selected
                            ? "border-brand-300 bg-brand-50/60"
                            : "border-slate-200 bg-white hover:border-slate-300",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                            selected
                              ? "border-brand-600 bg-brand-600 text-white"
                              : "border-slate-300 bg-white",
                          )}
                        >
                          {selected ? <Check className="h-3 w-3" aria-hidden /> : null}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-medium text-slate-800">
                            {chapter.chapterTitle}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {chapter.topics.length}{" "}
                            {pluralize(chapter.topics.length, "topic")}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>2 · Blueprint</CardTitle>
            <span className="text-[11px] text-slate-500">
              Marks apply per question in every set
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            {blueprint.map((row) => {
              const meta = QUESTION_TYPE_META[row.type];
              const available = poolForType(counts, row.type);
              const need = row.count * setCount;
              const short = counts !== null && need > available;
              return (
                <div
                  key={row.type}
                  className={cn(
                    "grid items-center gap-2 rounded-lg border px-3 py-2.5 sm:grid-cols-[auto_1fr_5.5rem_5.5rem_7.5rem]",
                    row.enabled ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50/60",
                  )}
                >
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(event) =>
                        updateRow(row.type, { enabled: event.target.checked })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="w-14 text-xs font-semibold text-slate-800">
                      {meta.short}
                    </span>
                  </label>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span>
                      Pool: {countsLoading ? "…" : available} · Need: {need}
                    </span>
                    {short ? (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertTriangle className="h-3 w-3" aria-hidden />
                        short
                      </span>
                    ) : null}
                  </div>

                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="sr-only">Question count</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={row.count}
                      onChange={(event) =>
                        updateRow(row.type, {
                          count: Math.max(0, Number(event.target.value) || 0),
                        })
                      }
                      disabled={!row.enabled}
                      className="h-8 w-full text-xs"
                      aria-label={`${meta.label} count`}
                    />
                  </label>

                  <label className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="sr-only">Marks each</span>
                    <Input
                      type="number"
                      min={0.5}
                      max={50}
                      step={0.5}
                      value={row.marks}
                      onChange={(event) =>
                        updateRow(row.type, {
                          marks: Math.max(0.5, Number(event.target.value) || 0.5),
                        })
                      }
                      disabled={!row.enabled}
                      className="h-8 w-full text-xs"
                      aria-label={`${meta.label} marks each`}
                    />
                  </label>

                  <Select
                    value={row.difficulty}
                    onChange={(event) =>
                      updateRow(row.type, {
                        difficulty: event.target.value as BlueprintRow["difficulty"],
                      })
                    }
                    disabled={!row.enabled}
                    className="h-8 text-xs"
                    aria-label={`${meta.label} difficulty`}
                  >
                    <option value="mixed">Mixed</option>
                    {Object.entries(DIFFICULTY_META).map(([value, item]) => (
                      <option key={value} value={value}>
                        {item.label}
                      </option>
                    ))}
                  </Select>
                </div>
              );
            })}

            {overDraw ? (
              <p className="flex items-start gap-1.5 pt-1 text-[11px] text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                The pool is smaller than the draw. Sets will share questions — add more
                questions or reduce counts for truly distinct variants.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>3 · Paper details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field
              label="Paper title"
              htmlFor="title"
              required
              hint="Printed at the top of every set."
            >
              <Input
                id="title"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  setTitleTouched(true);
                }}
                placeholder="Class 9 Physics — Final Term"
                required
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Duration (minutes)" htmlFor="duration">
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  max={300}
                  step={5}
                  value={duration}
                  onChange={(event) => setDuration(Number(event.target.value) || 120)}
                />
              </Field>

              <Field label="Exam session" htmlFor="session">
                <Input
                  id="session"
                  value={session}
                  onChange={(event) => setSession(event.target.value)}
                  placeholder="2026-27"
                />
              </Field>

              <Field label="Variants" htmlFor="sets">
                <Select
                  id="sets"
                  value={setCount}
                  onChange={(event) => setSetCount(Number(event.target.value))}
                >
                  {SET_LABELS.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {index + 1} {index === 0 ? "set" : "sets"} (
                      {SET_LABELS.slice(0, index + 1).join(", ")})
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field
              label="Instructions"
              htmlFor="instructions"
              hint="One instruction per line."
            >
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={3}
              />
            </Field>

            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={shuffleOptions}
                onChange={(event) => setShuffleOptions(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Shuffle MCQ options per set (the answer key follows the shuffle)
            </label>
          </CardContent>
        </Card>
      </div>

      <aside className="lg:sticky lg:top-20 lg:h-fit">
        <Card>
          <CardHeader>
            <CardTitle>Paper summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="brand">{setCount} set{setCount > 1 ? "s" : ""}</Badge>
              <Badge>{marksPerSet} marks</Badge>
              <Badge>{duration} min</Badge>
            </div>

            <dl className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Chapters</dt>
                <dd className="font-medium text-slate-800">
                  {selectedChapters.length} / {chapters.length}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Questions per set</dt>
                <dd className="font-medium text-slate-800">{questionsPerSet}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Questions to print</dt>
                <dd className="font-medium text-slate-800">{totalPrintRun}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-500">Pool available</dt>
                <dd className={cn("font-medium", overDraw ? "text-amber-700" : "text-slate-800")}>
                  {countsLoading ? "…" : poolTotal}
                </dd>
              </div>
            </dl>

            <div className="space-y-1.5 border-t border-slate-100 pt-3">
              {blueprint.map((row) => (
                <div key={row.type} className="flex items-center justify-between text-[11px]">
                  <span className={row.enabled ? "text-slate-600" : "text-slate-400"}>
                    {QUESTION_TYPE_META[row.type].short}
                  </span>
                  <span className={row.enabled ? "text-slate-800" : "text-slate-400"}>
                    {row.enabled ? row.count : 0} × {row.marks}
                  </span>
                </div>
              ))}
            </div>

            <Button
              type="button"
              onClick={generate}
              disabled={!canGenerate}
              className="w-full"
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Wand2 className="h-4 w-4" aria-hidden />
              )}
              {pending ? "Generating…" : "Generate paper"}
            </Button>

            <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden />
              Generation is deterministic: the seed is stored so you can reproduce the
              paper exactly.
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
