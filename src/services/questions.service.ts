import type { SupabaseServerClient } from "@/lib/auth/session";
import type { GeneratorQuestion } from "@/lib/papers/generator";
import type { Difficulty, Medium, QuestionType } from "@/types/database";
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

export async function countQuestions(supabase: SupabaseServerClient) {
  const { count } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}
