"use client";

import { useId, useMemo } from "react";
import { Field, Select } from "@/components/ui/field";
import type { SubjectWithTopics } from "@/types/domain";

export function PaperScopeFields({
  catalog,
  className,
  subjectId,
  onClassChange,
  onSubjectChange,
}: {
  catalog: SubjectWithTopics[];
  className: string;
  subjectId: string;
  onClassChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
}) {
  const classNames = useMemo(
    () => [...new Set(catalog.map((subject) => subject.class_name))],
    [catalog],
  );
  const subjects = useMemo(
    () => catalog.filter((subject) => subject.class_name === className),
    [catalog, className],
  );
  const uid = useId();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Class" htmlFor={`${uid}-class`}>
        <Select
          id={`${uid}-class`}
          value={className}
          onChange={(event) => onClassChange(event.target.value)}
        >
          {classNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Subject" htmlFor={`${uid}-subject`}>
        <Select
          id={`${uid}-subject`}
          value={subjectId}
          onChange={(event) => onSubjectChange(event.target.value)}
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.subject_name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
