import { z } from "zod";
import { MEDIUM_META, QUESTION_TYPE_META } from "@/lib/constants";
import type {
  Difficulty,
  Medium,
  QuestionType,
  TextDirection,
} from "@/types/database";
import type { QuestionOption } from "@/types/domain";

/** Hard limits shared by the client preview and the server action. */
export const MAX_IMPORT_ROWS = 500;
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

const MAX_QUESTION_TEXT = 10_000;
const MAX_ANSWER_TEXT = 5_000;
const MAX_EXPLANATION = 10_000;
const OPTION_COLUMNS = [
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "option_e",
  "option_f",
  "option_g",
  "option_h",
] as const;

/**
 * Column names accepted in the CSV. The first entry is the canonical name
 * written by the template; the rest are forgiving aliases for hand-made files.
 */
const COLUMN_ALIASES: Record<string, readonly string[]> = {
  chapter: ["chapter", "chapter_title"],
  topic: ["topic", "topic_title"],
  subtopic: ["subtopic", "sub_topic", "subtopic_title"],
  type: ["type", "question_type", "qtype"],
  question_text: ["question_text", "question", "text", "question_statement"],
  option_a: ["option_a", "a", "opt_a", "choice_a"],
  option_b: ["option_b", "b", "opt_b", "choice_b"],
  option_c: ["option_c", "c", "opt_c", "choice_c"],
  option_d: ["option_d", "d", "opt_d", "choice_d"],
  option_e: ["option_e", "e", "opt_e", "choice_e"],
  option_f: ["option_f", "f", "opt_f", "choice_f"],
  option_g: ["option_g", "g", "opt_g", "choice_g"],
  option_h: ["option_h", "h", "opt_h", "choice_h"],
  correct_answer: ["correct_answer", "answer", "correct", "key"],
  difficulty: ["difficulty", "level"],
  marks: ["marks", "mark"],
  medium: ["medium", "language"],
  text_direction: ["text_direction", "direction", "dir"],
  explanation: ["explanation", "note", "notes"],
};

const TYPE_ALIASES: Record<string, QuestionType> = {
  mcq: "mcq",
  mcqs: "mcq",
  "multiple choice": "mcq",
  "multiple choice question": "mcq",
  objective: "mcq",
  short: "short",
  "short question": "short",
  subjective: "short",
  long: "long",
  "long question": "long",
  essay: "long",
  extended: "long",
};

const MEDIUM_ALIASES: Record<string, Medium> = {
  english: "english",
  eng: "english",
  urdu: "urdu",
  ur: "urdu",
  bilingual: "bilingual",
  both: "bilingual",
  mixed: "bilingual",
};

export interface ParsedImportRow {
  chapter: string;
  topic: string | null;
  subtopic: string | null;
  question_type: QuestionType;
  question_text: string;
  options: QuestionOption[] | null;
  correct_answer: string | null;
  difficulty: Difficulty;
  marks: number;
  medium: Medium;
  text_direction: TextDirection;
  explanation: string | null;
}

export type ImportRowResult =
  | { ok: true; value: ParsedImportRow }
  | { ok: false; errors: string[] };

/** Collapse whitespace and case so names match regardless of typing. */
export function normalizeLabel(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeQuestionText(value: string) {
  return normalizeLabel(value);
}

/** Stable key for a chapter/topic/subtopic placement. */
export function topicKey(
  chapter: string,
  topic: string | null | undefined,
  subtopic: string | null | undefined,
) {
  return JSON.stringify([
    normalizeLabel(chapter),
    normalizeLabel(topic ?? ""),
    normalizeLabel(subtopic ?? ""),
  ]);
}

function field(row: Record<string, string>, name: keyof typeof COLUMN_ALIASES) {
  for (const alias of COLUMN_ALIASES[name]) {
    const value = row[alias];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return "";
}

function parseType(raw: string): QuestionType | null {
  return TYPE_ALIASES[normalizeLabel(raw)] ?? null;
}

function parseDifficulty(raw: string): Difficulty | null {
  const value = normalizeLabel(raw);
  if (value === "easy" || value === "medium" || value === "hard") return value;
  if (value === "e") return "easy";
  if (value === "m") return "medium";
  if (value === "h") return "hard";
  return null;
}

function parseMedium(raw: string): Medium | null {
  return MEDIUM_ALIASES[normalizeLabel(raw)] ?? null;
}

function parseDirection(raw: string): TextDirection | null {
  const value = normalizeLabel(raw);
  if (value === "ltr" || value === "rtl") return value;
  return null;
}

/**
 * Turns one raw CSV row (already header-normalised) into a question payload.
 * Returns every problem at once so the preview can explain the row.
 */
export function parseImportRow(row: Record<string, string>): ImportRowResult {
  const errors: string[] = [];

  const chapter = field(row, "chapter").slice(0, 200);
  if (!chapter) errors.push("Chapter is required.");
  if (field(row, "chapter").length > 200) errors.push("Chapter name is too long (max 200).");

  const topic = field(row, "topic").slice(0, 200) || null;
  const subtopic = field(row, "subtopic").slice(0, 200) || null;

  const typeRaw = field(row, "type");
  const questionType = parseType(typeRaw);
  if (!typeRaw) errors.push("Type is required (mcq, short or long).");
  else if (!questionType) errors.push(`Unknown type "${typeRaw}" — use mcq, short or long.`);

  const text = field(row, "question_text").trim();
  if (text.length < 3) errors.push("Question text is too short.");
  if (text.length > MAX_QUESTION_TEXT) {
    errors.push(`Question text is too long (max ${MAX_QUESTION_TEXT} characters).`);
  }

  const difficultyRaw = field(row, "difficulty");
  const difficulty = difficultyRaw ? parseDifficulty(difficultyRaw) : "medium";
  if (difficultyRaw && !difficulty) {
    errors.push(`Unknown difficulty "${difficultyRaw}" — use easy, medium or hard.`);
  }

  const mediumRaw = field(row, "medium");
  const medium = mediumRaw ? parseMedium(mediumRaw) : "english";
  if (mediumRaw && !medium) {
    errors.push(`Unknown medium "${mediumRaw}" — use english, urdu or bilingual.`);
  }

  const directionRaw = field(row, "text_direction");
  const direction = directionRaw
    ? parseDirection(directionRaw)
    : MEDIUM_META[medium ?? "english"].direction;
  if (directionRaw && !direction) {
    errors.push(`Unknown direction "${directionRaw}" — use ltr or rtl.`);
  }

  const marksRaw = field(row, "marks");
  const defaultMarks = questionType ? QUESTION_TYPE_META[questionType].defaultMarks : 1;
  const marks = marksRaw ? Number(marksRaw) : defaultMarks;
  if (marksRaw && (!Number.isFinite(marks) || marks <= 0 || marks > 100)) {
    errors.push(`Marks must be greater than 0 and at most 100 (got "${marksRaw}").`);
  }

  const answerRaw = field(row, "correct_answer");
  if (answerRaw.length > MAX_ANSWER_TEXT) {
    errors.push(`Answer is too long (max ${MAX_ANSWER_TEXT} characters).`);
  }

  const explanationRaw = field(row, "explanation");
  if (explanationRaw.length > MAX_EXPLANATION) {
    errors.push(`Explanation is too long (max ${MAX_EXPLANATION} characters).`);
  }

  let options: QuestionOption[] | null = null;
  let correctAnswer: string | null = answerRaw || null;

  if (questionType === "mcq") {
    // Keep the original column letter so "C" still resolves when option_b is
    // blank and the surviving options are re-keyed A, B, …
    const choices = OPTION_COLUMNS.map((column, index) => ({
      sourceKey: String.fromCharCode(65 + index),
      text: field(row, column),
    })).filter((choice) => choice.text !== "");

    if (choices.length < 2) {
      errors.push("MCQ rows need at least two options (option_a, option_b, …).");
    } else {
      options = choices.map((choice, index) => ({
        key: String.fromCharCode(65 + index),
        text: choice.text.slice(0, 1000),
      }));
    }

    if (!answerRaw) {
      errors.push("Correct answer is required for MCQ rows (a letter A–D or the option text).");
    } else if (options) {
      const upper = answerRaw.trim().toUpperCase();
      const letterIndex = /^[A-H]$/.test(upper) ? upper.charCodeAt(0) - 65 : -1;
      if (letterIndex >= 0) {
        const matchIndex = choices.findIndex((choice) => choice.sourceKey === upper);
        if (matchIndex === -1) {
          errors.push(
            `Correct answer "${answerRaw}" does not match a filled option column.`,
          );
        } else {
          correctAnswer = options[matchIndex].key;
        }
      } else {
        const match = options.find(
          (option) => normalizeLabel(option.text) === normalizeLabel(answerRaw),
        );
        if (match) {
          correctAnswer = match.key;
        } else {
          errors.push(
            "Correct answer must be a letter (A–H) or exactly match one of the options.",
          );
        }
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      chapter,
      topic,
      subtopic,
      question_type: questionType as QuestionType,
      question_text: text,
      options,
      correct_answer: correctAnswer,
      difficulty: (difficulty ?? "medium") as Difficulty,
      marks,
      medium: (medium ?? "english") as Medium,
      text_direction: (direction ?? "ltr") as TextDirection,
      explanation: explanationRaw || null,
    },
  };
}

/** Envelope the browser sends to the server action. Rows stay raw. */
export const importEnvelopeSchema = z.object({
  subject_id: z.uuid("Select a subject"),
  create_missing_topics: z.boolean(),
  rows: z
    .array(z.record(z.string(), z.string().max(20_000)))
    .min(1, "The file has no question rows.")
    .max(MAX_IMPORT_ROWS, `Import at most ${MAX_IMPORT_ROWS} rows at a time.`),
});

export type ImportEnvelope = z.infer<typeof importEnvelopeSchema>;
