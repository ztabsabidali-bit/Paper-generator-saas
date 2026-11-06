import { describe, expect, it } from "vitest";
import { normalizeMathText } from "./normalize";

function math(content: string) {
  return normalizeMathText(content);
}

describe("normalizeMathText", () => {
  it("renders a textbook-style fourth root", () => {
    expect(math("∜(16x^4 y^8 )")).toBe("$\\sqrt[4]{16x^{4} y^{8}}$");
  });

  it("converts square and cube roots", () => {
    expect(math("√(x+1)")).toBe("$\\sqrt{x+1}$");
    expect(math("∛(8)")).toBe("$\\sqrt[3]{8}$");
    expect(math("√x")).toBe("$\\sqrt{x}$");
  });

  it("converts unicode superscripts", () => {
    expect(math("x² + y³")).toBe("$x^{2} + y^{3}$");
    expect(math("10⁻³")).toBe("$10^{-3}$");
  });

  it("wraps bare LaTeX commands", () => {
    expect(math("\\sqrt{3} + \\sqrt{5} is:")).toBe("$\\sqrt{3} + \\sqrt{5}$ is:");
    expect(math("\\frac{a}{b} = 2")).toBe("$\\frac{a}{b} = 2$");
  });

  it("wraps powers and their surrounding expression", () => {
    expect(math("x^2 - 5x + 6 = 0")).toBe("$x^{2} - 5x + 6 = 0$");
    expect(math("Simplify (81/16)^{-3/4}:")).toBe("Simplify $(81/16)^{-3/4}$:");
    expect(math("a^{mn}")).toBe("$a^{mn}$");
  });

  it("keeps prose words outside the maths", () => {
    expect(math("The number \\sqrt{2} is irrational.")).toBe(
      "The number $\\sqrt{2}$ is irrational.",
    );
    expect(math("If n is not a perfect square, then \\sqrt{n} is irrational.")).toBe(
      "If n is not a perfect square, then $\\sqrt{n}$ is irrational.",
    );
  });

  it("groups exponents that follow each other", () => {
    expect(math("(16x^4y^8)^{1/4}")).toBe("$(16x^{4}y^{8})^{1/4}$");
    expect(math("a^m x a^n = a^{mn}")).toBe("$a^{m} x a^{n} = a^{mn}$");
    expect(math("3x^2")).toBe("$3x^{2}$");
  });

  it("leaves Markdown emphasis outside maths", () => {
    expect(math("**x^2**")).toBe("**$x^{2}$**");
  });

  it("leaves existing math spans untouched", () => {
    expect(math("$x^2$ and \\sqrt{2}")).toBe("$x^2$ and $\\sqrt{2}$");
    expect(math("$$\\int_0^1 x\\,dx$$")).toBe("$$\\int_0^1 x\\,dx$$");
  });

  it("leaves plain prose untouched", () => {
    const prose = "Explain why the sky appears blue on a clear day.";
    expect(math(prose)).toBe(prose);
  });

  it("handles bracketed products of roots", () => {
    expect(math("(\\sqrt{3} + \\sqrt{5})(\\sqrt{3} - \\sqrt{5}) is:")).toBe(
      "$(\\sqrt{3} + \\sqrt{5})(\\sqrt{3} - \\sqrt{5})$ is:",
    );
  });
});
