import type { SupabaseServerClient } from "@/lib/auth/session";
import type { GeneratorQuestion } from "@/lib/papers/generator";
import type { Difficulty, Json, Medium, QuestionType, TextDirection } from "@/types/database";
import type {
  Question,
  QuestionOption,
  QuestionWithTopic,
  Subject,
  Topic,
} from "@/types/domain";

export interface QuestionListFilters {
  topicIds?: string[];
  type?: QuestionType;
  difficulty?: Difficulty;
  medium?: Medium;
  search?: string;
  activeOnly?: boolean;
  limit?: number;
}

const QUESTION_COLUMNS = [
  "id",
  "topic_id",
  "question_type",
  "question_text",
  "options",
  "correct_answer",
  "medium",
  "difficulty",
  "marks",
  "text_direction",
  "explanation",
  "created_by",
  "is_active",
  "created_at",
  "updated_at",
].join(", ");

const TOPIC_SELECT = [
  "id",
  "subject_id",
  "chapter_title",
  "topic_title",
  "subtopic_title",
  "chapter_order",
  "subject:subjects(id, class_name, subject_name)",
].join(", ");

interface RawQuestionTopic extends Omit<Topic, "id"> {
  id: string;
  subject?: Subject | Subject[] | null;
}

interface RawQuestion extends Omit<Question, "options"> {
  options: QuestionOption[] | null;
  topic?: RawQuestionTopic | RawQuestionTopic[] | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function normalizeQuestion(row: RawQuestion): Question {
  return {
    ...row,
    marks: Number(row.marks),
    options: Array.isArray(row.options) ? row.options : null,
  };
}

function normalizeQuestionWithTopic(row: RawQuestion): QuestionWithTopic {
  const topic = first(row.topic);
  return {
    ...normalizeQuestion(row),
    topic: topic
      ? {
          id: topic.id,
          subject_id: topic.subject_id,
          chapter_title: topic.chapter_title,
          topic_title: topic.topic_title,
          subtopic_title: topic.subtopic_title,
          chapter_order: topic.chapter_order,
          subject: first(topic.subject ?? null),
        }
      : null,
  };
}

export async function listQuestions(
  supabase: SupabaseServerClient,
  filters: QuestionListFilters = {},
): Promise<QuestionWithTopic[]> {
  const select = `${QUESTION_COLUMNS}, topic:topics(${TOPIC_SELECT})`;

  let query = supabase
    .from("questions")
    .select(select)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 200);

  if (filters.topicIds) {
    if (filters.topicIds.length === 0) return [];
    query = query.in("topic_id", filters.topicIds);
  }
  if (filters.type) query = query.eq("question_type", filters.type);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
  if (filters.medium) query = query.eq("medium", filters.medium);
  if (filters.activeOnly) query = query.eq("is_active", true);
  if (filters.search) query = query.ilike("question_text", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load questions: ${error.message}`);

  return ((data ?? []) as unknown as RawQuestion[]).map(normalizeQuestionWithTopic);
}

export async function getQuestionById(
  supabase: SupabaseServerClient,
  id: string,
): Promise<QuestionWithTopic | null> {
  const { data, error } = await supabase
    .from("questions")
    .select(`${QUESTION_COLUMNS}, topic:topics(${TOPIC_SELECT})`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load the question: ${error.message}`);
  if (!data) return null;
  return normalizeQuestionWithTopic(data as unknown as RawQuestion);
}

/** Trimmed rows for the paper generator (no rendered text needed). */
export async function getPoolQuestions(
  supabase: SupabaseServerClient,
  topicIds: string[],
): Promise<GeneratorQuestion[]> {
  if (topicIds.length === 0) return [];

  const { data, error } = await supabase
    .from("questions")
    .select("id, question_type, difficulty, marks, options")
    .in("topic_id", topicIds)
    .eq("is_active", true);

  if (error) throw new Error(`Could not load the question pool: ${error.message}`);

  return ((data ?? []) as unknown as GeneratorQuestion[]).map((row) => ({
    ...row,
    marks: Number(row.marks),
    options: Array.isArray(row.options) ? row.options : null,
  }));
}

export interface PoolCounts {
  byType: Record<QuestionType, Record<Difficulty, number>>;
  total: number;
}

/** Availability preview shown in the paper builder. */
export async function getPoolCounts(
  supabase: SupabaseServerClient,
  topicIds: string[],
): Promise<PoolCounts> {
  const empty: PoolCounts = {
    byType: {
      mcq: { easy: 0, medium: 0, hard: 0 },
      short: { easy: 0, medium: 0, hard: 0 },
      long: { easy: 0, medium: 0, hard: 0 },
    },
    total: 0,
  };

  if (topicIds.length === 0) return empty;

  const { data, error } = await supabase
    .from("questions")
    .select("question_type, difficulty")
    .in("topic_id", topicIds)
    .eq("is_active", true);

  if (error) throw new Error(`Could not count questions: ${error.message}`);

  (data ?? []).forEach((row) => {
    const type = row.question_type as QuestionType;
    const difficulty = row.difficulty as Difficulty;
    empty.byType[type][difficulty] += 1;
    empty.total += 1;
  });

  return empty;
}

export interface SelectableQuestionFilters {
  type?: QuestionType;
  difficulty?: Difficulty;
  search?: string;
  limit?: number;
}

export interface SelectableQuestion {
  id: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  marks: number;
  question_text: string;
  text_direction: TextDirection;
  topic: {
    id: string;
    chapter_title: string;
    topic_title: string | null;
    subtopic_title: string | null;
  } | null;
}

interface RawSelectableQuestion {
  id: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  marks: number | string;
  question_text: string;
  text_direction: TextDirection;
  topic?: SelectableQuestion["topic"] | SelectableQuestion["topic"][] | null;
}

/**
 * Trimmed question rows for the manual paper picker. Only active questions are
 * returned, and placement details come along so the list can be grouped.
 */
export async function getSelectableQuestions(
  supabase: SupabaseServerClient,
  topicIds: string[],
  filters: SelectableQuestionFilters = {},
): Promise<SelectableQuestion[]> {
  if (topicIds.length === 0) return [];

  let query = supabase
    .from("questions")
    .select(
      "id, question_type, difficulty, marks, question_text, text_direction, topic:topics(id, chapter_title, topic_title, subtopic_title)",
    )
    .in("topic_id", topicIds)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(filters.limit ?? 300);

  if (filters.type) query = query.eq("question_type", filters.type);
  if (filters.difficulty) query = query.eq("difficulty", filters.difficulty);
  if (filters.search) query = query.ilike("question_text", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load questions: ${error.message}`);

  return ((data ?? []) as unknown as RawSelectableQuestion[]).map((row) => ({
    id: row.id,
    question_type: row.question_type,
    difficulty: row.difficulty,
    marks: Number(row.marks),
    question_text: row.question_text,
    text_direction: row.text_direction,
    topic: first(row.topic),
  }));
}

export async function countQuestions(supabase: SupabaseServerClient) {
  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export interface SubjectTopicRow {
  id: string;
  chapter_title: string;
  topic_title: string | null;
  subtopic_title: string | null;
  chapter_order: number;
}

/** Placement rows used to resolve CSV chapter/topic columns. */
export async function getSubjectTopics(
  supabase: SupabaseServerClient,
  subjectId: string,
): Promise<SubjectTopicRow[]> {
  const { data, error } = await supabase
    .from("topics")
    .select("id, chapter_title, topic_title, subtopic_title, chapter_order")
    .eq("subject_id", subjectId);

  if (error) throw new Error(`Could not load chapters: ${error.message}`);
  return (data ?? []) as SubjectTopicRow[];
}

/** Existing question text for duplicate detection during an import. */
export async function getQuestionTextsByTopic(
  supabase: SupabaseServerClient,
  topicIds: string[],
): Promise<string[]> {
  if (topicIds.length === 0) return [];

  const { data, error } = await supabase
    .from("questions")
    .select("question_text")
    .in("topic_id", topicIds)
    .limit(5000);

  if (error) throw new Error(`Could not check for duplicates: ${error.message}`);
  return ((data ?? []) as Array<{ question_text: string }>).map((row) => row.question_text);
}

export interface NewQuestionRow {
  topic_id: string;
  question_type: QuestionType;
  question_text: string;
  options: QuestionOption[] | null;
  correct_answer: string | null;
  medium: Medium;
  difficulty: Difficulty;
  marks: number;
  text_direction: TextDirection;
  explanation: string | null;
  created_by: string;
  institution_id: string;
}

/** One uniform batch insert; the caller decides how to recover from errors. */
export async function insertQuestionRows(
  supabase: SupabaseServerClient,
  rows: NewQuestionRow[],
): Promise<{ inserted: number; error: string | null }> {
  if (rows.length === 0) return { inserted: 0, error: null };

  const { error } = await supabase.from("questions").insert(
    rows.map((row) => ({ ...row, options: row.options as Json })),
  );
  if (error) return { inserted: 0, error: error.message };
  return { inserted: rows.length, error: null };
}
