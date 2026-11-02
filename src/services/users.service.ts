import "server-only";

import type { SupabaseServerClient } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/types/database";
import type { StaffMember } from "@/types/domain";

interface RawStaffRow extends Omit<StaffMember, "institution"> {
  institution: { id: string; name: string } | { id: string; name: string }[] | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/**
 * RLS decides the scope: the developer sees every institution, an institution
 * head sees their own staff, a teacher only sees themselves.
 */
export async function listUsers(supabase: SupabaseServerClient): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from("users")
    .select(
      "id, email, full_name, role, is_active, institution_id, created_at, institution:institutions(id, name)",
    )
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Could not load users: ${error.message}`);

  return ((data ?? []) as unknown as RawStaffRow[]).map((row) => ({
    ...row,
    institution: first(row.institution),
  }));
}

export interface CreateUserInput {
  email: string;
  full_name: string;
  role: UserRole;
  password: string;
  institution_id: string | null;
}

/**
 * Provisions an account with the service-role key. The `on_auth_user_created`
 * trigger creates the public.users row; the role and institution are applied
 * explicitly afterwards.
 */
export async function createUser(input: CreateUserInput): Promise<string> {
  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      ...(input.institution_id ? { institution_id: input.institution_id } : {}),
    },
  });

  if (error || !data.user) {
    throw new Error(`Could not create the account: ${error?.message ?? "unknown error"}`);
  }

  // Upsert rather than update: the auth trigger normally creates the row, but
  // this keeps provisioning correct even if the trigger was disabled.
  const { error: profileError } = await admin.from("users").upsert(
    {
      id: data.user.id,
      email: input.email,
      full_name: input.full_name,
      role: input.role,
      institution_id: input.institution_id,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id).catch(() => undefined);
    throw new Error(`Could not assign the role: ${profileError.message}`);
  }

  return data.user.id;
}

export async function updateUserRole(
  supabase: SupabaseServerClient,
  id: string,
  role: UserRole,
) {
  const { error } = await supabase.from("users").update({ role }).eq("id", id);
  if (error) throw new Error(`Could not update the role: ${error.message}`);
}

export async function updateUserStatus(
  supabase: SupabaseServerClient,
  id: string,
  isActive: boolean,
) {
  const { error } = await supabase
    .from("users")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) throw new Error(`Could not update the user: ${error.message}`);
}

export async function deleteUser(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(`Could not delete the account: ${error.message}`);
}
