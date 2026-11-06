"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { Check, Eye, Loader2, Plus, Trash2 } from "lucide-react";
import { saveQuestionAction } from "@/actions/questions";
import { MathText } from "@/components/questions/math-text";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/shell";
import { groupChapters, topicLabel } from "@/lib/catalog";
import { DIFFICULTY_META, MEDIUM_META, QUESTION_TYPE_META } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Difficulty, Medium, QuestionType, TextDirection } from "@/types/database";
import type { QuestionWithTopic, SubjectWithTopics } from "@/types/domain";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

const SNIPPETS = [
  { label: "x", title: "Inline math", value: "$x$" },
  { label: "x²", title: "Power", value: "$x^{2}$" },
  { label: "a⁄b", title: "Fraction", value: "$\\frac{a}{b}$" },
  { label: "√", title: "Square root", value: "$\\sqrt{x}$" },
  { label: "⁴√", title: "Fourth root", value: "$\\sqrt[4]{x}$" },
  { label: "∑", title: "Summation", value: "$\\sum_{i=1}^{n} i$" },
  { label: "∫", title: "Integral", value: "$\\int_{a}^{b} f(x)\\,dx$" },
  { label: "Block", title: "Display math", value: "$$\n\n$$" },
];

export function QuestionForm({
  catalog,
  question,
}: {
  catalog: SubjectWithTopics[];
  question?: QuestionWithTopic | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const textRef = useRef<HTMLTextAreaElement>(null);

  const initialTopic = question?.topic ?? null;
  const initialSubject =
    catalog.find((subject) => subject.id === initialTopic?.subject_id) ?? null;
  const fallbackSubject = catalog[0] ?? null;
  const initialSubjectWithTopics = initialSubject ?? fallbackSubject;
  const initialChapter =
    initialTopic?.chapter_title ??
    groupChapters(initialSubjectWithTopics)[0]?.chapterTitle ??
    "";
  const initialTopicId =
    initialTopic?.id ??
    groupChapters(initialSubjectWithTopics)[0]?.topics[0]?.id ??
    "";

  const [className, setClassName] = useState(
    initialSubjectWithTopics?.class_name ?? "",
  );
  const [subjectId, setSubjectId] = useState(initialSubjectWithTopics?.id ?? "");
  const [chapterTitle, setChapterTitle] = useState(initialChapter);
  const [topicId, setTopicId] = useState(initialTopicId);

  const [type, setType] = useState<QuestionType>(question?.question_type ?? "mcq");
  const [difficulty, setDifficulty] = useState<Difficulty>(
    question?.difficulty ?? "medium",
  );
  const [medium, setMedium] = useState<Medium>(question?.medium ?? "english");
  const [direction, setDirection] = useState<TextDirection>(
    question?.text_direction ?? MEDIUM_META[question?.medium ?? "english"].direction,
  );
  const [marks, setMarks] = useState(String(question?.marks ?? 1));
  const [text, setText] = useState(question?.question_text ?? "");
  const [options, setOptions] = useState<string[]>(
    question?.options?.length ? question.options.map((option) => option.text) : ["", "", "", ""],
  );
  const [correctIndex, setCorrectIndex] = useState(() => {
    const index = question?.options?.findIndex(
      (option) => option.key === question.correct_answer,
    );
    return index && index > 0 ? index : 0;
  });
  const [answerText, setAnswerText] = useState(
    question && question.question_type !== "mcq" ? (question.correct_answer ?? "") : "",
  );
  const [explanation, setExplanation] = useState(question?.explanation ?? "");
  const [isActive, setIsActive] = useState(question?.is_active ?? true);

  const subjects = useMemo(
    () => catalog.filter((subject) => subject.class_name === className),
    [catalog, className],
  );
  const selectedSubject = useMemo(
    () => catalog.find((subject) => subject.id === subjectId) ?? null,
    [catalog, subjectId],
  );
  const chapters = useMemo(() => groupChapters(selectedSubject), [selectedSubject]);
  const topics = useMemo(
    () => chapters.find((chapter) => chapter.chapterTitle === chapterTitle)?.topics ?? [],
    [chapters, chapterTitle],
  );

  const classNames = useMemo(
    () => [...new Set(catalog.map((subject) => subject.class_name))],
    [catalog],
  );

  function applySubject(subject: SubjectWithTopics | undefined) {
    const nextChapters = groupChapters(subject);
    setSubjectId(subject?.id ?? "");
    setChapterTitle(nextChapters[0]?.chapterTitle ?? "");
    setTopicId(nextChapters[0]?.topics[0]?.id ?? "");
  }

  function onClassChange(value: string) {
    setClassName(value);
    applySubject(catalog.find((subject) => subject.class_name === value));
  }

  function onSubjectChange(value: string) {
    applySubject(catalog.find((subject) => subject.id === value));
  }

  function onChapterChange(value: string) {
    setChapterTitle(value);
    const chapter = chapters.find((item) => item.chapterTitle === value);
    setTopicId(chapter?.topics[0]?.id ?? "");
  }

  function onTypeChange(value: QuestionType) {
    setType(value);
    setMarks(String(QUESTION_TYPE_META[value].defaultMarks));
  }

  function onMediumChange(value: Medium) {
    setMedium(value);
    setDirection(MEDIUM_META[value].direction);
  }

  function insertSnippet(snippet: string) {
    const element = textRef.current;
    if (!element) {
      setText((current) => `${current}${snippet}`);
      return;
    }
    const start = element.selectionStart ?? text.length;
    const end = element.selectionEnd ?? start;
    const selected = text.slice(start, end);
    const insertion = selected ? snippet.replace("x", selected) : snippet;
    const next = text.slice(0, start) + insertion + text.slice(end);
    setText(next);
    requestAnimationFrame(() => {
      element.focus();
      const caret = start + insertion.length;
      element.setSelectionRange(caret, caret);
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const payload = {
      id: question?.id,
      topic_id: topicId,
      question_type: type,
      question_text: text,
      options:
        type === "mcq"
          ? options.map((option, index) => ({ key: LETTERS[index], text: option }))
          : null,
      correct_answer: type === "mcq" ? LETTERS[correctIndex] : answerText || null,
      medium,
      difficulty,
      marks: Number(marks),
      text_direction: direction,
      explanation: explanation || null,
      is_active: isActive,
    };

    startTransition(async () => {
      const result = await saveQuestionAction(payload);
      if (!result.ok) {
        setServerError(result.error);
        setFieldErrors(result.fieldErrors ?? {});
        return;
      }
      router.push("/questions");
      router.refresh();
    });
  }

  if (catalog.length === 0) {
    return (
      <Alert tone="warning" title="No subjects configured yet">
        Add a class, subject and at least one chapter before writing questions.
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

        <Card>
          <CardHeader>
            <CardTitle>Placement</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Class" htmlFor="class" required>
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

            <Field label="Subject" htmlFor="subject" required>
              <Select
                id="subject"
                value={subjectId}
                onChange={(event) => onSubjectChange(event.target.value)}
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.subject_name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Chapter" htmlFor="chapter" required>
              <Select
                id="chapter"
                value={chapterTitle}
                onChange={(event) => onChapterChange(event.target.value)}
              >
                {chapters.map((chapter) => (
                  <option key={chapter.chapterTitle} value={chapter.chapterTitle}>
                    {chapter.chapterTitle}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Topic"
              htmlFor="topic"
              required
              error={fieldErrors.topic_id?.[0]}
            >
              <Select
                id="topic"
                value={topicId}
                onChange={(event) => setTopicId(event.target.value)}
              >
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topicLabel(topic)}
                  </option>
                ))}
              </Select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Question content</CardTitle>
            <div className="flex flex-wrap gap-1">
              {SNIPPETS.map((snippet) => (
                <button
                  key={snippet.label}
                  type="button"
                  title={snippet.title}
                  onClick={() => insertSnippet(snippet.value)}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                >
                  {snippet.label}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Type" htmlFor="type">
                <Select
                  id="type"
                  value={type}
                  onChange={(event) => onTypeChange(event.target.value as QuestionType)}
                >
                  {Object.entries(QUESTION_TYPE_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Difficulty" htmlFor="difficulty">
                <Select
                  id="difficulty"
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                >
                  {Object.entries(DIFFICULTY_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Marks"
                htmlFor="marks"
                required
                error={fieldErrors.marks?.[0]}
              >
                <Input
                  id="marks"
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={marks}
                  onChange={(event) => setMarks(event.target.value)}
                  required
                />
              </Field>

              <Field label="Medium" htmlFor="medium">
                <Select
                  id="medium"
                  value={medium}
                  onChange={(event) => onMediumChange(event.target.value as Medium)}
                >
                  {Object.entries(MEDIUM_META).map(([value, meta]) => (
                    <option key={value} value={value}>
                      {meta.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <Field
              label="Question text"
              htmlFor="question_text"
              hint="Markdown + LaTeX. Wrap inline math in $…$ and display math in $$…$$."
              required
              error={fieldErrors.question_text?.[0]}
            >
              <Textarea
                id="question_text"
                ref={textRef}
                value={text}
                onChange={(event) => setText(event.target.value)}
                rows={6}
                className="font-mono text-[13px]"
                dir={direction}
                placeholder={
                  direction === "rtl"
                    ? "سوال یہاں لکھیں…"
                    : "e.g. A body accelerates at $2\\,\\text{m/s}^2$ for 5 s. Find the distance covered."
                }
                required
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Text direction</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {(["ltr", "rtl"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setDirection(value)}
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition",
                      direction === value
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    {value === "ltr" ? "LTR" : "RTL · اردو"}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-500">
                Auto-set from the medium; override for mixed-language questions.
              </span>
            </div>
          </CardContent>
        </Card>

        {type === "mcq" ? (
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>Options</CardTitle>
              <span className="text-[11px] text-slate-500">
                Click a label to mark the correct answer
              </span>
            </CardHeader>
            <CardContent className="space-y-2">
              {fieldErrors.options?.[0] ? (
                <p className="text-xs text-rose-600">{fieldErrors.options[0]}</p>
              ) : null}

              {options.map((option, index) => {
                const letter = LETTERS[index];
                const isCorrect = correctIndex === index;
                return (
                  <div key={letter} className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Mark option ${letter} correct`}
                      onClick={() => setCorrectIndex(index)}
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold transition",
                        isCorrect
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                      )}
                    >
                      {isCorrect ? <Check className="h-4 w-4" aria-hidden /> : letter}
                    </button>
                    <Input
                      value={option}
                      onChange={(event) => {
                        const next = [...options];
                        next[index] = event.target.value;
                        setOptions(next);
                      }}
                      placeholder={`Option ${letter}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (options.length <= 2) return;
                        setOptions(options.filter((_, i) => i !== index));
                        if (correctIndex >= options.length - 1) {
                          setCorrectIndex(Math.max(0, options.length - 2));
                        }
                      }}
                      disabled={options.length <= 2}
                      aria-label={`Remove option ${letter}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                );
              })}

              {fieldErrors.correct_answer?.[0] && type === "mcq" ? (
                <p className="text-xs text-rose-600">{fieldErrors.correct_answer[0]}</p>
              ) : null}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOptions([...options, ""])}
                disabled={options.length >= LETTERS.length}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Add option
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Model answer</CardTitle>
            </CardHeader>
            <CardContent>
              <Field
                label="Answer / marking points"
                htmlFor="answer"
                hint="Shown on the automatic answer key page."
                error={fieldErrors.correct_answer?.[0]}
              >
                <Textarea
                  id="answer"
                  value={answerText}
                  onChange={(event) => setAnswerText(event.target.value)}
                  rows={4}
                  dir={direction}
                  placeholder="Key points the marker should look for…"
                />
              </Field>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Explanation (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Explanation" htmlFor="explanation">
              <Textarea
                id="explanation"
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                rows={3}
                placeholder="Internal note or worked solution. Not printed on the paper."
              />
            </Field>

            {question ? (
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                Active in the question bank
              </label>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <Link href="/questions" className={buttonClasses("outline", "md")}>
            Cancel
          </Link>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {question ? "Save changes" : "Add question"}
          </Button>
        </div>
      </div>

      <aside className="xl:sticky xl:top-20 xl:h-fit">
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-slate-400" aria-hidden />
            <CardTitle>Live preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone="brand">{QUESTION_TYPE_META[type].short}</Badge>
              <Badge className={DIFFICULTY_META[difficulty].className}>
                {DIFFICULTY_META[difficulty].label}
              </Badge>
              <Badge>{MEDIUM_META[medium].label}</Badge>
              <Badge>{marks || 0} marks</Badge>
            </div>

            {text.trim() ? (
              <MathText content={text} direction={direction} />
            ) : (
              <p className="text-sm text-slate-400">
                Start typing to preview your question with rendered math.
              </p>
            )}

            {type === "mcq" ? (
              <ul className="space-y-1.5">
                {options.map((option, index) => (
                  <li
                    key={LETTERS[index]}
                    className={cn(
                      "flex gap-2 rounded-md px-2 py-1.5 text-sm",
                      correctIndex === index
                        ? "bg-emerald-50 text-emerald-900 ring-1 ring-inset ring-emerald-200"
                        : "text-slate-700",
                    )}
                  >
                    <span className="font-medium text-slate-400">{LETTERS[index]}.</span>
                    <MathText content={option || "—"} direction={direction} compact />
                  </li>
                ))}
              </ul>
            ) : null}

            {question?.created_at ? (
              <p className="border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                Last updated {new Date(question.updated_at).toLocaleString()}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
