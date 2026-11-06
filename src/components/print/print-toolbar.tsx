"use client";

import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrintToolbar({
  paperId,
  sets,
  activeSet,
  title,
  includeAnswerKey,
}: {
  paperId: string;
  sets: string[];
  activeSet: string;
  title: string;
  includeAnswerKey: boolean;
}) {
  function printHref(set: string, withAnswerKey: boolean) {
    const query = new URLSearchParams({ set });
    if (!withAnswerKey) query.set("key", "0");
    return `/papers/${paperId}/print?${query.toString()}`;
  }

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
              href={printHref(label, includeAnswerKey)}
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

        <div
          role="group"
          aria-label="Answer key"
          className="flex w-full items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:w-auto"
        >
          <Link
            href={printHref(activeSet, true)}
            aria-current={includeAnswerKey ? "page" : undefined}
            className={cn(
              "inline-flex h-7 flex-1 items-center justify-center rounded-md px-2.5 text-xs font-medium transition sm:flex-none",
              includeAnswerKey
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-800",
            )}
          >
            Paper + key
          </Link>
          <Link
            href={printHref(activeSet, false)}
            aria-current={includeAnswerKey ? undefined : "page"}
            className={cn(
              "inline-flex h-7 flex-1 items-center justify-center rounded-md px-2.5 text-xs font-medium transition sm:flex-none",
              includeAnswerKey
                ? "text-slate-500 hover:text-slate-800"
                : "bg-white text-slate-900 shadow-sm",
            )}
          >
            Paper only
          </Link>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={() => window.print()}
          className="order-last w-full sm:order-none sm:w-auto"
        >
          <Printer className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Print / Save as PDF</span>
          <span className="sm:hidden">Print</span>
        </Button>
      </div>
    </div>
  );
}
