"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { DIFFICULTY_META, MEDIUM_META, QUESTION_TYPE_META } from "@/lib/constants";

export interface FilterSubject {
  id: string;
  className: string;
  subjectName: string;
  chapters: string[];
}

export function QuestionFilters({ catalog }: { catalog: FilterSubject[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const className = searchParams.get("class") ?? "";
  const subjectId = searchParams.get("subject") ?? "";
  const chapter = searchParams.get("chapter") ?? "";
  const type = searchParams.get("type") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";
  const medium = searchParams.get("medium") ?? "";

  const classes = useMemo(
    () => [...new Set(catalog.map((subject) => subject.className))],
    [catalog],
  );
  const subjects = useMemo(
    () => catalog.filter((subject) => (className ? subject.className === className : true)),
    [catalog, className],
  );
  const chapters = useMemo(
    () =>
      [...new Set(subjects.filter((s) => s.id === subjectId).flatMap((s) => s.chapters))],
    [subjects, subjectId],
  );

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "class") {
      next.delete("subject");
      next.delete("chapter");
    }
    if (key === "subject") next.delete("chapter");
    router.push(`/questions?${next.toString()}`);
  }

  const hasFilters = Boolean(
    className || subjectId || chapter || type || difficulty || medium || search,
  );

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[1.4fr_repeat(6,minmax(0,1fr))_auto]">
        <form
          className="relative sm:col-span-2 md:col-span-3 xl:col-span-1"
          onSubmit={(event) => {
            event.preventDefault();
            setParam("q", search.trim());
          }}
        >
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search question text…"
            className="pl-9"
            aria-label="Search questions"
          />
        </form>

        <select
          value={className}
          onChange={(event) => setParam("class", event.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
          aria-label="Filter by class"
        >
          <option value="">All classes</option>
          {classes.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={subjectId}
          onChange={(event) => setParam("subject", event.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
          aria-label="Filter by subject"
        >
          <option value="">All subjects</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.subjectName}
            </option>
          ))}
        </select>

        <select
          value={chapter}
          onChange={(event) => setParam("chapter", event.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
          aria-label="Filter by chapter"
          disabled={!subjectId}
        >
          <option value="">All chapters</option>
          {chapters.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(event) => setParam("type", event.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
          aria-label="Filter by type"
        >
          <option value="">Any type</option>
          {Object.entries(QUESTION_TYPE_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.short}
            </option>
          ))}
        </select>

        <select
          value={difficulty}
          onChange={(event) => setParam("difficulty", event.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
          aria-label="Filter by difficulty"
        >
          <option value="">Any level</option>
          {Object.entries(DIFFICULTY_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>

        <select
          value={medium}
          onChange={(event) => setParam("medium", event.target.value)}
          className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700"
          aria-label="Filter by medium"
        >
          <option value="">Any medium</option>
          {Object.entries(MEDIUM_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearch("");
            router.push("/questions");
          }}
          disabled={!hasFilters}
          className="h-10 sm:col-span-2 md:col-span-3 xl:col-span-1"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Reset
        </Button>
      </div>
    </div>
  );
}
