"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionOk, describeError, type ActionResult } from "@/lib/action-result";
import { getSessionContext } from "@/lib/auth/session";
import { canManageBank } from "@/lib/rbac";
import { subjectInputSchema, topicInputSchema } from "@/lib/validation/common";

function flatten(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors)
      .filter(([, value]) => Boolean(value?.length))
      .map(([key, value]) => [key, value as string[]]),
  );
}

export async function createSubjectAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = subjectInputSchema.safeParse(input);
  if (!parsed.success) return actionError("Check the subject details.", flatten(parsed.error));

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canManageBank(context.profile.role)) {
    return actionError("Only admins can manage subjects.");
  }

  try {
    const { data, error } = await context.supabase
      .from("subjects")
      .insert(parsed.data)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return actionError("That class already has this subject.");
      }
      return actionError(error.message);
    }

    revalidatePath("/subjects");
    revalidatePath("/questions");
    return actionOk({ id: data.id });
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function deleteSubjectAction(id: string): Promise<ActionResult<null>> {
  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canManageBank(context.profile.role)) {
    return actionError("Only admins can manage subjects.");
  }

  const { error } = await context.supabase.from("subjects").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return actionError(
        "This subject still has questions used by existing papers. Archive those questions before deleting the subject.",
      );
    }
    return actionError(error.message);
  }

  revalidatePath("/subjects");
  revalidatePath("/questions");
  return actionOk(null);
}

export async function createTopicAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = topicInputSchema.safeParse(input);
  if (!parsed.success) return actionError("Check the chapter details.", flatten(parsed.error));

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canManageBank(context.profile.role)) {
    return actionError("Only admins can manage chapters.");
  }

  try {
    const { data, error } = await context.supabase
      .from("topics")
      .insert({
        subject_id: parsed.data.subject_id,
        chapter_title: parsed.data.chapter_title,
        topic_title: parsed.data.topic_title || null,
        subtopic_title: parsed.data.subtopic_title || null,
        chapter_order: parsed.data.chapter_order ?? 0,
      })
      .select("id")
      .single();

    if (error) return actionError(error.message);

    revalidatePath("/subjects");
    revalidatePath("/questions");
    return actionOk({ id: data.id });
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function deleteTopicAction(id: string): Promise<ActionResult<null>> {
  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canManageBank(context.profile.role)) {
    return actionError("Only admins can manage chapters.");
  }

  const { error } = await context.supabase.from("topics").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      return actionError(
        "This topic still has questions used by existing papers. Archive those questions before deleting it.",
      );
    }
    return actionError(error.message);
  }

  revalidatePath("/subjects");
  revalidatePath("/questions");
  return actionOk(null);
}
