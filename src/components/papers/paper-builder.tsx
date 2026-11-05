"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/shell";
import { cn } from "@/lib/utils";
import { AutoPaperBuilder } from "./auto-paper-builder";
import { ManualPaperBuilder } from "./manual-paper-builder";
import type { SubjectWithTopics } from "@/types/domain";

type BuilderMode = "manual" | "auto";

const MODES: Array<{ value: BuilderMode; label: string; hint: string }> = [
  {
    value: "manual",
    label: "Select questions",
    hint: "Filter the bank and tick exactly what prints.",
  },
  {
    value: "auto",
    label: "Auto-fill from pool",
    hint: "Set counts per section and draw randomly.",
  },
];

export function PaperBuilder({
  catalog,
  defaultSession,
  defaultInstructions,
}: {
  catalog: SubjectWithTopics[];
  defaultSession: string;
  defaultInstructions: string;
}) {
  const [mode, setMode] = useState<BuilderMode>("manual");

  if (catalog.length === 0) {
    return (
      <Alert tone="warning" title="No subjects configured yet">
        An admin needs to add classes, subjects and chapters before papers can be generated.
      </Alert>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <div
          role="tablist"
          aria-label="Paper building mode"
          className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:w-auto"
        >
          {MODES.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={mode === item.value}
              onClick={() => setMode(item.value)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition sm:flex-none",
                mode === item.value
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          {MODES.find((item) => item.value === mode)?.hint}
        </p>
      </div>

      {/* Both stay mounted so switching modes does not throw away a draft. */}
      <div className={mode === "manual" ? "" : "hidden"}>
        <ManualPaperBuilder
          catalog={catalog}
          defaultSession={defaultSession}
          defaultInstructions={defaultInstructions}
        />
      </div>
      <div className={mode === "auto" ? "" : "hidden"}>
        <AutoPaperBuilder
          catalog={catalog}
          defaultSession={defaultSession}
          defaultInstructions={defaultInstructions}
        />
      </div>
    </div>
  );
}
