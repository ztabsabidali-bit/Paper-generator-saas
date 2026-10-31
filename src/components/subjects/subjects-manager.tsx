"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookOpen, Loader2, Plus, Trash2 } from "lucide-react";
import {
  createSubjectAction,
  createTopicAction,
  deleteSubjectAction,
  deleteTopicAction,
} from "@/actions/subjects";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert, EmptyState } from "@/components/ui/shell";
import { groupByClass, groupChapters } from "@/lib/catalog";
import type { SubjectWithTopics } from "@/types/domain";

export function SubjectsManager({ catalog }: { catalog: SubjectWithTopics[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [newClass, setNewClass] = useState("");
  const [newSubject, setNewSubject] = useState("");

  const [topicSubjectId, setTopicSubjectId] = useState(catalog[0]?.id ?? "");
  const [chapterTitle, setChapterTitle] = useState("");
  const [topicTitle, setTopicTitle] = useState("");
  const [subtopicTitle, setSubtopicTitle] = useState("");
  const [chapterOrder, setChapterOrder] = useState("0");

  const classes = [...new Set(catalog.map((subject) => subject.class_name))];
  const groups = groupByClass(catalog);

  function handleCreateSubject(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createSubjectAction({
        class_name: newClass.trim(),
        subject_name: newSubject.trim(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewSubject("");
      setNotice("Subject added.");
      router.refresh();
    });
  }

  function handleCreateTopic(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await createTopicAction({
        subject_id: topicSubjectId,
        chapter_title: chapterTitle.trim(),
        topic_title: topicTitle.trim() || undefined,
        subtopic_title: subtopicTitle.trim() || undefined,
        chapter_order: Number(chapterOrder) || 0,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setChapterTitle("");
      setTopicTitle("");
      setSubtopicTitle("");
      setNotice("Chapter added.");
      router.refresh();
    });
  }

  function removeSubject(id: string, label: string) {
    if (
      !window.confirm(
        `Delete ${label}? Its chapters and their questions will be removed permanently.`,
      )
    ) {
      return;
    }
    setBusyId(id);
    startTransition(async () => {
      const result = await deleteSubjectAction(id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function removeTopic(id: string) {
    if (!window.confirm("Delete this topic? Questions attached to it are removed too.")) {
      return;
    }
    setBusyId(id);
    startTransition(async () => {
      const result = await deleteTopicAction(id);
      setBusyId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          {groups.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="h-5 w-5" aria-hidden />}
              title="No subjects yet"
              description="Add your first class and subject with the forms on the right."
            />
          ) : (
            groups.map((group) => (
              <div key={group.className} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {group.className}
                  </h2>
                  <span className="text-[11px] text-slate-400">
                    {group.subjects.length} subject(s)
                  </span>
                </div>

                {group.subjects.map((subject) => {
                  const chapters = groupChapters(subject);
                  return (
                    <Card key={subject.id}>
                      <CardHeader className="flex items-center justify-between py-3">
                        <div>
                          <CardTitle>{subject.subject_name}</CardTitle>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {chapters.length} chapter(s) · {subject.topics.length} topic row(s)
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            removeSubject(
                              subject.id,
                              `${subject.class_name} ${subject.subject_name}`,
                            )
                          }
                          disabled={pending && busyId === subject.id}
                        >
                          {pending && busyId === subject.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" aria-hidden />
                          )}
                          Delete
                        </Button>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {chapters.length === 0 ? (
                          <p className="text-xs text-slate-500">
                            No chapters yet — add one on the right.
                          </p>
                        ) : (
                          chapters.map((chapter) => (
                            <div
                              key={chapter.chapterTitle}
                              className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
                            >
                              <p className="text-xs font-medium text-slate-800">
                                {chapter.chapterTitle}
                              </p>
                              <ul className="mt-1.5 space-y-1">
                                {chapter.topics.map((topic) => (
                                  <li
                                    key={topic.id}
                                    className="flex items-center justify-between gap-2"
                                  >
                                    <span className="text-[11px] text-slate-600">
                                      {[topic.topic_title, topic.subtopic_title]
                                        .filter(Boolean)
                                        .join(" — ") || "General"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeTopic(topic.id)}
                                      className="text-[10px] text-slate-400 hover:text-rose-600"
                                      aria-label="Delete topic"
                                    >
                                      <Trash2 className="h-3 w-3" aria-hidden />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add subject</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateSubject} className="space-y-3">
                <Field label="Class" htmlFor="new-class" required>
                  <Input
                    id="new-class"
                    list="class-options"
                    value={newClass}
                    onChange={(event) => setNewClass(event.target.value)}
                    placeholder="Class 9"
                    required
                  />
                  <datalist id="class-options">
                    {classes.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </Field>
                <Field label="Subject" htmlFor="new-subject" required>
                  <Input
                    id="new-subject"
                    value={newSubject}
                    onChange={(event) => setNewSubject(event.target.value)}
                    placeholder="Physics"
                    required
                  />
                </Field>
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden />
                  )}
                  Add subject
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add chapter / topic</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTopic} className="space-y-3">
                <Field label="Subject" htmlFor="topic-subject" required>
                  <Select
                    id="topic-subject"
                    value={topicSubjectId}
                    onChange={(event) => setTopicSubjectId(event.target.value)}
                  >
                    {catalog.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.class_name} · {subject.subject_name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Chapter title" htmlFor="chapter-title" required>
                  <Input
                    id="chapter-title"
                    value={chapterTitle}
                    onChange={(event) => setChapterTitle(event.target.value)}
                    placeholder="Kinematics"
                    required
                  />
                </Field>
                <Field label="Topic" htmlFor="topic-title">
                  <Input
                    id="topic-title"
                    value={topicTitle}
                    onChange={(event) => setTopicTitle(event.target.value)}
                    placeholder="Equations of motion"
                  />
                </Field>
                <Field label="Sub-topic" htmlFor="subtopic-title">
                  <Input
                    id="subtopic-title"
                    value={subtopicTitle}
                    onChange={(event) => setSubtopicTitle(event.target.value)}
                    placeholder="Second equation"
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Chapter order" htmlFor="chapter-order">
                    <Input
                      id="chapter-order"
                      type="number"
                      min={0}
                      value={chapterOrder}
                      onChange={(event) => setChapterOrder(event.target.value)}
                    />
                  </Field>
                  <div className="flex items-end">
                    <Badge tone="neutral" className="mb-2">
                      {catalog.reduce((sum, subject) => sum + subject.topics.length, 0)} topics
                    </Badge>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={pending || catalog.length === 0}
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Plus className="h-4 w-4" aria-hidden />
                  )}
                  Add chapter
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
