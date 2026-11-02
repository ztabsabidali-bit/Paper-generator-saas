"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionOk, describeError, type ActionResult } from "@/lib/action-result";
import { getSessionContext, type SessionContext } from "@/lib/auth/session";
import { assignableRoles, canCreateInstitutions, canManageUsers } from "@/lib/rbac";
import {
  roleUpdateSchema,
  userInputSchema,
  userStatusSchema,
} from "@/lib/validation/common";
import {
  createUser,
  deleteUser,
  updateUserRole,
  updateUserStatus,
} from "@/services/users.service";
import type { UserRole } from "@/types/database";

function flatten(error: { flatten: () => { fieldErrors: Record<string, string[] | undefined> } }) {
  return Object.fromEntries(
    Object.entries(error.flatten().fieldErrors)
      .filter(([, value]) => Boolean(value?.length))
      .map(([key, value]) => [key, value as string[]]),
  );
}

export async function createUserAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = userInputSchema.safeParse(input);
  if (!parsed.success) return actionError("Check the account details.", flatten(parsed.error));

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canManageUsers(context.profile.role)) {
    return actionError("Only institution admins and super admins can create accounts.");
  }

  const actor = context.profile;
  const role = parsed.data.role;

  if (!assignableRoles(actor.role).includes(role)) {
    return actionError("Your role cannot assign that role.");
  }

  // The developer is not tied to an institution; everyone else is pinned to theirs.
  const institutionId = canCreateInstitutions(actor.role)
    ? (parsed.data.institution_id ?? null)
    : actor.institution_id;

  if (role !== "super_admin" && !institutionId) {
    return actionError("Choose an institution for this account.");
  }

  if (!canCreateInstitutions(actor.role) && !actor.institution_id) {
    return actionError("Your account is not linked to an institution.");
  }

  try {
    const id = await createUser({
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      role,
      password: parsed.data.password,
      institution_id: role === "super_admin" ? null : institutionId,
    });
    revalidatePath("/users");
    return actionOk({ id });
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function updateUserRoleAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = roleUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("Select a valid role.");

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canManageUsers(context.profile.role)) {
    return actionError("Only institution admins and super admins can change roles.");
  }
  if (parsed.data.id === context.profile.id) {
    return actionError("You cannot change your own role.");
  }
  if (!assignableRoles(context.profile.role).includes(parsed.data.role)) {
    return actionError("Your role cannot assign that role.");
  }

  const target = await findManagedUser(context, parsed.data.id);
  if (!target.ok) return actionError(target.error);

  try {
    await updateUserRole(context.supabase, parsed.data.id, parsed.data.role);
    revalidatePath("/users");
    return actionOk(null);
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function updateUserStatusAction(input: unknown): Promise<ActionResult<null>> {
  const parsed = userStatusSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid status update.");

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canManageUsers(context.profile.role)) {
    return actionError("Only institution admins and super admins can change account status.");
  }
  if (parsed.data.id === context.profile.id) {
    return actionError("You cannot deactivate your own account.");
  }

  const target = await findManagedUser(context, parsed.data.id);
  if (!target.ok) return actionError(target.error);

  if (target.role === "super_admin" && context.profile.role !== "super_admin") {
    return actionError("Only a super admin can change a super admin account.");
  }

  try {
    await updateUserStatus(context.supabase, parsed.data.id, parsed.data.is_active);
    revalidatePath("/users");
    return actionOk(null);
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function deleteUserAction(id: string): Promise<ActionResult<null>> {
  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canCreateInstitutions(context.profile.role)) {
    return actionError("Only a super admin can delete accounts.");
  }
  if (id === context.profile.id) return actionError("You cannot delete your own account.");

  try {
    await deleteUser(id);
    revalidatePath("/users");
    return actionOk(null);
  } catch (error) {
    return actionError(describeError(error));
  }
}

/**
 * Loads the target through the caller's own client so RLS filters anything
 * outside their institution, and reports it as a normal error instead of a
 * silent zero-row update.
 */
async function findManagedUser(
  context: SessionContext,
  id: string,
): Promise<{ ok: true; role: UserRole } | { ok: false; error: string }> {
  const { data, error } = await context.supabase
    .from("users")
    .select("id, role")
    .eq("id", id)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) {
    return { ok: false, error: "That account is outside your institution or no longer exists." };
  }
  return { ok: true, role: data.role as UserRole };
}
