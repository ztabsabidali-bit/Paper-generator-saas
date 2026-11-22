import { QUESTION_TYPE_META } from "@/lib/constants";
import type { QuestionType } from "@/types/database";

const SECTION_TYPE_ORDER: QuestionType[] = ["mcq", "short", "long"];

/** Urdu wording for the generated section titles. */
const URDU_SECTIONS: Record<QuestionType, { letter: string; label: string }> = {
  mcq: { letter: "الف", label: "کثیر الانتخابی سوالات" },
  short: { letter: "ب", label: "مختصر سوالات" },
  long: { letter: "ج", label: "طویل سوالات" },
};

const URDU_LETTERS: Record<string, string> = {
  a: "الف",
  b: "ب",
  c: "ج",
  d: "د",
  e: "ہ",
  f: "و",
};

/**
 * Which question type a stored section title describes. Titles are generated as
 * `Section A — Multiple choice`, but a teacher may have kept an older wording,
 * so match on the type label rather than the exact string.
 */
export function sectionQuestionType(section: string): QuestionType | null {
  const normalized = section.toLowerCase();
  for (const type of SECTION_TYPE_ORDER) {
    if (normalized.includes(QUESTION_TYPE_META[type].label.toLowerCase())) return type;
  }
  return null;
}

/**
 * The section title to print. English papers keep the stored text; Urdu papers
 * get the equivalent heading, e.g. `حصہ الف — کثیر الانتخابی سوالات`. Custom
 * titles that do not describe a question type are left untouched.
 */
export function sectionHeading(section: string, urdu: boolean): string {
  if (!urdu) return section;

  const type = sectionQuestionType(section);
  if (!type) return section;

  const letter = /section\s+([a-f])\b/i.exec(section)?.[1]?.toLowerCase();
  const urduLetter = letter ? (URDU_LETTERS[letter] ?? URDU_SECTIONS[type].letter) : URDU_SECTIONS[type].letter;

  return `حصہ ${urduLetter} — ${URDU_SECTIONS[type].label}`;
}
