import { describe, expect, it } from "vitest";
import {
  buildVariantsFromSelection,
  generatePaper,
  type GeneratorQuestion,
  type SelectionPick,
} from "./generator";

function mcq(id: string, difficulty: "easy" | "medium" | "hard" = "medium"): GeneratorQuestion {
  return {
    id,
    question_type: "mcq",
    difficulty,
    marks: 1,
    options: [
      { key: "A", text: "one" },
      { key: "B", text: "two" },
      { key: "C", text: "three" },
      { key: "D", text: "four" },
    ],
  };
}

function short(id: string): GeneratorQuestion {
  return { id, question_type: "short", difficulty: "medium", marks: 3, options: null };
}

const blueprint = [
  { type: "mcq" as const, enabled: true, count: 4, marks: 1, difficulty: "mixed" as const },
  { type: "short" as const, enabled: true, count: 2, marks: 3, difficulty: "mixed" as const },
];

describe("generatePaper", () => {
  it("creates disjoint sets when the pool is large enough", () => {
    const pool = [
      ...Array.from({ length: 30 }, (_, i) => mcq(`m${i}`)),
      ...Array.from({ length: 10 }, (_, i) => short(`s${i}`)),
    ];

    const result = generatePaper(pool, {
      blueprint,
      setCount: 2,
      shuffleOptions: true,
      seed: 42,
    });

    expect(result.sets).toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
    expect(result.totalMarks).toBe(4 * 1 + 2 * 3);

    const setA = result.sets[0].items.map((item) => item.questionId);
    const setB = result.sets[1].items.map((item) => item.questionId);
    expect(setA).toHaveLength(6);
    expect(setB).toHaveLength(6);
    expect(setA.filter((id) => setB.includes(id))).toHaveLength(0);
  });

  it("is reproducible for the same seed", () => {
    const pool = [
      ...Array.from({ length: 20 }, (_, i) => mcq(`m${i}`)),
      ...Array.from({ length: 10 }, (_, i) => short(`s${i}`)),
    ];
    const input = { blueprint, setCount: 2, shuffleOptions: true, seed: 7 };

    const first = generatePaper(pool, input);
    const second = generatePaper([...pool].reverse(), input);

    expect(first.sets.map((set) => set.items.map((item) => item.questionId))).toEqual(
      second.sets.map((set) => set.items.map((item) => item.questionId)),
    );
  });

  it("warns and overlaps when the pool is too small", () => {
    const pool = [mcq("m0"), mcq("m1"), short("s0")];

    const result = generatePaper(pool, {
      blueprint,
      setCount: 2,
      shuffleOptions: false,
      seed: 1,
    });

    expect(result.warnings.length).toBeGreaterThan(0);
    const ids = result.sets.flatMap((set) => set.items.map((item) => item.questionId));
    expect(new Set(ids).size).toBeLessThan(ids.length);
  });

  it("honours difficulty preference before falling back", () => {
    const pool = [
      mcq("easy-1", "easy"),
      mcq("easy-2", "easy"),
      mcq("hard-1", "hard"),
      mcq("hard-2", "hard"),
    ];

    const result = generatePaper(pool, {
      blueprint: [
        { type: "mcq", enabled: true, count: 2, marks: 1, difficulty: "easy" },
      ],
      setCount: 1,
      shuffleOptions: false,
      seed: 3,
    });

    expect(result.sets[0].items.map((item) => item.questionId).sort()).toEqual([
      "easy-1",
      "easy-2",
    ]);
  });
});

function pick(question: GeneratorQuestion): SelectionPick {
  return {
    id: question.id,
    question_type: question.question_type,
    difficulty: question.difficulty,
    marks: question.marks,
    options: question.options,
  };
}

describe("buildVariantsFromSelection", () => {
  const picks = [pick(mcq("m0")), pick(mcq("m1")), pick(short("s0"))];

  it("prints the picked questions in type-section order for set A", () => {
    const result = buildVariantsFromSelection({
      picks: [pick(short("s0")), pick(mcq("m0")), pick(mcq("m1"))],
      pool: picks,
      setCount: 1,
      shuffleOptions: false,
      seed: 5,
    });

    const setA = result.sets[0];
    expect(setA.items.map((item) => item.questionId)).toEqual(["m0", "m1", "s0"]);
    expect(setA.items[0].section).toContain("Multiple choice");
    expect(setA.items[2].section).toContain("Short question");
    expect(result.totalMarks).toBe(1 + 1 + 3);
    expect(result.warnings).toHaveLength(0);
  });

  it("swaps each slot for an unused same-type question in later sets", () => {
    const pool = [
      ...picks,
      pick(mcq("m2")),
      pick(mcq("m3")),
      pick(short("s1")),
      pick(short("s2")),
      pick(short("s3")),
    ];

    const result = buildVariantsFromSelection({
      picks,
      pool,
      setCount: 2,
      shuffleOptions: false,
      seed: 11,
    });

    const [setA, setB] = result.sets;
    expect(setA.items.map((item) => item.questionId)).toEqual(["m0", "m1", "s0"]);
    expect(setB.items).toHaveLength(3);
    // Same structure and marks, no question reused from set A.
    expect(setB.items.map((item) => item.section)).toEqual(
      setA.items.map((item) => item.section),
    );
    expect(setB.totalMarks).toBe(setA.totalMarks);
    expect(setB.items.some((item) => item.questionId === "s0")).toBe(false);
    expect(setB.items.filter((item) => item.questionId === "m2" || item.questionId === "m3"))
      .toHaveLength(2);
    expect(result.warnings).toHaveLength(0);
  });

  it("keeps the slot marks even when the substitute is worth more", () => {
    const cheap = { ...pick(mcq("m0")), marks: 1 };
    const pricey = { ...pick(mcq("m1")), marks: 4 };

    const result = buildVariantsFromSelection({
      picks: [cheap],
      pool: [cheap, pricey],
      setCount: 2,
      shuffleOptions: false,
      seed: 2,
    });

    expect(result.sets[1].items[0].questionId).toBe("m1");
    expect(result.sets[1].items[0].marks).toBe(1);
    expect(result.totalMarks).toBe(1);
  });

  it("warns and repeats when the pool has no substitute left", () => {
    const result = buildVariantsFromSelection({
      picks: [pick(short("s0"))],
      pool: [pick(short("s0"))],
      setCount: 3,
      shuffleOptions: false,
      seed: 4,
    });

    expect(result.warnings.join(" ")).toContain("no unused substitute");
    expect(result.sets[0].items[0].questionId).toBe("s0");
    expect(result.sets[2].items[0].questionId).toBe("s0");
  });

  it("is reproducible for the same seed and pool", () => {
    const pool = [
      ...picks,
      ...Array.from({ length: 8 }, (_, index) => pick(mcq(`pool-${index}`))),
    ];
    const input = {
      picks,
      pool,
      setCount: 3,
      shuffleOptions: true,
      seed: 99,
    };

    const first = buildVariantsFromSelection(input);
    const second = buildVariantsFromSelection({ ...input, pool: [...pool] });

    expect(first.sets.map((set) => set.items.map((item) => item.questionId))).toEqual(
      second.sets.map((set) => set.items.map((item) => item.questionId)),
    );
  });
});
