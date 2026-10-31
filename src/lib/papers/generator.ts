import { QUESTION_TYPE_META, SET_LABELS } from "@/lib/constants";
import type { Difficulty, QuestionType } from "@/types/database";
import type { QuestionOption } from "@/types/domain";
import { mulberry32, shuffle } from "./prng";

export interface GeneratorQuestion {
  id: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  options: QuestionOption[] | null;
}

export interface SectionSpec {
  type: QuestionType;
  enabled: boolean;
  count: number;
  marks: number;
  difficulty: "mixed" | Difficulty;
}

export interface GeneratorInput {
  blueprint: SectionSpec[];
  setCount: number;
  shuffleOptions: boolean;
  seed: number;
}

export interface GeneratedItem {
  questionId: string;
  section: string;
  order: number;
  marks: number;
  optionOrder: string[] | null;
}

export interface GeneratedSet {
  label: string;
  seed: number;
  items: GeneratedItem[];
  totalMarks: number;
}

export interface GenerationResult {
  sets: GeneratedSet[];
  warnings: string[];
  totalMarks: number;
}

const SECTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

function buildItem(
  question: GeneratorQuestion,
  section: string,
  marks: number,
  shuffleOptions: boolean,
  rng: () => number,
): GeneratedItem {
  const optionOrder =
    shuffleOptions && question.options && question.options.length > 1
      ? shuffle(
          question.options.map((option) => option.key),
          rng,
        )
      : null;

  return {
    questionId: question.id,
    section,
    order: 0,
    marks,
    optionOrder,
  };
}

/**
 * Builds N variants (sets) from the question pool.
 *
 * - Sections are processed in blueprint order.
 * - Each section draws `count × setCount` questions so sets are disjoint.
 * - When the pool is too small, each set gets a rotated window of the pool
 *   (so no single paper repeats a question) and a warning is emitted so the UI
 *   can ask the teacher to add more questions.
 * - MCQ option order is shuffled per set and recorded, so the answer key can
 *   still map back to the correct printed letter.
 */
export function generatePaper(
  pool: readonly GeneratorQuestion[],
  input: GeneratorInput,
): GenerationResult {
  const rng = mulberry32(input.seed);
  const setCount = Math.max(1, Math.min(input.setCount, SET_LABELS.length));
  const warnings: string[] = [];

  const buckets: GeneratedItem[][] = Array.from({ length: setCount }, () => []);
  const sections = input.blueprint.filter((row) => row.enabled && row.count > 0);

  // Stable ordering makes generation reproducible for a given seed.
  const sortedPool = [...pool].sort((a, b) => a.id.localeCompare(b.id));

  sections.forEach((section, sectionIndex) => {
    const sectionTitle = `Section ${SECTION_LETTERS[sectionIndex] ?? sectionIndex + 1} — ${
      QUESTION_TYPE_META[section.type].label
    }`;

    const candidates = sortedPool.filter(
      (question) => question.question_type === section.type,
    );

    // Honour the requested difficulty first, then fall back to the rest.
    const preferred =
      section.difficulty === "mixed"
        ? candidates
        : candidates.filter((question) => question.difficulty === section.difficulty);
    const fallback =
      section.difficulty === "mixed"
        ? []
        : candidates.filter((question) => question.difficulty !== section.difficulty);

    const ordered = [...shuffle(preferred, rng), ...shuffle(fallback, rng)];
    const required = section.count * setCount;
    const selected = ordered.slice(0, required);

    if (selected.length === 0) {
      warnings.push(
        `${sectionTitle}: no ${QUESTION_TYPE_META[section.type].short} questions in the selected chapters.`,
      );
      return;
    }

    if (selected.length < required) {
      warnings.push(
        selected.length >= section.count
          ? `${sectionTitle}: only ${selected.length} question(s) for ${setCount} sets of ${section.count} — sets will share questions. Add more to keep variants distinct.`
          : `${sectionTitle}: only ${selected.length} question(s) available; each set prints ${selected.length} instead of ${section.count}.`,
      );
    }

    if (selected.length >= required) {
      // Enough for disjoint variants: deal round-robin.
      for (let index = 0; index < required; index += 1) {
        const question = selected[index];
        buckets[index % setCount].push(
          buildItem(question, sectionTitle, section.marks, input.shuffleOptions, rng),
        );
      }
      return;
    }

    // Not enough for disjoint sets. Give every set a rotated window of the pool so
    // no single paper repeats a question (unless the pool is smaller than one set).
    const perSet = Math.min(section.count, selected.length);
    for (let setIndex = 0; setIndex < setCount; setIndex += 1) {
      const offset = (setIndex * perSet) % selected.length;
      for (let k = 0; k < perSet; k += 1) {
        const question = selected[(offset + k) % selected.length];
        buckets[setIndex].push(
          buildItem(question, sectionTitle, section.marks, input.shuffleOptions, rng),
        );
      }
    }
  });

  const sets: GeneratedSet[] = buckets.map((items, index) => {
    const ordered = items.map((item, position) => ({ ...item, order: position + 1 }));
    return {
      label: SET_LABELS[index] ?? String(index + 1),
      seed: input.seed + index,
      items: ordered,
      totalMarks: ordered.reduce((sum, item) => sum + item.marks, 0),
    };
  });

  const totalMarks = sets[0]?.totalMarks ?? 0;
  if (totalMarks === 0) warnings.push("The paper is empty — enable at least one section.");

  return { sets, warnings, totalMarks };
}
