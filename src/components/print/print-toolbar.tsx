"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrintToolbar({
  paperId,
  sets,
  activeSet,
  title,
}: {
  paperId: string;
  sets: string[];
  activeSet: string;
  title: string;
}) {
  return (
    <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-2.5">
        <Link
          href={`/papers/${paperId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to paper
        </Link>

        <span className="hidden max-w-[280px] truncate text-xs text-slate-400 sm:block">
          {title}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <span className="mr-1 text-[11px] text-slate-500">Set</span>
          {sets.map((label) => (
            <Link
              key={label}
              href={`/papers/${paperId}/print?set=${label}`}
              className={cn(
                "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-xs font-medium",
                label === activeSet
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        <Button type="button" size="sm" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" aria-hidden />
          Print / Save as PDF
        </Button>

        <Link
          href={`/papers/${paperId}`}
          className={cn(buttonClasses("outline", "sm"), "hidden sm:inline-flex")}
        >
          Answer key on last page
        </Link>
      </div>
    </div>
  );
}
