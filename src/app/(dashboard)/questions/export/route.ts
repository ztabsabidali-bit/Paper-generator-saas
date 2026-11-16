import type { NextRequest } from "next/server";
import Papa from "papaparse";
import { getSessionContext } from "@/lib/auth/session";
import { resolveFilterTopicIds } from "@/lib/questions/filter-topics";
import { questionFilterSchema } from "@/lib/validation/question";
import { getCatalog } from "@/services/catalog.service";
import { listQuestions } from "@/services/questions.service";
import type { QuestionWithTopic } from "@/types/domain";

export const dynamic = "force-dynamic";

const EXPORT_LIMIT = 5000;
const OPTION_KEYS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/**
 * Excel and Sheets interpret a leading = or @ as a formula. Prefixing the cell
 * with an apostrophe keeps the text literal without changing what the user
 * sees in the cell. A leading + or - is left alone because many questions start
 * with a negative number.
 */
function safeCell(value: string | null | undefined) {
  const text = value ?? "";
  return /^[=@\t\r]/.test(text) ? `'${text}` : text;
}

function optionText(question: QuestionWithTopic, key: string) {
  return question.options?.find((option) => option.key === key)?.text ?? "";
}

function toRow(question: QuestionWithTopic) {
  const row: Record<string, string | number> = {
    class: question.topic?.subject?.class_name ?? "",
    subject: question.topic?.subject?.subject_name ?? "",
    chapter: question.topic?.chapter_title ?? "",
    topic: question.topic?.topic_title ?? "",
    subtopic: question.topic?.subtopic_title ?? "",
    type: question.question_type,
    question_text: safeCell(question.question_text),
    correct_answer: safeCell(question.correct_answer),
    difficulty: question.difficulty,
    marks: question.marks,
    medium: question.medium,
    direction: question.text_direction,
    explanation: safeCell(question.explanation),
    status: question.is_active ? "active" : "archived",
    created_at: question.created_at,
  };

  OPTION_KEYS.forEach((key, index) => {
    row[`option_${String.fromCharCode(97 + index)}`] = safeCell(optionText(question, key));
  });

  return row;
}

export async function GET(request: NextRequest) {
  const context = await getSessionContext();
  if (!context) {
    return new Response("Sign in to export the question bank.", { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const parsed = questionFilterSchema.safeParse({
    class: params.get("class") ?? undefined,
    subject: params.get("subject") ?? undefined,
    chapter: params.get("chapter") ?? undefined,
    topic: params.get("topic") ?? undefined,
    subtopic: params.get("subtopic") ?? undefined,
    type: params.get("type") ?? undefined,
    difficulty: params.get("difficulty") ?? undefined,
    medium: params.get("medium") ?? undefined,
    status: params.get("status") ?? undefined,
    q: params.get("q") ?? undefined,
  });
  if (!parsed.success) {
    return new Response("Those filters are not valid.", { status: 400 });
  }

  const filters = parsed.data;
  const catalog = await getCatalog(context.supabase);
  const topicIds = resolveFilterTopicIds(catalog, filters);

  let questions: QuestionWithTopic[];
  try {
    questions = await listQuestions(context.supabase, {
      topicIds,
      type: filters.type,
      difficulty: filters.difficulty,
      medium: filters.medium,
      status: filters.status,
      search: filters.q,
      limit: EXPORT_LIMIT,
    });
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Could not export questions.",
      { status: 500 },
    );
  }

  const csv = Papa.unparse(questions.map(toRow), {
    columns: [
      "class",
      "subject",
      "chapter",
      "topic",
      "subtopic",
      "type",
      "question_text",
      "option_a",
      "option_b",
      "option_c",
      "option_d",
      "option_e",
      "option_f",
      "option_g",
      "option_h",
      "correct_answer",
      "difficulty",
      "marks",
      "medium",
      "direction",
      "explanation",
      "status",
      "created_at",
    ],
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="paperforge-questions-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
