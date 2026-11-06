"use client";

import { useId } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SET_LABELS } from "@/lib/constants";
import type { PrintOptionKey } from "@/lib/papers/print-options";
import type { PaperPrintOptions } from "@/types/domain";

function PrintCheckbox({
  id,
  checked,
  detail,
  onChange,
}: {
  id: string;
  checked: boolean;
  detail: string;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="inline-flex shrink-0 cursor-pointer select-none items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={`Print ${detail}`}
        className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
      Print
    </label>
  );
}

export function PaperDetailsFields({
  heading = "Paper details",
  title,
  onTitleChange,
  duration,
  onDurationChange,
  session,
  onSessionChange,
  setCount,
  onSetCountChange,
  instructions,
  onInstructionsChange,
  shuffleOptions,
  onShuffleOptionsChange,
  printOptions,
  onPrintOptionChange,
}: {
  heading?: string;
  title: string;
  onTitleChange: (value: string) => void;
  duration: number;
  onDurationChange: (value: number) => void;
  session: string;
  onSessionChange: (value: string) => void;
  setCount: number;
  onSetCountChange: (value: number) => void;
  instructions: string;
  onInstructionsChange: (value: string) => void;
  shuffleOptions: boolean;
  onShuffleOptionsChange: (value: boolean) => void;
  printOptions: PaperPrintOptions;
  onPrintOptionChange: (key: PrintOptionKey, value: boolean) => void;
}) {
  const uid = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="-mt-1 text-[11px] leading-relaxed text-slate-500">
          Untick <span className="font-semibold uppercase tracking-wide">Print</span> to leave a
          detail off the printed sheet. The answer key always keeps the title and set letter so
          examiners can match it to the paper.
        </p>

        <Field
          label="Paper title"
          htmlFor={`${uid}-title`}
          required
          hint={
            printOptions.title
              ? "Printed at the top of every set."
              : "Hidden on the printed paper. The answer key still shows it."
          }
          action={
            <PrintCheckbox
              id={`${uid}-title-print`}
              checked={printOptions.title}
              detail="paper title"
              onChange={(value) => onPrintOptionChange("title", value)}
            />
          }
        >
          <Input
            id={`${uid}-title`}
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="Class 9 Physics — Final Term"
            required
          />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field
            label="Duration (minutes)"
            htmlFor={`${uid}-duration`}
            hint={printOptions.duration ? undefined : "Hidden on the printed paper."}
            action={
              <PrintCheckbox
                id={`${uid}-duration-print`}
                checked={printOptions.duration}
                detail="duration"
                onChange={(value) => onPrintOptionChange("duration", value)}
              />
            }
          >
            <Input
              id={`${uid}-duration`}
              type="number"
              min={15}
              max={300}
              step={5}
              value={duration}
              onChange={(event) => onDurationChange(Number(event.target.value) || 120)}
            />
          </Field>

          <Field
            label="Exam session"
            htmlFor={`${uid}-session`}
            hint={printOptions.session ? undefined : "Hidden on the printed paper."}
            action={
              <PrintCheckbox
                id={`${uid}-session-print`}
                checked={printOptions.session}
                detail="exam session"
                onChange={(value) => onPrintOptionChange("session", value)}
              />
            }
          >
            <Input
              id={`${uid}-session`}
              value={session}
              onChange={(event) => onSessionChange(event.target.value)}
              placeholder="2026-27"
            />
          </Field>

          <Field
            label="Variants"
            htmlFor={`${uid}-sets`}
            hint={
              printOptions.set_label
                ? undefined
                : "Hidden on the paper. The answer key still shows the set."
            }
            action={
              <PrintCheckbox
                id={`${uid}-sets-print`}
                checked={printOptions.set_label}
                detail="set letter"
                onChange={(value) => onPrintOptionChange("set_label", value)}
              />
            }
          >
            <Select
              id={`${uid}-sets`}
              value={setCount}
              onChange={(event) => onSetCountChange(Number(event.target.value))}
            >
              {SET_LABELS.map((label, index) => (
                <option key={label} value={index + 1}>
                  {index + 1} {index === 0 ? "set" : "sets"} ({SET_LABELS.slice(0, index + 1).join(", ")})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field
          label="Instructions"
          htmlFor={`${uid}-instructions`}
          hint={
            printOptions.instructions
              ? "One instruction per line."
              : "Hidden on the printed paper."
          }
          action={
            <PrintCheckbox
              id={`${uid}-instructions-print`}
              checked={printOptions.instructions}
              detail="instructions"
              onChange={(value) => onPrintOptionChange("instructions", value)}
            />
          }
        >
          <Textarea
            id={`${uid}-instructions`}
            value={instructions}
            onChange={(event) => onInstructionsChange(event.target.value)}
            rows={3}
          />
        </Field>

        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={shuffleOptions}
            onChange={(event) => onShuffleOptionsChange(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Shuffle MCQ options per set (the answer key follows the shuffle)
        </label>
      </CardContent>
    </Card>
  );
}
