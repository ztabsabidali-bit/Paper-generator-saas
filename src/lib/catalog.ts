import type { SubjectWithTopics, Topic } from "@/types/domain";

export function groupByClass(catalog: SubjectWithTopics[]) {
  const groups = new Map<string, SubjectWithTopics[]>();
  catalog.forEach((subject) => {
    const list = groups.get(subject.class_name) ?? [];
    list.push(subject);
    groups.set(subject.class_name, list);
  });
  return [...groups.entries()]
    .map(([className, subjects]) => ({ className, subjects }))
    .sort((a, b) => a.className.localeCompare(b.className));
}

/** Distinct chapters for a subject, each with its topic rows. */
export function groupChapters(subject: SubjectWithTopics | undefined | null) {
  if (!subject) return [];
  const chapters = new Map<string, Topic[]>();
  subject.topics.forEach((topic) => {
    const list = chapters.get(topic.chapter_title) ?? [];
    list.push(topic);
    chapters.set(topic.chapter_title, list);
  });
  return [...chapters.entries()]
    .map(([chapterTitle, topics]) => ({ chapterTitle, topics }))
    .sort((a, b) => {
      const orderA = a.topics[0]?.chapter_order ?? 0;
      const orderB = b.topics[0]?.chapter_order ?? 0;
      return orderA - orderB || a.chapterTitle.localeCompare(b.chapterTitle);
    });
}

export function topicLabel(topic: Topic) {
  return [topic.topic_title, topic.subtopic_title].filter(Boolean).join(" — ") || "General";
}
