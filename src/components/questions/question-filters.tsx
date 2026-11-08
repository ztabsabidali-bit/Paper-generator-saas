"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { DIFFICULTY_META, MEDIUM_META, QUESTION_TYPE_META } from "@/lib/constants";

export interface FilterTopic {
  chapter: string;
  topic: string | null;
  subtopic: string | null;
}

export interface FilterSubject {
  id: string;
  className: string;
  subjectName: string;
  topics: FilterTopic[];
}

const SELECT_CLASSES =
  "h-10 rounded-lg border border-slate-300 bg-white px-2 text-xs text-slate-700 disabled:bg-slate-50 disabled:text-slate-400";

export function QuestionFilters({ catalog }: { catalog: FilterSubject[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  const className = searchParams.get("class") ?? "";
  const subjectId = searchParams.get("subject") ?? "";
  const chapter = searchParams.get("chapter") ?? "";
  const topic = searchParams.get("topic") ?? "";
  const subtopic = searchParams.get("subtopic") ?? "";
  const type = searchParams.get("type") ?? "";
  const difficulty = searchParams.get("difficulty") ?? "";
  const medium = searchParams.get("medium") ?? "";
  const status = searchParams.get("status") ?? "";

  const classes = useMemo(
    () => [...new Set(catalog.map((subject) => subject.className))],
    [catalog],
  );
  const subjects = useMemo(
    () => catalog.filter((subject) => (className ? subject.className === className : true)),
    [catalog, className],
  );

  const subjectTopics = useMemo(
    () => subjects.filter((subject) => subject.id === subjectId).flatMap((subject) => subject.topics),
    [subjects, subjectId],
  );
  const chapters = useMemo(
    () => [...new Set(subjectTopics.map((item) => item.chapter))],
    [subjectTopics],
  );
  const topics = useMemo(() => {
    const names = subjectTopics
      .filter((item) => !chapter || item.chapter === chapter)
      .map((item) => item.topic)
      .filter((name): name is string => Boolean(name));
    return [...new Set(names)];
  }, [subjectTopics, chapter]);
  const subtopics = useMemo(() => {
    const names = subjectTopics
      .filter((item) => !chapter || item.chapter === chapter)
      .filter((item) => !topic || item.topic === topic)
      .map((item) => item.subtopic)
      .filter((name): name is string => Boolean(name));
    return [...new Set(names)];
  }, [subjectTopics, chapter, topic]);

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === "class") {
      next.delete("subject");
      next.delete("chapter");
      next.delete("topic");
      next.delete("subtopic");
    }
    if (key === "subject") {
      next.delete("chapter");
      next.delete("topic");
      next.delete("subtopic");
    }
    if (key === "chapter") {
      next.delete("topic");
      next.delete("subtopic");
    }
    if (key === "topic") next.delete("subtopic");
    router.push(`/questions?${next.toString()}`);
  }

  const hasFilters = Boolean(
    className ||
      subjectId ||
      chapter ||
      topic ||
      subtopic ||
      type ||
      difficulty ||
      medium ||
      status ||
      search,
  );

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
        <form
          className="relative sm:col-span-2 md:col-span-3 xl:col-span-2"
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
          className={SELECT_CLASSES}
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
          className={SELECT_CLASSES}
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
          className={SELECT_CLASSES}
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
          value={topic}
          onChange={(event) => setParam("topic", event.target.value)}
          className={SELECT_CLASSES}
          aria-label="Filter by topic"
          disabled={!chapter}
        >
          <option value="">All topics</option>
          {topics.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={subtopic}
          onChange={(event) => setParam("subtopic", event.target.value)}
          className={SELECT_CLASSES}
          aria-label="Filter by subtopic"
          disabled={!topic}
        >
          <option value="">All subtopics</option>
          {subtopics.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(event) => setParam("type", event.target.value)}
          className={SELECT_CLASSES}
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
          className={SELECT_CLASSES}
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
          className={SELECT_CLASSES}
          aria-label="Filter by medium"
        >
          <option value="">Any medium</option>
          {Object.entries(MEDIUM_META).map(([value, meta]) => (
            <option key={value} value={value}>
              {meta.label}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(event) => setParam("status", event.target.value)}
          className={SELECT_CLASSES}
          aria-label="Filter by status"
        >
          <option value="">Active and archived</option>
          <option value="active">Active only</option>
          <option value="archived">Archived only</option>
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
          className="h-10 sm:col-span-2 md:col-span-1"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Reset
        </Button>
      </div>
    </div>
  );
}
