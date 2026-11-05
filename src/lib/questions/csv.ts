import Papa from "papaparse";

/** Column order used by the downloadable template. */
export const CSV_TEMPLATE_COLUMNS = [
  "chapter",
  "topic",
  "subtopic",
  "type",
  "question_text",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_answer",
  "difficulty",
  "marks",
  "medium",
  "direction",
  "explanation",
] as const;

export interface QuestionCsvRow {
  [key: string]: string;
}

export interface QuestionCsvResult {
  rows: QuestionCsvRow[];
  headers: string[];
  errors: string[];
}

/** Lowercase, trim, and turn spaces/dashes into underscores. */
export function normalizeCsvHeader(header: string) {
  return header
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * RFC 4180 parsing via PapaParse: quoted commas, embedded newlines and a UTF-8
 * BOM (what Excel writes) are all handled. Only structural problems are
 * reported here; per-row validation happens in `parseImportRow`.
 */
export function readQuestionCsv(text: string): QuestionCsvResult {
  const cleaned = text.replace(/^\uFEFF/, "");

  const parsed = Papa.parse<QuestionCsvRow>(cleaned, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: normalizeCsvHeader,
  });

  const rows: QuestionCsvRow[] = [];
  for (const row of parsed.data) {
    if (!row || typeof row !== "object") continue;
    const values = Object.entries(row).filter(([key]) => key !== "__parsed_extra");
    const hasContent = values.some(
      ([, value]) => typeof value === "string" && value.trim() !== "",
    );
    if (hasContent) rows.push(row);
  }

  const errors: string[] = [];
  for (const problem of parsed.errors) {
    if (problem.type === "Quotes" || problem.type === "Delimiter") {
      const line = typeof problem.row === "number" ? problem.row + 2 : "?";
      errors.push(`Line ${line}: ${problem.message}`);
    }
  }

  return {
    rows,
    headers: parsed.meta.fields ?? [],
    errors: errors.slice(0, 5),
  };
}
