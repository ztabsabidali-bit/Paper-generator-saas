"use client";

import { useId } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SET_LABELS } from "@/lib/constants";

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
}) {
  const uid = useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field
          label="Paper title"
          htmlFor={`${uid}-title`}
          required
          hint="Printed at the top of every set."
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
          <Field label="Duration (minutes)" htmlFor={`${uid}-duration`}>
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

          <Field label="Exam session" htmlFor={`${uid}-session`}>
            <Input
              id={`${uid}-session`}
              value={session}
              onChange={(event) => onSessionChange(event.target.value)}
              placeholder="2026-27"
            />
          </Field>

          <Field label="Variants" htmlFor={`${uid}-sets`}>
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
          hint="One instruction per line."
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
