"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionOk, describeError, type ActionResult } from "@/lib/action-result";
import { getSessionContext } from "@/lib/auth/session";
import { canManageInstitution } from "@/lib/rbac";
import { institutionInputSchema } from "@/lib/validation/common";
import { updateInstitution } from "@/services/institution.service";

export async function saveInstitutionAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = institutionInputSchema.safeParse(input);
  if (!parsed.success) {
    const flattened = parsed.error.flatten().fieldErrors;
    return actionError(
      "Check the institution details.",
      Object.fromEntries(
        Object.entries(flattened)
          .filter(([, value]) => Boolean(value?.length))
          .map(([key, value]) => [key, value as string[]]),
      ),
    );
  }

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canManageInstitution(context.profile.role)) {
    return actionError("Only admins can edit the institution profile.");
  }

  try {
    await updateInstitution(context.supabase, {
      name: parsed.data.name,
      tagline: parsed.data.tagline || null,
      address: parsed.data.address || null,
      logo_url: parsed.data.logo_url || null,
      exam_session: parsed.data.exam_session || null,
      footer_note: parsed.data.footer_note || null,
    });
    revalidatePath("/settings");
    revalidatePath("/papers");
    return actionOk(null);
  } catch (error) {
    return actionError(describeError(error));
  }
}
