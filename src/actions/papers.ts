"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionOk, describeError, type ActionResult } from "@/lib/action-result";
import { getSessionContext } from "@/lib/auth/session";
import { createSeed } from "@/lib/papers/prng";
import { resolvePrintOptions } from "@/lib/papers/print-options";
import {
  buildVariantsFromSelection,
  generatePaper,
  type SelectionPick,
} from "@/lib/papers/generator";
import {
  generatePaperSchema,
  manualSelectionSchema,
  poolCountRequestSchema,
  selectableQuestionFilterSchema,
} from "@/lib/validation/paper";
import { createPaper, deletePaper } from "@/services/papers.service";
import {
  getPoolCounts,
  getPoolQuestions,
  getSelectableQuestions,
  type PoolCounts,
  type SelectableQuestion,
} from "@/services/questions.service";
import type { Difficulty, QuestionType } from "@/types/database";
import type { QuestionOption } from "@/types/domain";

export async function generatePaperAction(
  input: unknown,
): Promise<ActionResult<{ id: string; warnings: string[] }>> {
  const parsed = generatePaperSchema.safeParse(input);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return actionError(
      "Please fix the highlighted fields.",
      Object.fromEntries(
        Object.entries(flattened)
          .filter(([, value]) => Boolean(value?.length))
          .map(([key, value]) => [key, value as string[]]),
      ),
    );
  }

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");
  const { supabase, profile } = context;
  const values = parsed.data;

  if (!profile.institution_id) {
    return actionError("Your account is not linked to an institution. Ask a super admin.");
  }

  try {
    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("id, class_name, subject_name, institution_id")
      .eq("id", values.subject_id)
      .maybeSingle();

    if (subjectError || !subject) return actionError("That subject could not be found.");
    if (subject.institution_id !== profile.institution_id) {
      return actionError("That subject belongs to another institution.");
    }

    const { data: topics, error: topicsError } = await supabase
      .from("topics")
      .select("id, subject_id")
      .in("id", values.topic_ids);

    if (topicsError) return actionError(topicsError.message);

    const rows = (topics ?? []) as Array<{ id: string; subject_id: string }>;
    if (rows.length !== values.topic_ids.length) {
      return actionError("Some of the selected chapters no longer exist.");
    }
    if (rows.some((topic) => topic.subject_id !== values.subject_id)) {
      return actionError("The selected chapters do not belong to that subject.");
    }

    const pool = await getPoolQuestions(supabase, values.topic_ids);
    const seed = values.seed ?? createSeed();

    const result = generatePaper(pool, {
      blueprint: values.blueprint,
      setCount: values.set_count,
      shuffleOptions: values.shuffle_options,
      seed,
    });

    if (result.totalMarks === 0) {
      return actionError(
        "No printable questions were produced. Add questions to the selected chapters or lower the counts.",
      );
    }

    const paperId = await createPaper(supabase, {
      title: values.title,
      class_name: subject.class_name,
      subject_id: subject.id,
      institution_id: subject.institution_id,
      instructions: values.instructions ?? null,
      duration_minutes: values.duration_minutes,
      exam_session: values.exam_session ?? null,
      print_options: resolvePrintOptions(values.print_options),
      seed,
      total_marks: result.totalMarks,
      sets: result.sets,
    });

    revalidatePath("/papers");
    revalidatePath("/dashboard");
    return actionOk({ id: paperId, warnings: result.warnings });
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function getPoolCountsAction(topicIds: string[]): Promise<ActionResult<PoolCounts>> {
  const parsed = poolCountRequestSchema.safeParse({ topic_ids: topicIds });
  if (!parsed.success) return actionError("Select at least one chapter.");

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");

  try {
    const counts = await getPoolCounts(context.supabase, parsed.data.topic_ids);
    return actionOk(counts);
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function listSelectableQuestionsAction(
  input: unknown,
): Promise<ActionResult<SelectableQuestion[]>> {
  const parsed = selectableQuestionFilterSchema.safeParse(input);
  if (!parsed.success) return actionError("Choose a valid subject and filter.");

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");
  const { supabase, profile } = context;
  const values = parsed.data;

  if (!profile.institution_id) {
    return actionError("Your account is not linked to an institution. Ask a super admin.");
  }

  try {
    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("id, institution_id")
      .eq("id", values.subject_id)
      .maybeSingle();

    if (subjectError || !subject) return actionError("That subject could not be found.");
    if (subject.institution_id !== profile.institution_id) {
      return actionError("That subject belongs to another institution.");
    }

    let topicQuery = supabase.from("topics").select("id").eq("subject_id", subject.id);
    if (values.chapter) topicQuery = topicQuery.eq("chapter_title", values.chapter);
    if (values.topic) topicQuery = topicQuery.eq("topic_title", values.topic);
    if (values.subtopic) topicQuery = topicQuery.eq("subtopic_title", values.subtopic);

    const { data: topics, error: topicsError } = await topicQuery;
    if (topicsError) return actionError(topicsError.message);

    const topicIds = ((topics ?? []) as Array<{ id: string }>).map((topic) => topic.id);
    const questions = await getSelectableQuestions(supabase, topicIds, {
      type: values.type,
      difficulty: values.difficulty,
      search: values.search,
    });

    return actionOk(questions);
  } catch (error) {
    return actionError(describeError(error));
  }
}

interface RawPickedQuestion {
  id: string;
  question_type: QuestionType;
  difficulty: Difficulty;
  marks: number | string;
  options: QuestionOption[] | null;
  is_active: boolean;
  topic: { id: string; subject_id: string } | Array<{ id: string; subject_id: string }> | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function createPaperFromSelectionAction(
  input: unknown,
): Promise<ActionResult<{ id: string; warnings: string[] }>> {
  const parsed = manualSelectionSchema.safeParse(input);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return actionError(
      "Please fix the highlighted fields.",
      Object.fromEntries(
        Object.entries(flattened)
          .filter(([, value]) => Boolean(value?.length))
          .map(([key, value]) => [key, value as string[]]),
      ),
    );
  }

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");
  const { supabase, profile } = context;
  const values = parsed.data;

  if (!profile.institution_id) {
    return actionError("Your account is not linked to an institution. Ask a super admin.");
  }

  try {
    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("id, class_name, subject_name, institution_id")
      .eq("id", values.subject_id)
      .maybeSingle();

    if (subjectError || !subject) return actionError("That subject could not be found.");
    if (subject.institution_id !== profile.institution_id) {
      return actionError("That subject belongs to another institution.");
    }

    const wanted = [...new Set([...values.question_ids, ...(values.pool_ids ?? [])])];
    const { data: rows, error: rowsError } = await supabase
      .from("questions")
      .select(
        "id, question_type, difficulty, marks, options, is_active, topic:topics(id, subject_id)",
      )
      .in("id", wanted);

    if (rowsError) return actionError(rowsError.message);

    const byId = new Map<string, SelectionPick>();
    ((rows ?? []) as unknown as RawPickedQuestion[]).forEach((row) => {
      const topic = first(row.topic);
      if (!row.is_active || !topic || topic.subject_id !== subject.id) return;
      byId.set(row.id, {
        id: row.id,
        question_type: row.question_type,
        difficulty: row.difficulty,
        marks: Number(row.marks),
        options: Array.isArray(row.options) ? row.options : null,
      });
    });

    const missing = values.question_ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      return actionError(
        "Some selected questions are archived or no longer belong to this subject. Reload and pick again.",
      );
    }

    // Set A keeps the teacher's order; the rest of the visible pool can be swapped in.
    const picks = values.question_ids.map((id) => byId.get(id) as SelectionPick);
    const pool = wanted.map((id) => byId.get(id)).filter((row): row is SelectionPick => Boolean(row));

    const seed = values.seed ?? createSeed();
    const result = buildVariantsFromSelection({
      picks,
      pool: pool.length > 0 ? pool : picks,
      setCount: values.set_count,
      shuffleOptions: values.shuffle_options,
      seed,
    });

    if (result.totalMarks === 0) {
      return actionError("The selection produced an empty paper. Pick at least one question.");
    }

    const paperId = await createPaper(supabase, {
      title: values.title,
      class_name: subject.class_name,
      subject_id: subject.id,
      institution_id: subject.institution_id,
      instructions: values.instructions ?? null,
      duration_minutes: values.duration_minutes,
      exam_session: values.exam_session ?? null,
      print_options: resolvePrintOptions(values.print_options),
      seed,
      total_marks: result.totalMarks,
      sets: result.sets,
    });

    revalidatePath("/papers");
    revalidatePath("/dashboard");
    return actionOk({ id: paperId, warnings: result.warnings });
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function deletePaperAction(paperId: string): Promise<ActionResult<null>> {
  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");

  try {
    await deletePaper(context.supabase, paperId);
    revalidatePath("/papers");
    revalidatePath("/dashboard");
    return actionOk(null);
  } catch (error) {
    return actionError(describeError(error));
  }
}
