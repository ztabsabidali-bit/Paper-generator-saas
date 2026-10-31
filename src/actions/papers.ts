"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionOk, describeError, type ActionResult } from "@/lib/action-result";
import { getSessionContext } from "@/lib/auth/session";
import { createSeed } from "@/lib/papers/prng";
import { generatePaper } from "@/lib/papers/generator";
import { generatePaperSchema, poolCountRequestSchema } from "@/lib/validation/paper";
import { createPaper, deletePaper } from "@/services/papers.service";
import { getPoolCounts, getPoolQuestions } from "@/services/questions.service";
import type { PoolCounts } from "@/services/questions.service";

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
  const { supabase } = context;
  const values = parsed.data;

  try {
    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("id, class_name, subject_name")
      .eq("id", values.subject_id)
      .maybeSingle();

    if (subjectError || !subject) return actionError("That subject could not be found.");

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
      instructions: values.instructions ?? null,
      duration_minutes: values.duration_minutes,
      exam_session: values.exam_session ?? null,
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
