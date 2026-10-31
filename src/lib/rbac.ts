import type { UserRole } from "@/types/database";

/** Higher number = more privilege. */
export const ROLE_RANK: Record<UserRole, number> = {
  teacher: 1,
  admin: 2,
  super_admin: 3,
};

export function hasRole(role: UserRole | null | undefined, minimum: UserRole) {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function canManageBank(role: UserRole | null | undefined) {
  return hasRole(role, "admin");
}

export function canManageUsers(role: UserRole | null | undefined) {
  return role === "super_admin";
}

export function canManageInstitution(role: UserRole | null | undefined) {
  return canManageBank(role);
}

/** Teachers may only edit questions they authored. */
export function canEditQuestion(
  role: UserRole | null | undefined,
  userId: string | null | undefined,
  ownerId: string | null | undefined,
) {
  if (!role || !userId) return false;
  if (canManageBank(role)) return true;
  return ownerId === userId;
}
