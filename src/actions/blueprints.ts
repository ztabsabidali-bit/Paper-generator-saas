"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionError, actionOk, describeError, type ActionResult } from "@/lib/action-result";
import { getSessionContext } from "@/lib/auth/session";
import { canManageBank } from "@/lib/rbac";
import {
  createBlueprintSchema,
  updateBlueprintSchema,
  type BlueprintInput,
} from "@/lib/validation/paper";
import {
  createBlueprint,
  deleteBlueprint,
  getBlueprintOwner,
  updateBlueprint,
  type BlueprintPayload,
} from "@/services/blueprints.service";
import type { PaperBlueprint } from "@/types/domain";

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

function toPayload(values: BlueprintInput): BlueprintPayload {
  return {
    name: values.name,
    subjectId: values.subject_id,
    topicIds: values.topic_ids,
    blueprint: values.blueprint,
    setCount: values.set_count,
    shuffleOptions: values.shuffle_options,
    durationMinutes: values.duration_minutes,
  };
}

export async function createBlueprintAction(
  input: unknown,
): Promise<ActionResult<{ blueprint: PaperBlueprint }>> {
  const parsed = createBlueprintSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");
  const { supabase, profile } = context;

  if (!profile.institution_id) {
    return actionError("Your account is not linked to an institution. Ask a super admin.");
  }

  try {
    const blueprint = await createBlueprint(
      supabase,
      profile.institution_id,
      toPayload(parsed.data),
    );
    revalidatePath("/papers/new");
    return actionOk({ blueprint });
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function updateBlueprintAction(
  input: unknown,
): Promise<ActionResult<{ blueprint: PaperBlueprint }>> {
  const parsed = updateBlueprintSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Please fix the highlighted fields.", fieldErrorsFrom(parsed.error));
  }

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");
  const { supabase, profile } = context;

  if (!profile.institution_id) {
    return actionError("Your account is not linked to an institution. Ask a super admin.");
  }

  try {
    const existing = await getBlueprintOwner(supabase, parsed.data.id);
    if (!existing) return actionError("That blueprint no longer exists.");
    if (existing.institution_id !== profile.institution_id) {
      return actionError("That blueprint belongs to another institution.");
    }
    if (!canManageBank(profile.role) && existing.created_by !== profile.id) {
      return actionError("You can only change blueprints you created.");
    }

    const blueprint = await updateBlueprint(
      supabase,
      parsed.data.id,
      toPayload(parsed.data),
    );
    revalidatePath("/papers/new");
    return actionOk({ blueprint });
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function deleteBlueprintAction(id: string): Promise<ActionResult<null>> {
  if (!z.uuid().safeParse(id).success) {
    return actionError("That blueprint no longer exists.");
  }

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");
  const { supabase, profile } = context;

  if (!profile.institution_id) {
    return actionError("Your account is not linked to an institution. Ask a super admin.");
  }

  try {
    const existing = await getBlueprintOwner(supabase, id);
    if (!existing) return actionError("That blueprint no longer exists.");
    if (existing.institution_id !== profile.institution_id) {
      return actionError("That blueprint belongs to another institution.");
    }
    if (!canManageBank(profile.role) && existing.created_by !== profile.id) {
      return actionError("You can only delete blueprints you created.");
    }

    await deleteBlueprint(supabase, id);
    revalidatePath("/papers/new");
    return actionOk(null);
  } catch (error) {
    return actionError(describeError(error));
  }
}
