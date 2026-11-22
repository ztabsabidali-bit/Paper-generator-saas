import { describe, expect, it } from "vitest";
import { detectTextDirection, resolveQuestionDirection } from "./direction";

describe("detectTextDirection", () => {
  it("reports Urdu and Arabic text as rtl", () => {
    expect(detectTextDirection("سبق کے مصنف کا نام بتائیں۔")).toBe("rtl");
    expect(detectTextDirection("مشتاق احمد یوسفی")).toBe("rtl");
  });

  it("reports English text as ltr", () => {
    expect(detectTextDirection("State the law of conservation of energy.")).toBe("ltr");
  });

  it("uses the first strong character, so an English lead stays ltr", () => {
    expect(detectTextDirection("Explain this.\n\nتوانائی کی بقا کا قانون")).toBe("ltr");
  });

  it("ignores leading numbers and punctuation", () => {
    expect(detectTextDirection("1. سبق کے مصنف")).toBe("rtl");
    expect(detectTextDirection("$x^2 + 1$")).toBeNull();
  });

  it("returns null when there are no letters", () => {
    expect(detectTextDirection("")).toBeNull();
    expect(detectTextDirection(null)).toBeNull();
    expect(detectTextDirection("1 × 2 = 3")).toBeNull();
  });
});

describe("resolveQuestionDirection", () => {
  it("keeps an explicit rtl setting", () => {
    expect(resolveQuestionDirection("rtl", "English text")).toBe("rtl");
  });

  it("upgrades a stale ltr setting when the content is Urdu", () => {
    expect(resolveQuestionDirection("ltr", "سبق کے مصنف کا نام بتائیں۔")).toBe("rtl");
  });

  it("falls back to the options when the question text is maths only", () => {
    expect(resolveQuestionDirection("ltr", "$x^2$", "مشتاق احمد یوسفی")).toBe("rtl");
  });

  it("keeps ltr for English questions", () => {
    expect(resolveQuestionDirection("ltr", "Which of these is a surd?")).toBe("ltr");
  });

  it("keeps the stored value when nothing has letters", () => {
    expect(resolveQuestionDirection("ltr", "$x^2 = 4$")).toBe("ltr");
    expect(resolveQuestionDirection(undefined, "$x^2 = 4$")).toBe("ltr");
  });
});
