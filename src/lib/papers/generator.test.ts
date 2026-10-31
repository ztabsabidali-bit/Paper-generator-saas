import { describe, expect, it } from "vitest";
import { generatePaper, type GeneratorQuestion } from "./generator";

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
