import type { Question, QuestionOption } from "@/types/domain";

export interface ResolvedOption extends QuestionOption {
  label: string;
  isCorrect: boolean;
}

/**
 * Applies the per-set option order recorded at generation time and re-labels
 * options A, B, C… in printed order. The answer key uses the same helper so
 * shuffled options never desynchronise from the key.
 */
export function resolveOptions(
  question: Pick<Question, "options" | "correct_answer">,
  optionOrder: string[] | null | undefined,
): ResolvedOption[] {
  const options = question.options ?? [];
  if (options.length === 0) return [];

  const byKey = new Map(options.map((option) => [option.key, option]));
  const ordered: QuestionOption[] = [];

  (optionOrder ?? []).forEach((key) => {
    const option = byKey.get(key);
    if (option) {
      ordered.push(option);
      byKey.delete(key);
    }
  });
  byKey.forEach((option) => ordered.push(option));

  return ordered.map((option, index) => ({
    ...option,
    label: String.fromCharCode(65 + index),
    isCorrect: option.key === question.correct_answer,
  }));
}

/** Printed label (A/B/C…) of the correct option, or null when not an MCQ. */
export function correctOptionLabel(
  question: Pick<Question, "options" | "correct_answer">,
  optionOrder: string[] | null | undefined,
): string | null {
  const resolved = resolveOptions(question, optionOrder);
  return resolved.find((option) => option.isCorrect)?.label ?? null;
}
