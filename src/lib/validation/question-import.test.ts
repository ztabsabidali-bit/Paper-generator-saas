import { describe, expect, it } from "vitest";
import { readQuestionCsv } from "@/lib/questions/csv";
import {
  MAX_IMPORT_ROWS,
  importEnvelopeSchema,
  normalizeLabel,
  normalizeQuestionText,
  parseImportRow,
  topicKey,
  type ParsedImportRow,
} from "./question-import";

function expectOk(row: Record<string, string>): ParsedImportRow {
  const result = parseImportRow(row);
  if (!result.ok) {
    throw new Error(`Expected a valid row, got: ${result.errors.join(" ")}`);
  }
  return result.value;
}

describe("parseImportRow", () => {
  it("parses an MCQ whose answer is a letter", () => {
    const value = expectOk({
      chapter: "Algebra",
      topic: "Quadratics",
      type: "mcq",
      question_text: "What is 2 + 2?",
      option_a: "3",
      option_b: "4",
      option_c: "5",
      option_d: "6",
      correct_answer: "b",
      difficulty: "easy",
      marks: "1",
    });

    expect(value.question_type).toBe("mcq");
    expect(value.correct_answer).toBe("B");
    expect(value.options).toEqual([
      { key: "A", text: "3" },
      { key: "B", text: "4" },
      { key: "C", text: "5" },
      { key: "D", text: "6" },
    ]);
    expect(value.difficulty).toBe("easy");
    expect(value.marks).toBe(1);
  });

  it("accepts the option text as the correct answer", () => {
    const value = expectOk({
      chapter: "Algebra",
      type: "mcq",
      question_text: "Which is prime?",
      option_a: "4",
      option_b: "  Nine ",
      option_c: "7",
      correct_answer: "7",
    });

    expect(value.correct_answer).toBe("C");
  });

  it("re-keys surviving options when a middle option is blank", () => {
    const value = expectOk({
      chapter: "Algebra",
      type: "mcq",
      question_text: "Pick the largest value.",
      option_a: "10",
      option_b: "",
      option_c: "30",
      correct_answer: "C",
    });

    expect(value.options).toEqual([
      { key: "A", text: "10" },
      { key: "B", text: "30" },
    ]);
    expect(value.correct_answer).toBe("B");
  });

  it("rejects an MCQ with fewer than two options", () => {
    const result = parseImportRow({
      chapter: "Algebra",
      type: "mcq",
      question_text: "Only one option?",
      option_a: "Yes",
      correct_answer: "A",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("at least two options");
    }
  });

  it("requires a correct answer for MCQs", () => {
    const result = parseImportRow({
      chapter: "Algebra",
      type: "mcq",
      question_text: "Missing key?",
      option_a: "1",
      option_b: "2",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("Correct answer is required");
    }
  });

  it("rejects a correct answer that matches no option", () => {
    const result = parseImportRow({
      chapter: "Algebra",
      type: "mcq",
      question_text: "Wrong key?",
      option_a: "1",
      option_b: "2",
      correct_answer: "D",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain("does not match a filled option");
    }
  });

  it("applies short-question defaults", () => {
    const value = expectOk({
      chapter: "Algebra",
      type: "short",
      question_text: "Define a prime number.",
    });

    expect(value.question_type).toBe("short");
    expect(value.marks).toBe(3);
    expect(value.difficulty).toBe("medium");
    expect(value.medium).toBe("english");
    expect(value.text_direction).toBe("ltr");
    expect(value.options).toBeNull();
    expect(value.topic).toBeNull();
    expect(value.subtopic).toBeNull();
    expect(value.correct_answer).toBeNull();
  });

  it("applies long-question defaults and keeps the model answer", () => {
    const value = expectOk({
      chapter: "Algebra",
      type: "long",
      question_text: "Prove the quadratic formula.",
      correct_answer: "Complete the square.",
    });

    expect(value.marks).toBe(8);
    expect(value.correct_answer).toBe("Complete the square.");
  });

  it("marks Urdu questions as right-to-left", () => {
    const value = expectOk({
      chapter: "نظم",
      type: "short",
      question_text: "غزل کی تعریف لکھیں۔",
      medium: "urdu",
    });

    expect(value.medium).toBe("urdu");
    expect(value.text_direction).toBe("rtl");
  });

  it("honours an explicit direction override", () => {
    const value = expectOk({
      chapter: "Algebra",
      type: "short",
      question_text: "Explain in Urdu.",
      medium: "bilingual",
      direction: "rtl",
    });

    expect(value.medium).toBe("bilingual");
    expect(value.text_direction).toBe("rtl");
  });

  it("reports an unknown type", () => {
    const result = parseImportRow({
      chapter: "Algebra",
      type: "diagram",
      question_text: "Draw the graph.",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.join(" ")).toContain('Unknown type "diagram"');
    }
  });

  it("reports invalid marks and difficulty", () => {
    const result = parseImportRow({
      chapter: "Algebra",
      type: "short",
      question_text: "A valid question.",
      marks: "-2",
      difficulty: "impossible",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const joined = result.errors.join(" ");
      expect(joined).toContain("Marks must be greater than 0");
      expect(joined).toContain('Unknown difficulty "impossible"');
    }
  });

  it("accepts comma decimal marks", () => {
    const value = expectOk({
      chapter: "Algebra",
      type: "short",
      question_text: "A half-mark question.",
      marks: "0.5",
    });

    expect(value.marks).toBe(0.5);
  });

  it("rejects a question with no chapter or text", () => {
    const result = parseImportRow({ type: "short", question_text: "x" });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      const joined = result.errors.join(" ");
      expect(joined).toContain("Chapter is required");
      expect(joined).toContain("Question text is too short");
    }
  });
});

describe("normalization helpers", () => {
  it("normalizes question text case and whitespace", () => {
    expect(normalizeQuestionText("  What   is\t2 + 2? ")).toBe("what is 2 + 2?");
    expect(normalizeLabel("Chapter\u00a0 One")).toBe("chapter one");
  });

  it("builds placement keys that ignore case and spacing", () => {
    expect(topicKey(" Algebra ", "Quadratics", null)).toBe(
      topicKey("algebra", "QUADRATICS", ""),
    );
    expect(topicKey("Algebra", "Quadratics", null)).not.toBe(
      topicKey("Algebra", "Quadratics", "Factoring"),
    );
  });
});

describe("readQuestionCsv", () => {
  it("strips a BOM and normalizes headers", () => {
    const csv = "\uFEFFChapter,Question Type,Question Text\nAlgebra,MCQ,\"What is 2 + 2?\"";
    const result = readQuestionCsv(csv);

    expect(result.errors).toEqual([]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({
      chapter: "Algebra",
      question_type: "MCQ",
      question_text: "What is 2 + 2?",
    });
  });

  it("keeps quoted commas and embedded newlines inside a field", () => {
    const csv =
      "chapter,type,question_text,explanation\n" +
      'Algebra,short,"Solve x + 1 = 2, then explain.","Line one\nLine two"';
    const result = readQuestionCsv(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].question_text).toBe("Solve x + 1 = 2, then explain.");
    expect(result.rows[0].explanation).toBe("Line one\nLine two");
  });

  it("ignores blank lines and rows with no values", () => {
    const csv = "chapter,type,question_text\n\nAlgebra,short,Valid,\n,,";
    const result = readQuestionCsv(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].chapter).toBe("Algebra");
  });

  it("parses the shipped template back into valid rows", async () => {
    const { readFile } = await import("node:fs/promises");
    const text = await readFile("public/templates/questions-template.csv", "utf8");
    const result = readQuestionCsv(text);

    expect(result.rows).toHaveLength(3);
    expect(result.errors).toEqual([]);

    const parsed = result.rows.map((row) => parseImportRow(row));
    expect(parsed.every((row) => row.ok)).toBe(true);

    const types = parsed.map((row) => (row.ok ? row.value.question_type : null));
    expect(types).toEqual(["mcq", "short", "long"]);
  });
});

describe("importEnvelopeSchema", () => {
  const subjectId = "3f1c2a44-1a2b-4c3d-8e9f-001122334455";

  it("accepts a small batch", () => {
    const result = importEnvelopeSchema.safeParse({
      subject_id: subjectId,
      create_missing_topics: false,
      rows: [{ chapter: "Algebra", type: "short", question_text: "Why?" }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects an empty file", () => {
    const result = importEnvelopeSchema.safeParse({
      subject_id: subjectId,
      create_missing_topics: false,
      rows: [],
    });

    expect(result.success).toBe(false);
  });

  it("rejects more rows than the cap", () => {
    const result = importEnvelopeSchema.safeParse({
      subject_id: subjectId,
      create_missing_topics: false,
      rows: Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => ({
        chapter: "Algebra",
        type: "short",
        question_text: "Why?",
      })),
    });

    expect(result.success).toBe(false);
  });
});
