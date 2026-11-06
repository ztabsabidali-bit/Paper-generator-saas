"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import { importQuestionsAction, type ImportSummary } from "@/actions/question-import";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/shell";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { MEDIUM_META, QUESTION_TYPE_META } from "@/lib/constants";
import { CSV_TEMPLATE_COLUMNS, readQuestionCsv } from "@/lib/questions/csv";
import {
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  normalizeQuestionText,
  parseImportRow,
  topicKey,
  type ParsedImportRow,
} from "@/lib/validation/question-import";
import { cn, pluralize, truncate } from "@/lib/utils";
import type { SubjectWithTopics } from "@/types/domain";

type RowStatus = "ready" | "new-topic" | "duplicate" | "error";

interface PreviewRow {
  rowNumber: number;
  status: RowStatus;
  message: string;
  parsed: ParsedImportRow | null;
  raw: Record<string, string>;
}

const STATUS_META: Record<
  RowStatus,
  { label: string; tone: "success" | "brand" | "warning" | "danger" }
> = {
  ready: { label: "Ready", tone: "success" },
  "new-topic": { label: "New chapter", tone: "brand" },
  duplicate: { label: "Duplicate", tone: "warning" },
  error: { label: "Error", tone: "danger" },
};

function placementLabel(value: ParsedImportRow) {
  return [value.chapter, value.topic, value.subtopic].filter(Boolean).join(" › ");
}

export function QuestionImport({
  catalog,
  canManageTopics,
}: {
  catalog: SubjectWithTopics[];
  canManageTopics: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [className, setClassName] = useState(catalog[0]?.class_name ?? "");
  const [subjectId, setSubjectId] = useState(catalog[0]?.id ?? "");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [createMissing, setCreateMissing] = useState(canManageTopics);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const classes = useMemo(
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

  const existingTopicKeys = useMemo(() => {
    const keys = new Set<string>();
    (subject?.topics ?? []).forEach((topic) => {
      keys.add(topicKey(topic.chapter_title, topic.topic_title, topic.subtopic_title));
    });
    return keys;
  }, [subject]);

  const preview = useMemo<PreviewRow[]>(() => {
    const seen = new Set<string>();
    return rows.map((raw, index) => {
      const rowNumber = index + 2;
      const result = parseImportRow(raw);

      if (!result.ok) {
        return {
          rowNumber,
          raw,
          parsed: null,
          status: "error",
          message: result.errors.join(" "),
        };
      }

      const missingTopic = !existingTopicKeys.has(
        topicKey(result.value.chapter, result.value.topic, result.value.subtopic),
      );
      const normalized = normalizeQuestionText(result.value.question_text);
      const duplicate = seen.has(normalized);
      seen.add(normalized);

      if (duplicate) {
        return {
          rowNumber,
          raw,
          parsed: result.value,
          status: "duplicate",
          message: "The same question appears earlier in this file — it will be skipped.",
        };
      }

      if (missingTopic && !createMissing) {
        return {
          rowNumber,
          raw,
          parsed: result.value,
          status: "error",
          message: `"${placementLabel(result.value)}" is not in this subject.`,
        };
      }

      return {
        rowNumber,
        raw,
        parsed: result.value,
        status: missingTopic ? "new-topic" : "ready",
        message: missingTopic ? "This chapter/topic will be created." : "",
      };
    });
  }, [rows, existingTopicKeys, createMissing]);

  const readyCount = preview.filter(
    (row) => row.status === "ready" || row.status === "new-topic",
  ).length;
  const errorCount = preview.filter((row) => row.status === "error").length;
  const duplicateCount = preview.filter((row) => row.status === "duplicate").length;
  const newTopicCount = preview.filter((row) => row.status === "new-topic").length;

  function resetFile() {
    setRows([]);
    setCsvErrors([]);
    setFileName(null);
    setFileError(null);
    setServerError(null);
    setSummary(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function resetAll() {
    resetFile();
    setClassName(catalog[0]?.class_name ?? "");
    setSubjectId(catalog[0]?.id ?? "");
    setCreateMissing(canManageTopics);
  }

  function onClassChange(value: string) {
    setClassName(value);
    const first = catalog.find((subject) => subject.class_name === value);
    setSubjectId(first?.id ?? "");
    resetFile();
  }

  function onSubjectChange(value: string) {
    setSubjectId(value);
    resetFile();
  }

  async function handleFile(file: File | null | undefined) {
    resetFile();
    if (!file) return;

    if (!/\.csv$/i.test(file.name)) {
      setFileError("Choose a .csv file. In Excel use File → Save as → CSV UTF-8.");
      return;
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setFileError(
        `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Import at most 2 MB per file.`,
      );
      return;
    }

    const text = await file.text();
    const result = readQuestionCsv(text);

    if (result.rows.length === 0) {
      setFileError(
        result.errors[0] ??
          "No question rows were found. The first line must be the header row.",
      );
      return;
    }
    if (result.rows.length > MAX_IMPORT_ROWS) {
      setFileError(
        `This file has ${result.rows.length} rows. Import at most ${MAX_IMPORT_ROWS} rows at a time.`,
      );
      return;
    }

    setFileName(file.name);
    setRows(result.rows);
    setCsvErrors(result.errors);
  }

  async function runImport() {
    if (!subjectId || readyCount === 0) return;
    setPending(true);
    setServerError(null);
    setSummary(null);

    try {
      const result = await importQuestionsAction({
        subject_id: subjectId,
        create_missing_topics: createMissing,
        rows,
      });

      if (!result.ok) {
        setServerError(result.error);
        return;
      }

      setSummary(result.data);
      setRows([]);
      setFileName(null);
      if (fileRef.current) fileRef.current.value = "";
      // Pick up chapters created by this import in the preview of the next file.
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setServerError(
        /body|payload|size|too large|413/i.test(message)
          ? "That file is too large to send in one request. Split it into smaller CSV files and import each one."
          : "The import could not be completed. Check your connection and try again.",
      );
    } finally {
      setPending(false);
    }
  }

  if (catalog.length === 0) {
    return (
      <Alert tone="warning" title="No subjects configured yet">
        Add a class, subject and at least one chapter before importing questions.
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

      {summary ? (
        <Alert
          tone={summary.imported > 0 ? "success" : "warning"}
          title={`Imported ${summary.imported} ${pluralize(summary.imported, "question")}`}
        >
          <p>
            {summary.duplicates} duplicate{summary.duplicates === 1 ? "" : "s"} skipped ·{" "}
            {summary.invalid} invalid row{summary.invalid === 1 ? "" : "s"} skipped
            {summary.createdTopics > 0
              ? ` · ${summary.createdTopics} chapter${
                  summary.createdTopics === 1 ? "" : "s"
                } created`
              : ""}
            .
          </p>

          {summary.errors.length > 0 ? (
            <details className="mt-2">
              <summary className="cursor-pointer font-medium">
                Show row problems ({summary.errors.length})
              </summary>
              <ul className="mt-1.5 list-disc space-y-1 pl-4">
                {summary.errors.slice(0, 20).map((error) => (
                  <li key={`${error.row}-${error.message}`}>
                    Row {error.row}: {error.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/questions" className={buttonClasses("primary", "sm")}>
              Open the question bank
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <Button variant="outline" size="sm" onClick={resetAll}>
              Import another file
            </Button>
          </div>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>1 · Where do these questions go?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Class" htmlFor="import-class">
              <Select
                id="import-class"
                value={className}
                onChange={(event) => onClassChange(event.target.value)}
              >
                {classes.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Subject" htmlFor="import-subject">
              <Select
                id="import-subject"
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

          <p className="text-[11px] text-slate-500">
            Chapters and topics in the file are matched inside this subject.{" "}
            {subject
              ? `${subject.topics.length} placement ${pluralize(subject.topics.length, "row")} available.`
              : null}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>2 · Upload the CSV</CardTitle>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <a
              href="/templates/questions-template.csv"
              download
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Download template
            </a>
            <a
              href="/templates/ai-import-brief.md"
              download
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <FileText className="h-3.5 w-3.5" aria-hidden />
              AI agent brief
            </a>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <label
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void handleFile(event.dataTransfer.files?.[0]);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition",
              dragging
                ? "border-brand-400 bg-brand-50/60"
                : "border-slate-300 bg-slate-50/40 hover:border-slate-400",
            )}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                void handleFile(file);
              }}
            />
            <FileSpreadsheet className="h-6 w-6 text-slate-400" aria-hidden />
            <span className="text-sm font-medium text-slate-800">
              {fileName ?? "Drop a .csv file here, or click to choose"}
            </span>
            <span className="text-[11px] text-slate-500">
              UTF-8 CSV · up to {MAX_IMPORT_ROWS} rows and 2 MB
            </span>
          </label>

          {fileError ? <Alert tone="danger">{fileError}</Alert> : null}
          {csvErrors.length > 0 ? (
            <Alert tone="warning" title="The file has formatting problems">
              <ul className="list-disc space-y-1 pl-4">
                {csvErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          <details className="text-xs text-slate-600">
            <summary className="cursor-pointer font-medium text-slate-700">
              Expected columns
            </summary>
            <p className="mt-2 font-mono text-[11px] leading-relaxed text-slate-500">
              {CSV_TEMPLATE_COLUMNS.join(" · ")}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] text-slate-500">
              <li>
                <span className="font-medium">type</span> is mcq, short or long. Marks default to
                1 / 3 / 8.
              </li>
              <li>
                <span className="font-medium">correct_answer</span> is a letter (A–D) or the exact
                option text for MCQs; the model answer for short/long.
              </li>
              <li>
                <span className="font-medium">chapter</span> is required; topic and subtopic are
                optional.
              </li>
              <li>
                Save from Excel as <span className="font-medium">CSV UTF-8</span> so Urdu and LaTeX
                survive.
              </li>
            </ul>
          </details>

          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={createMissing}
              disabled={!canManageTopics}
              onChange={(event) => setCreateMissing(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-50"
            />
            <span>
              Create missing chapters/topics
              {!canManageTopics ? (
                <span className="block text-[11px] text-slate-500">
                  Only admins can add chapters. Ask your institution admin.
                </span>
              ) : null}
            </span>
          </label>
        </CardContent>
      </Card>

      {rows.length > 0 ? (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>3 · Review {rows.length} rows</CardTitle>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="success">{readyCount} ready</Badge>
              {newTopicCount > 0 ? (
                <Badge tone="brand">
                  {newTopicCount} new chapter{newTopicCount === 1 ? "" : "s"}
                </Badge>
              ) : null}
              {duplicateCount > 0 ? (
                <Badge tone="warning">{duplicateCount} duplicates</Badge>
              ) : null}
              {errorCount > 0 ? <Badge tone="danger">{errorCount} errors</Badge> : null}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-[28rem] overflow-y-auto overscroll-contain rounded-lg border border-slate-200">
              <Table>
                <THead className="sticky top-0 z-10">
                  <TR>
                    <TH className="w-14">Row</TH>
                    <TH className="w-32">Status</TH>
                    <TH>Question</TH>
                    <TH className="hidden lg:table-cell">Placement</TH>
                    <TH className="hidden sm:table-cell">Type</TH>
                    <TH className="w-16 text-right">Marks</TH>
                  </TR>
                </THead>
                <TBody>
                  {preview.map((row) => {
                    const status = STATUS_META[row.status];
                    return (
                      <TR key={row.rowNumber} className={row.status === "error" ? "bg-rose-50/40" : ""}>
                        <TD className="text-[11px] text-slate-500">{row.rowNumber}</TD>
                        <TD>
                          <Badge tone={status.tone}>{status.label}</Badge>
                        </TD>
                        <TD className="min-w-[16rem]">
                          <p className="text-xs leading-relaxed text-slate-800">
                            {row.parsed
                              ? truncate(row.parsed.question_text.replace(/[#*_`$]/g, ""), 140)
                              : "—"}
                          </p>
                          {row.message ? (
                            <p
                              className={cn(
                                "mt-1 text-[11px]",
                                row.status === "error"
                                  ? "text-rose-600"
                                  : row.status === "duplicate"
                                    ? "text-amber-700"
                                    : "text-slate-500",
                              )}
                            >
                              {row.message}
                            </p>
                          ) : null}
                        </TD>
                        <TD className="hidden text-[11px] text-slate-500 lg:table-cell">
                          {row.parsed
                            ? [row.parsed.chapter, row.parsed.topic, row.parsed.subtopic]
                                .filter(Boolean)
                                .join(" › ")
                            : "—"}
                        </TD>
                        <TD className="hidden text-[11px] text-slate-600 sm:table-cell">
                          {row.parsed
                            ? `${QUESTION_TYPE_META[row.parsed.question_type].short}${
                                row.parsed.medium !== "english"
                                  ? ` · ${MEDIUM_META[row.parsed.medium].label}`
                                  : ""
                              }`
                            : "—"}
                        </TD>
                        <TD className="text-right text-[11px] text-slate-600">
                          {row.parsed ? row.parsed.marks : "—"}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="max-w-xl text-[11px] leading-relaxed text-slate-500">
                Valid rows are imported even when others have problems. Questions already in this
                subject are skipped as duplicates.
              </p>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={resetFile} disabled={pending}>
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Clear
                </Button>
                <Button
                  onClick={runImport}
                  disabled={pending || readyCount === 0 || !subjectId}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Upload className="h-4 w-4" aria-hidden />
                  )}
                  {pending
                    ? "Importing…"
                    : `Import ${readyCount} ${pluralize(readyCount, "question")}`}
                </Button>
              </div>
            </div>

            {errorCount > 0 && readyCount === 0 ? (
              <p className="flex items-start gap-1.5 text-[11px] text-amber-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                Nothing can be imported yet. Fix the rows above or add the missing chapters.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
