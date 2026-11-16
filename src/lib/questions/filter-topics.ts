import type { QuestionFilters } from "@/lib/validation/question";
import type { SubjectWithTopics } from "@/types/domain";

/**
 * Translates the human-readable catalogue filters (class → subject → chapter →
 * topic → sub-topic) into the topic ids the questions table stores.
 *
 * Returns `undefined` when no placement filter is active, so callers can skip
 * the `in(...)` clause entirely.
 */
export function resolveFilterTopicIds(
  catalog: SubjectWithTopics[],
  filters: QuestionFilters,
): string[] | undefined {
  if (
    !filters.class &&
    !filters.subject &&
    !filters.chapter &&
    !filters.topic &&
    !filters.subtopic
  ) {
    return undefined;
  }

  return catalog
    .filter((subject) => !filters.subject || subject.id === filters.subject)
    .filter((subject) => !filters.class || subject.class_name === filters.class)
    .flatMap((subject) => subject.topics)
    .filter((topic) => !filters.chapter || topic.chapter_title === filters.chapter)
    .filter((topic) => !filters.topic || topic.topic_title === filters.topic)
    .filter((topic) => !filters.subtopic || topic.subtopic_title === filters.subtopic)
    .map((topic) => topic.id);
}
