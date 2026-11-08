"use server";

import { revalidatePath } from "next/cache";
import { getSessionContext } from "@/lib/auth/session";
import type { SupabaseServerClient } from "@/lib/auth/session";
import { canEditQuestion } from "@/lib/rbac";
import { actionError, actionOk, describeError, type ActionResult } from "@/lib/action-result";
import { questionIdsSchema, questionInputSchema } from "@/lib/validation/question";
import { getQuestionById, getQuestionUsageCounts } from "@/services/questions.service";

function fieldErrorsFrom(error: {
  flatten: () => { fieldErrors: Record<string, string[] | undefined> };
}) {
  const flattened = error.flatten().fieldErrors;
  return Object.fromEntries(
    Object.entries(flattened)
      .filter(([, value]) => Boolean(value?.length))
      .map(([key, value]) => [key, value as string[]]),
  );
}

export async function saveQuestionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = questionInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");

  const { supabase, profile } = context;
  const values = parsed.data;

  if (!profile.institution_id) {
    return actionError("Your account is not linked to an institution. Ask a super admin.");
  }

  if (values.id) {
    const existing = await getQuestionById(supabase, values.id);
    if (!existing) return actionError("That question no longer exists.");
    if (!canEditQuestion(profile.role, profile.id, existing.created_by)) {
      return actionError("You can only edit questions you created.");
    }
  }

  const payload = {
    topic_id: values.topic_id,
    question_type: values.question_type,
    question_text: values.question_text,
    options: values.question_type === "mcq" ? (values.options ?? null) : null,
    correct_answer: values.correct_answer ?? null,
    medium: values.medium,
    difficulty: values.difficulty,
    marks: values.marks,
    text_direction: values.text_direction,
    explanation: values.explanation ?? null,
    is_active: values.is_active ?? true,
  };

  try {
    if (values.id) {
      const { error } = await supabase
        .from("questions")
        .update(payload)
        .eq("id", values.id);
      if (error) return actionError(error.message);
      revalidatePath("/questions");
      return actionOk({ id: values.id });
    }

    const { data, error } = await supabase
      .from("questions")
      .insert({ ...payload, created_by: profile.id, institution_id: profile.institution_id })
      .select("id")
      .single();

    if (error || !data) return actionError(error?.message ?? "Could not save the question.");

    revalidatePath("/questions");
    revalidatePath("/dashboard");
    return actionOk({ id: data.id });
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function archiveQuestionAction(id: string): Promise<ActionResult<null>> {
  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");

  const { supabase, profile } = context;
  const existing = await getQuestionById(supabase, id);
  if (!existing) return actionError("That question no longer exists.");
  if (!canEditQuestion(profile.role, profile.id, existing.created_by)) {
    return actionError("You can only archive questions you created.");
  }

  const { error } = await supabase.from("questions").update({ is_active: false }).eq("id", id);
  if (error) return actionError(error.message);

  revalidatePath("/questions");
  return actionOk(null);
}

export async function restoreQuestionAction(id: string): Promise<ActionResult<null>> {
  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");

  const { supabase, profile } = context;
  const existing = await getQuestionById(supabase, id);
  if (!existing) return actionError("That question no longer exists.");
  if (!canEditQuestion(profile.role, profile.id, existing.created_by)) {
    return actionError("You can only restore questions you created.");
  }

  const { error } = await supabase.from("questions").update({ is_active: true }).eq("id", id);
  if (error) return actionError(error.message);

  revalidatePath("/questions");
  return actionOk(null);
}

interface EditableQuestionRow {
  id: string;
  created_by: string | null;
  is_active: boolean;
}

async function loadEditableQuestions(
  supabase: SupabaseServerClient,
  ids: string[],
  role: Parameters<typeof canEditQuestion>[0],
  userId: string,
) {
  const { data, error } = await supabase
    .from("questions")
    .select("id, created_by, is_active")
    .in("id", ids);

  if (error) return { rows: [] as EditableQuestionRow[], error: error.message };

  const rows = ((data ?? []) as EditableQuestionRow[]).filter((row) =>
    canEditQuestion(role, userId, row.created_by),
  );
  return { rows, error: null };
}

export async function bulkArchiveQuestionsAction(
  ids: string[],
): Promise<ActionResult<{ updated: number; skipped: number }>> {
  const parsed = questionIdsSchema.safeParse(ids);
  if (!parsed.success) return actionError("Select at least one question.");

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");
  const { supabase, profile } = context;

  const { rows, error } = await loadEditableQuestions(
    supabase,
    parsed.data,
    profile.role,
    profile.id,
  );
  if (error) return actionError(error);

  const target = rows.filter((row) => row.is_active).map((row) => row.id);
  if (target.length > 0) {
    const { error: updateError } = await supabase
      .from("questions")
      .update({ is_active: false })
      .in("id", target);
    if (updateError) return actionError(updateError.message);
  }

  revalidatePath("/questions");
  return actionOk({
    updated: target.length,
    skipped: parsed.data.length - target.length,
  });
}

export async function bulkRestoreQuestionsAction(
  ids: string[],
): Promise<ActionResult<{ updated: number; skipped: number }>> {
  const parsed = questionIdsSchema.safeParse(ids);
  if (!parsed.success) return actionError("Select at least one question.");

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");
  const { supabase, profile } = context;

  const { rows, error } = await loadEditableQuestions(
    supabase,
    parsed.data,
    profile.role,
    profile.id,
  );
  if (error) return actionError(error);

  const target = rows.filter((row) => !row.is_active).map((row) => row.id);
  if (target.length > 0) {
    const { error: updateError } = await supabase
      .from("questions")
      .update({ is_active: true })
      .in("id", target);
    if (updateError) return actionError(updateError.message);
  }

  revalidatePath("/questions");
  return actionOk({
    updated: target.length,
    skipped: parsed.data.length - target.length,
  });
}

export async function bulkDeleteQuestionsAction(
  ids: string[],
): Promise<ActionResult<{ deleted: number; blocked: number; skipped: number }>> {
  const parsed = questionIdsSchema.safeParse(ids);
  if (!parsed.success) return actionError("Select at least one question.");

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");
  const { supabase, profile } = context;

  const { rows, error } = await loadEditableQuestions(
    supabase,
    parsed.data,
    profile.role,
    profile.id,
  );
  if (error) return actionError(error);

  const editableIds = rows.map((row) => row.id);
  const usage = await getQuestionUsageCounts(supabase, editableIds);

  let deleted = 0;
  let blocked = 0;

  for (const id of editableIds) {
    if ((usage[id] ?? 0) > 0) {
      blocked += 1;
      continue;
    }

    const { error: deleteError } = await supabase.from("questions").delete().eq("id", id);
    if (deleteError) {
      // A paper may use this question outside the viewer's RLS scope.
      if (deleteError.code === "23503") {
        blocked += 1;
        continue;
      }
      return actionError(deleteError.message);
    }
    deleted += 1;
  }

  revalidatePath("/questions");
  revalidatePath("/dashboard");
  return actionOk({
    deleted,
    blocked,
    skipped: parsed.data.length - editableIds.length,
  });
}

export async function deleteQuestionAction(id: string): Promise<ActionResult<null>> {
  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");

  const { supabase, profile } = context;
  const existing = await getQuestionById(supabase, id);
  if (!existing) return actionError("That question no longer exists.");
  if (!canEditQuestion(profile.role, profile.id, existing.created_by)) {
    return actionError("You can only delete questions you created.");
  }

  const { count, error: countError } = await supabase
    .from("paper_questions")
    .select("id", { count: "exact", head: true })
    .eq("question_id", id);

  if (countError) return actionError(countError.message);
  if ((count ?? 0) > 0) {
    return actionError(
      `This question is used in ${count} paper ${count === 1 ? "set" : "sets"}. Archive it instead so those papers keep their layout.`,
    );
  }

  const { error } = await supabase.from("questions").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return actionError(
        "This question is used in a paper. Archive it instead so the paper keeps its layout.",
      );
    }
    return actionError(error.message);
  }

  revalidatePath("/questions");
  revalidatePath("/dashboard");
  return actionOk(null);
}
