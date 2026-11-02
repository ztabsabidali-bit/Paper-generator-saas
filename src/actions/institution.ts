"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionOk, describeError, type ActionResult } from "@/lib/action-result";
import { getSessionContext } from "@/lib/auth/session";
import { canCreateInstitutions, canManageInstitution } from "@/lib/rbac";
import { institutionInputSchema } from "@/lib/validation/common";
import {
  createInstitution,
  updateInstitution,
} from "@/services/institution.service";

function flatten(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors)
      .filter(([, value]) => Boolean(value?.length))
      .map(([key, value]) => [key, value as string[]]),
  );
}

function toValues(data: {
  name: string;
  tagline?: string;
  address?: string;
  logo_url?: string;
  exam_session?: string;
  footer_note?: string;
}) {
  return {
    name: data.name,
    tagline: data.tagline || null,
    address: data.address || null,
    logo_url: data.logo_url || null,
    exam_session: data.exam_session || null,
    footer_note: data.footer_note || null,
  };
}

/** Updates one institution. `id` defaults to the caller's own institution. */
export async function saveInstitutionAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = institutionInputSchema.safeParse(input);
  const institutionId =
    typeof (input as { institution_id?: unknown })?.institution_id === "string"
      ? ((input as { institution_id: string }).institution_id)
      : null;

  if (!parsed.success) {
    return actionError("Check the institution details.", flatten(parsed.error));
  }

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canManageInstitution(context.profile.role)) {
    return actionError("Only institution admins can edit the institution profile.");
  }

  const targetId = institutionId ?? context.profile.institution_id;
  if (!targetId) {
    return actionError("Your account is not linked to an institution yet.");
  }
  if (!canCreateInstitutions(context.profile.role) && targetId !== context.profile.institution_id) {
    return actionError("You can only edit your own institution.");
  }

  try {
    await updateInstitution(context.supabase, targetId, toValues(parsed.data));
    revalidatePath("/settings");
    revalidatePath("/institutions");
    revalidatePath("/papers");
    return actionOk(null);
  } catch (error) {
    return actionError(describeError(error));
  }
}

/** Developer only: open a new school on the platform. */
export async function createInstitutionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  const parsed = institutionInputSchema.safeParse(input);
  if (!parsed.success) {
    return actionError("Check the institution details.", flatten(parsed.error));
  }

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canCreateInstitutions(context.profile.role)) {
    return actionError("Only a super admin can add institutions.");
  }

  try {
    const id = await createInstitution(context.supabase, toValues(parsed.data));
    revalidatePath("/institutions");
    return actionOk({ id });
  } catch (error) {
    return actionError(describeError(error));
  }
}
