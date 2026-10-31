import { describe, expect, it } from "vitest";
import { correctOptionLabel, resolveOptions } from "./answer-key";

const question = {
  options: [
    { key: "A", text: "10 m" },
    { key: "B", text: "20 m" },
    { key: "C", text: "25 m" },
    { key: "D", text: "50 m" },
  ],
  correct_answer: "C",
};

describe("resolveOptions", () => {
  it("keeps the original order when no shuffle is recorded", () => {
    const resolved = resolveOptions(question, null);
    expect(resolved.map((option) => option.key)).toEqual(["A", "B", "C", "D"]);
    expect(resolved.map((option) => option.label)).toEqual(["A", "B", "C", "D"]);
    expect(resolved.find((option) => option.isCorrect)?.key).toBe("C");
  });

  it("re-labels options in the printed order", () => {
    const resolved = resolveOptions(question, ["D", "C", "B", "A"]);
    expect(resolved.map((option) => option.key)).toEqual(["D", "C", "B", "A"]);
    expect(resolved.map((option) => option.label)).toEqual(["A", "B", "C", "D"]);
    // Printed order D, C, B, A → the correct key "C" is the second option.
    expect(resolved.find((option) => option.isCorrect)?.label).toBe("B");
    expect(correctOptionLabel(question, ["D", "C", "B", "A"])).toBe("B");
  });

  it("appends options missing from a stale order", () => {
    const resolved = resolveOptions(question, ["B", "A"]);
    expect(resolved.map((option) => option.key)).toEqual(["B", "A", "C", "D"]);
    expect(correctOptionLabel(question, ["B", "A"])).toBe("C");
  });

  it("returns null for non-MCQ questions", () => {
    expect(correctOptionLabel({ options: null, correct_answer: "x" }, null)).toBeNull();
  });
});
