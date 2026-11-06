import type { PaperPrintOptions } from "@/types/domain";

export const PRINT_OPTION_KEYS = [
  "title",
  "session",
  "duration",
  "set_label",
  "instructions",
] as const;

export type PrintOptionKey = (typeof PRINT_OPTION_KEYS)[number];

export const DEFAULT_PRINT_OPTIONS: PaperPrintOptions = {
  title: true,
  session: true,
  duration: true,
  set_label: true,
  instructions: true,
};

/**
 * Normalises the `papers.print_options` JSON column for printing. Unknown and
 * missing keys fall back to `true`, so older papers (and rows written before
 * the column existed) keep printing every detail.
 */
export function resolvePrintOptions(value: unknown): PaperPrintOptions {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    title: typeof record.title === "boolean" ? record.title : true,
    session: typeof record.session === "boolean" ? record.session : true,
    duration: typeof record.duration === "boolean" ? record.duration : true,
    set_label: typeof record.set_label === "boolean" ? record.set_label : true,
    instructions:
      typeof record.instructions === "boolean" ? record.instructions : true,
  };
}
