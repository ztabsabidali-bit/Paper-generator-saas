/**
 * Turns the maths notation teachers and AI imports actually write into LaTeX
 * that KaTeX can render.
 *
 * Content may arrive as:
 *   - proper LaTeX inside `$…$` (left untouched)
 *   - bare LaTeX commands: `\sqrt{3}`, `a^{n}`
 *   - plain notation: `x^2`, `∜(16x^4 y^8)`, `x²`
 *
 * The normaliser only wraps a span in `$…$` when the span is unambiguously
 * mathematical: it starts at a command/root/power and may grow across numbers,
 * operators, single-letter variables and balanced brackets, but never across
 * prose words.
 */

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁻": "-",
  "⁺": "+",
};

const ROOT_CHARS = "√∛∜";

const TRIGGER = /\\[A-Za-z]|[√∛∜]|[⁰¹²³⁴⁵⁶⁷⁸⁹]|\^/;

type TokenKind =
  | "space"
  | "newline"
  | "word"
  | "number"
  | "op"
  | "punct"
  | "open"
  | "close"
  | "command"
  | "radical"
  | "power"
  | "sup"
  | "raw";

interface Token {
  kind: TokenKind;
  text: string;
  /** Original source for tokens whose text was rewritten to LaTeX. */
  raw?: string;
}

interface Segment {
  math: boolean;
  text: string;
}

const OPENERS = "([{";
const CLOSERS = ")]}";
const OPERATORS = "+-=<>≤≥±×÷·/*−∗⋅≈≠";

function isSuperscript(char: string) {
  return char in SUPERSCRIPT_DIGITS;
}

function superscriptValue(run: string) {
  return run
    .split("")
    .map((char) => SUPERSCRIPT_DIGITS[char] ?? char)
    .join("");
}

/** Reads from an opening bracket to its matching closer. Returns the index after the closer. */
function readBalanced(text: string, start: number, open: string, close: string) {
  let depth = 0;
  for (let i = start; i < text.length; i += 1) {
    const char = text[i];
    if (char === "\\") {
      i += 1;
      continue;
    }
    if (char === open) depth += 1;
    else if (char === close) {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function unwrapGroup(value: string) {
  if (value.length < 2) return value;
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === "{" && last === "}") || (first === "(" && last === ")")) {
    return value.slice(1, -1);
  }
  return value;
}

/** Reads `\command`, including any attached `[…]` / `{…}` arguments. */
function readCommand(text: string, start: number) {
  let i = start + 1;
  if (!/[A-Za-z]/.test(text[i] ?? "")) return start;
  while (/[A-Za-z]/.test(text[i] ?? "")) i += 1;

  for (;;) {
    if (text[i] === "[") {
      const end = readBalanced(text, i, "[", "]");
      if (end === -1) break;
      i = end;
      continue;
    }
    if (text[i] === "{") {
      const end = readBalanced(text, i, "{", "}");
      if (end === -1) break;
      i = end;
      continue;
    }
    break;
  }

  return i;
}

/** Reads `^2`, `^{n+1}`, `^(x+1)` or `^-3` and returns the exponent range. */
function readPower(text: string, start: number) {
  let i = start + 1;
  while (text[i] === " ") i += 1;

  if (text[i] === "{") {
    const end = readBalanced(text, i, "{", "}");
    if (end === -1) return null;
    const exponent = text.slice(i + 1, end - 1);
    return exponent.trim() ? { text: `^{${exponent.trim()}}`, end } : null;
  }
  if (text[i] === "(") {
    const end = readBalanced(text, i, "(", ")");
    if (end === -1) return null;
    const exponent = text.slice(i + 1, end - 1);
    return exponent.trim() ? { text: `^{${exponent.trim()}}`, end } : null;
  }
  if (text[i] === "\\") {
    const end = readCommand(text, i);
    if (end === -1 || end === i) return null;
    return { text: `^{${text.slice(i, end)}}`, end };
  }

  const match = /^[+-]?(?:[0-9]+(?:\.[0-9]+)?|[A-Za-z])/.exec(text.slice(i));
  if (!match) return null;
  return { text: `^{${match[0]}}`, end: i + match[0].length };
}

/** Converts notation inside a radical argument into LaTeX (no `$` wrapping). */
function latexifyMath(source: string): string {
  let out = source;

  // x², 10⁻³ → x^{2}, 10^{-3}
  out = out.replace(
    /([A-Za-z0-9)\]}])([⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺]+)/g,
    (_, base: string, run: string) => `${base}^{${superscriptValue(run)}}`,
  );

  // x^4, a^-3, (x+1)^2 → x^{4}, a^{-3}, (x+1)^{2}
  let previous;
  do {
    previous = out;
    out = out.replace(
      /(\{[^{}]*\}|\([^()]*\)|[A-Za-z0-9.]+)\^(\{[^{}]*\}|\([^()]*\)|[+-]?(?:[0-9]+(?:\.[0-9]+)?|[A-Za-z]))/g,
      (_, base: string, exponent: string) => `${base}^{${unwrapGroup(exponent)}}`,
    );
  } while (out !== previous);

  // Nested roots: √x, ∛(x+1), ∜{16x^4}
  for (let pass = 0; pass < 5; pass += 1) {
    const next = out.replace(
      /([⁰¹²³⁴⁵⁶⁷⁸⁹]?)([√∛∜])\s*(\([^()]*\)|\{[^{}]*\}|[A-Za-z0-9.]+)/g,
      (_, superscript: string, root: string, argument: string) => {
        const index =
          superscript.length > 0
            ? superscriptValue(superscript)
            : root === "∜"
              ? "4"
              : root === "∛"
                ? "3"
                : "2";
        const body = latexifyMath(unwrapGroup(argument));
        return `\\sqrt${index === "2" ? "" : `[${index}]`}{${body}}`;
      },
    );
    if (next === out) break;
    out = next;
  }

  return out;
}

function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < source.length) {
    const char = source[i];

    if (char === "\n") {
      tokens.push({ kind: "newline", text: char });
      i += 1;
      continue;
    }
    if (char === " " || char === "\t") {
      let end = i + 1;
      while (source[end] === " " || source[end] === "\t") end += 1;
      tokens.push({ kind: "space", text: source.slice(i, end) });
      i = end;
      continue;
    }

    if (char === "\\") {
      const end = readCommand(source, i);
      if (end > i + 1) {
        tokens.push({ kind: "command", text: source.slice(i, end) });
        i = end;
        continue;
      }
      tokens.push({ kind: "raw", text: source.slice(i, Math.min(i + 2, source.length)) });
      i = Math.min(i + 2, source.length);
      continue;
    }

    if (ROOT_CHARS.includes(char)) {
      const radical = readRadical(source, i, char);
      if (radical) {
        tokens.push({
          kind: "radical",
          text: radical.text,
          raw: source.slice(i, radical.end),
        });
        i = radical.end;
        continue;
      }
      tokens.push({ kind: "raw", text: char });
      i += 1;
      continue;
    }

    if (isSuperscript(char)) {
      let end = i + 1;
      while (isSuperscript(source[end] ?? "")) end += 1;
      const run = source.slice(i, end);

      // ⁴√(…) uses the superscript as the root index.
      if (ROOT_CHARS.includes(source[end] ?? "")) {
        const radical = readRadical(source, end, source[end], run);
        if (radical) {
          tokens.push({
            kind: "radical",
            text: radical.text,
            raw: source.slice(i, radical.end),
          });
          i = radical.end;
          continue;
        }
      }

      tokens.push({ kind: "sup", text: `^{${superscriptValue(run)}}`, raw: run });
      i = end;
      continue;
    }

    if (char === "^") {
      const power = readPower(source, i);
      if (power) {
        tokens.push({ kind: "power", text: power.text, raw: source.slice(i, power.end) });
        i = power.end;
        continue;
      }
      tokens.push({ kind: "raw", text: char });
      i += 1;
      continue;
    }

    if (/[0-9]/.test(char)) {
      const match = /^[0-9]+(?:\.[0-9]+)?/.exec(source.slice(i));
      const value = match ? match[0] : char;
      tokens.push({ kind: "number", text: value });
      i += value.length;
      continue;
    }

    if (/[A-Za-z]/.test(char)) {
      // Letters are grouped as words; the run builder decides whether a word
      // is a variable (`x`, `xy`) or prose (`is`, `number`).
      let end = i + 1;
      while (/[A-Za-z]/.test(source[end] ?? "")) end += 1;
      tokens.push({ kind: "word", text: source.slice(i, end) });
      i = end;
      continue;
    }

    if (OPENERS.includes(char)) {
      tokens.push({ kind: "open", text: char });
      i += 1;
      continue;
    }
    if (CLOSERS.includes(char)) {
      tokens.push({ kind: "close", text: char });
      i += 1;
      continue;
    }
    if (OPERATORS.includes(char)) {
      tokens.push({ kind: "op", text: char });
      i += 1;
      continue;
    }
    if (",.;:!?،؛".includes(char)) {
      tokens.push({ kind: "punct", text: char });
      i += 1;
      continue;
    }

    tokens.push({ kind: "raw", text: char });
    i += 1;
  }

  return tokens;
}

function readRadical(
  source: string,
  start: number,
  root: string,
  superscript = "",
): { text: string; end: number } | null {
  let i = start + 1;
  while (source[i] === " ") i += 1;

  let argument = "";
  let end = start + 1;

  if (source[i] === "{" || source[i] === "(") {
    const open = source[i];
    const close = open === "{" ? "}" : ")";
    const closeIndex = readBalanced(source, i, open, close);
    if (closeIndex === -1) return null;
    argument = source.slice(i + 1, closeIndex - 1);
    end = closeIndex;
  } else {
    const match = /^[A-Za-z0-9.]+/.exec(source.slice(i));
    if (!match) return null;
    argument = match[0];
    end = i + match[0].length;
  }

  const body = latexifyMath(argument).trim();
  if (!body) return null;

  const index =
    superscript.length > 0
      ? superscriptValue(superscript)
      : root === "∜"
        ? "4"
        : root === "∛"
          ? "3"
          : "2";

  return {
    text: `\\sqrt${index === "2" ? "" : `[${index}]`}{${body}}`,
    end,
  };
}

function isCore(token: Token) {
  return (
    token.kind === "command" ||
    token.kind === "radical" ||
    token.kind === "power" ||
    token.kind === "sup"
  );
}

function previousNonSpace(tokens: Token[], index: number) {
  for (let i = index; i >= 0; i -= 1) {
    if (tokens[i].kind !== "space" && tokens[i].kind !== "newline") return tokens[i];
  }
  return null;
}

function nextNonSpace(tokens: Token[], index: number) {
  for (let i = index; i < tokens.length; i += 1) {
    if (tokens[i].kind !== "space" && tokens[i].kind !== "newline") return tokens[i];
  }
  return null;
}

const MATH_NEIGHBOURS = new Set<TokenKind>([
  "number",
  "op",
  "open",
  "close",
  "command",
  "radical",
  "power",
  "sup",
]);

function canJoin(tokens: Token[], index: number, direction: "left" | "right") {
  const token = tokens[index];

  if (token.kind === "newline") return false;
  if (token.kind === "space") {
    // Spaces only join when the token beyond them is part of the maths.
    const beyond =
      direction === "right" ? nextNonSpace(tokens, index + 1) : previousNonSpace(tokens, index - 1);
    if (!beyond) return false;
    // A lone letter across a space is a variable, not prose: `x^{2} + y^{3}`.
    if (beyond.kind === "word") return beyond.text.length === 1;
    return MATH_NEIGHBOURS.has(beyond.kind);
  }

  if (MATH_NEIGHBOURS.has(token.kind)) {
    // `**bold**` around maths is Markdown emphasis, not multiplication.
    if (token.kind === "op" && token.text === "*") {
      const neighbour = direction === "right" ? tokens[index + 1] : tokens[index - 1];
      if (neighbour?.kind === "op" && neighbour.text === "*") return false;
    }
    return true;
  }
  if (token.kind !== "word") return false;

  const attached =
    direction === "right"
      ? tokens[index - 1]?.kind !== "space" && tokens[index - 1]?.kind !== "newline"
      : tokens[index + 1]?.kind !== "space" && tokens[index + 1]?.kind !== "newline";

  if (attached && token.text.length <= 3) return true;

  // A lone variable may sit across a space from an operator: `x = 3`.
  if (token.text.length === 1) {
    const towards =
      direction === "right" ? previousNonSpace(tokens, index - 1) : nextNonSpace(tokens, index + 1);
    if (!towards) return false;
    return (
      MATH_NEIGHBOURS.has(towards.kind) ||
      (towards.kind === "word" && towards.text.length === 1)
    );
  }

  return false;
}

function isBalanced(value: string) {
  const stack: string[] = [];
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (char === "\\") {
      i += 1;
      continue;
    }
    if (OPENERS.includes(char)) {
      stack.push(char);
    } else if (CLOSERS.includes(char)) {
      const expected = OPENERS[CLOSERS.indexOf(char)];
      if (stack.pop() !== expected) return false;
    }
  }
  return stack.length === 0;
}

function trimEdge(tokens: Token[], start: number, end: number) {
  const isSpace = (token: Token) => token.kind === "space" || token.kind === "newline";

  while (start < end && isSpace(tokens[start])) start += 1;
  while (end > start && isSpace(tokens[end - 1])) end -= 1;
  return { start, end };
}

function normalizeText(source: string) {
  if (!TRIGGER.test(source)) return source;

  const tokens = tokenize(source);
  const spans: { start: number; end: number; latex: string }[] = [];
  let previousEnd = 0;
  let index = 0;

  // Find spans first, then emit them, so a token is never printed twice when a
  // span grows to the left.
  while (index < tokens.length) {
    if (!isCore(tokens[index])) {
      index += 1;
      continue;
    }

    let start = index;
    let end = index + 1;

    while (end < tokens.length && canJoin(tokens, end, "right")) end += 1;
    while (start > previousEnd && canJoin(tokens, start - 1, "left")) start -= 1;

    ({ start, end } = trimEdge(tokens, start, end));

    let math = tokens
      .slice(start, end)
      .map((token) => token.text)
      .join("")
      .trim();

    // Drop unmatched brackets that would make KaTeX fail.
    let guard = 0;
    while (math && !isBalanced(math) && guard < 10) {
      const canDropLeft = tokens[start]?.kind === "open";
      const canDropRight = tokens[end - 1]?.kind === "close";

      if (canDropLeft) start += 1;
      else if (canDropRight) end -= 1;
      else break;

      ({ start, end } = trimEdge(tokens, start, end));
      math = tokens
        .slice(start, end)
        .map((token) => token.text)
        .join("")
        .trim();
      guard += 1;
    }

    // An unbalanced span would break KaTeX; leave the source untouched instead.
    if (math && isBalanced(math)) spans.push({ start, end, latex: math });
    previousEnd = end;
    index = end;
  }

  let output = "";
  index = 0;
  let spanIndex = 0;

  while (index < tokens.length) {
    const span = spans[spanIndex];
    if (span && index === span.start) {
      output += `$${span.latex}$`;
      index = span.end;
      spanIndex += 1;
      continue;
    }
    output += tokens[index].raw ?? tokens[index].text;
    index += 1;
  }

  return output;
}

/** Splits out existing `$…$` / `$$…$$` spans so they are never rewritten. */
function splitMath(source: string): Segment[] {
  const parts: Segment[] = [];
  let cursor = 0;
  let i = 0;

  while (i < source.length) {
    if (source[i] === "\\") {
      i += 2;
      continue;
    }
    if (source[i] !== "$") {
      i += 1;
      continue;
    }

    const delimiter = source[i + 1] === "$" ? "$$" : "$";
    let j = i + delimiter.length;
    let closed = false;

    while (j < source.length) {
      if (source[j] === "\\") {
        j += 2;
        continue;
      }
      if (source.startsWith(delimiter, j)) {
        closed = true;
        break;
      }
      j += 1;
    }

    if (!closed) {
      i += delimiter.length;
      continue;
    }

    if (cursor < i) parts.push({ math: false, text: source.slice(cursor, i) });
    parts.push({ math: true, text: source.slice(i, j + delimiter.length) });
    cursor = j + delimiter.length;
    i = cursor;
  }

  if (cursor < source.length) parts.push({ math: false, text: source.slice(cursor) });
  return parts;
}

export function normalizeMathText(content: string) {
  if (!TRIGGER.test(content)) return content;

  return splitMath(content)
    .map((part) => (part.math ? part.text : normalizeText(part.text)))
    .join("");
}
