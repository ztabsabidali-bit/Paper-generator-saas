"use server";

import { revalidatePath } from "next/cache";
import { actionError, actionOk, describeError, type ActionResult } from "@/lib/action-result";
import { getSessionContext } from "@/lib/auth/session";
import { canManageUsers } from "@/lib/rbac";
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
    return actionError("Only super admins can create accounts.");
  }

  try {
    const id = await createUser(parsed.data);
    revalidatePath("/users");
    return actionOk({ id });
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function updateUserRoleAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = roleUpdateSchema.safeParse(input);
  if (!parsed.success) return actionError("Select a valid role.");

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canManageUsers(context.profile.role)) {
    return actionError("Only super admins can change roles.");
  }
  if (parsed.data.id === context.profile.id) {
    return actionError("You cannot change your own role.");
  }

  try {
    await updateUserRole(context.supabase, parsed.data.id, parsed.data.role);
    revalidatePath("/users");
    return actionOk(null);
  } catch (error) {
    return actionError(describeError(error));
  }
}

export async function updateUserStatusAction(
  input: unknown,
): Promise<ActionResult<null>> {
  const parsed = userStatusSchema.safeParse(input);
  if (!parsed.success) return actionError("Invalid status update.");

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired.");
  if (!canManageUsers(context.profile.role)) {
    return actionError("Only super admins can change account status.");
  }
  if (parsed.data.id === context.profile.id) {
    return actionError("You cannot deactivate your own account.");
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
  if (!canManageUsers(context.profile.role)) {
    return actionError("Only super admins can delete accounts.");
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
