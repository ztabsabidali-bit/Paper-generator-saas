import { describe, expect, it } from "vitest";
import { sectionHeading, sectionQuestionType } from "./sections";

describe("sectionQuestionType", () => {
  it("reads the generated titles", () => {
    expect(sectionQuestionType("Section A — Multiple choice")).toBe("mcq");
    expect(sectionQuestionType("Section B — Short question")).toBe("short");
    expect(sectionQuestionType("Section C — Long question")).toBe("long");
  });

  it("ignores custom titles", () => {
    expect(sectionQuestionType("Section A — Grammar")).toBeNull();
  });
});

describe("sectionHeading", () => {
  it("keeps English titles as stored", () => {
    expect(sectionHeading("Section A — Multiple choice", false)).toBe(
      "Section A — Multiple choice",
    );
  });

  it("translates generated titles for Urdu papers", () => {
    expect(sectionHeading("Section A — Multiple choice", true)).toBe(
      "حصہ الف — کثیر الانتخابی سوالات",
    );
    expect(sectionHeading("Section B — Short question", true)).toBe("حصہ ب — مختصر سوالات");
    expect(sectionHeading("Section C — Long question", true)).toBe("حصہ ج — طویل سوالات");
  });

  it("uses the letter in the stored title when it differs from the type order", () => {
    expect(sectionHeading("Section D — Short question", true)).toBe("حصہ د — مختصر سوالات");
  });

  it("leaves custom titles alone", () => {
    expect(sectionHeading("Section A — Grammar", true)).toBe("Section A — Grammar");
  });
});
