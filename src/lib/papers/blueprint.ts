import type { PaperBlueprintSection } from "@/types/domain";

/** Sensible starting shape for a new auto-filled paper and a new blueprint. */
export const DEFAULT_BLUEPRINT: PaperBlueprintSection[] = [
  { type: "mcq", enabled: true, count: 10, marks: 1, difficulty: "mixed" },
  { type: "short", enabled: true, count: 5, marks: 3, difficulty: "mixed" },
  { type: "long", enabled: true, count: 2, marks: 8, difficulty: "mixed" },
];
