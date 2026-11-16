"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionOk, describeError, type ActionResult } from "@/lib/action-result";
import { getSessionContext } from "@/lib/auth/session";
import { canCreateInstitutions, canManageInstitution } from "@/lib/rbac";
import { createAdminClient } from "@/lib/supabase/admin";
import { institutionInputSchema } from "@/lib/validation/common";
import {
  createInstitution,
  updateInstitution,
} from "@/services/institution.service";

const LOGO_BUCKET = "branding";
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** Removes a previously uploaded logo when it lives in our public bucket. */
async function removeStoredLogo(
  admin: ReturnType<typeof createAdminClient>,
  url: string | null | undefined,
) {
  if (!url) return;
  const marker = `/storage/v1/object/public/${LOGO_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(url.slice(index + marker.length).split("?")[0] ?? "");
  if (!path) return;
  await admin.storage.from(LOGO_BUCKET).remove([path]);
}

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

/**
 * Uploads a logo to the public `branding` bucket and points the institution at
 * it. Runs with the service role because the bucket has no write policies for
 * browser clients; the role check above is the authorisation boundary.
 */
export async function uploadInstitutionLogoAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canManageInstitution(context.profile.role)) {
    return actionError("Only institution admins can change the logo.");
  }

  const requestedId = formData.get("institution_id");
  const targetId =
    typeof requestedId === "string" && requestedId
      ? requestedId
      : context.profile.institution_id;
  if (!targetId) {
    return actionError("Your account is not linked to an institution yet.");
  }
  if (!canCreateInstitutions(context.profile.role) && targetId !== context.profile.institution_id) {
    return actionError("You can only change your own institution.");
  }

  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return actionError("Choose a PNG, JPG or WebP image to upload.");
  }
  const extension = LOGO_EXTENSIONS[file.type];
  if (!extension) {
    return actionError("Use a PNG, JPG or WebP image.");
  }
  if (file.size > MAX_LOGO_BYTES) {
    return actionError("Keep the logo under 2 MB.");
  }

  const admin = createAdminClient();
  const path = `${targetId}/logo-${Date.now()}.${extension}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(LOGO_BUCKET)
    .upload(path, bytes, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploadError) {
    return actionError(`Could not upload the logo: ${uploadError.message}`);
  }

  const { data: publicUrl } = admin.storage.from(LOGO_BUCKET).getPublicUrl(path);
  const logoUrl = publicUrl.publicUrl;

  const { data: existing } = await context.supabase
    .from("institutions")
    .select("logo_url")
    .eq("id", targetId)
    .maybeSingle();

  const { error: updateError } = await context.supabase
    .from("institutions")
    .update({ logo_url: logoUrl })
    .eq("id", targetId);

  if (updateError) {
    await admin.storage.from(LOGO_BUCKET).remove([path]);
    return actionError(`Could not save the logo: ${updateError.message}`);
  }

  const previous = (existing as { logo_url: string | null } | null)?.logo_url;
  if (previous && previous !== logoUrl) {
    await removeStoredLogo(admin, previous);
  }

  revalidatePath("/settings");
  revalidatePath("/institutions");
  revalidatePath(`/institutions/${targetId}`);
  revalidatePath("/papers");
  return actionOk({ url: logoUrl });
}
