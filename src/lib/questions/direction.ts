import type { TextDirection } from "@/types/database";

/**
 * Arabic-script and Hebrew blocks. Any of these means the run is right-to-left.
 */
const STRONG_RTL = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

/** Latin letters. Digits, punctuation and math operators are neutral. */
const STRONG_LTR = /[A-Za-z]/;

/** `$…$` and `$$…$$` maths should not decide the direction of a sentence. */
const MATH_SEGMENT = /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$/g;

/**
 * The base direction of a block of text, decided by its first strong character
 * (the same rule browsers use for `dir="auto"`). Returns null when the text has
 * no letters at all — a maths-only line, for example.
 */
export function detectTextDirection(text?: string | null): TextDirection | null {
  if (!text) return null;

  const plain = text.replace(MATH_SEGMENT, " ");
  for (const char of plain) {
    if (STRONG_RTL.test(char)) return "rtl";
    if (STRONG_LTR.test(char)) return "ltr";
  }
  return null;
}

/**
 * The direction a question should be laid out in.
 *
 * Teachers often type Urdu while the stored direction still says "ltr" (the
 * medium defaults to English), which left the question number and the A, B, C,
 * D labels on the wrong side. An explicit RTL setting always wins; otherwise
 * the first strong character of the question text decides, with the options as
 * a fallback.
 */
export function resolveQuestionDirection(
  stored: TextDirection | null | undefined,
  ...texts: (string | null | undefined)[]
): TextDirection {
  if (stored === "rtl") return "rtl";

  for (const text of texts) {
    const detected = detectTextDirection(text);
    if (detected) return detected;
  }

  return stored ?? "ltr";
}
