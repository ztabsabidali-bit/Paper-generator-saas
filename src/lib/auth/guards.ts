import "server-only";

import { redirect } from "next/navigation";
import { getSessionContext, type SessionContext } from "./session";
import { hasRole } from "@/lib/rbac";
import type { UserRole } from "@/types/database";

export async function requireSession(nextPath = "/dashboard"): Promise<SessionContext> {
  const context = await getSessionContext();
  if (!context) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return context;
}

/** Layout-level role gate. RLS remains the authoritative boundary. */
export async function requireRole(
  minimum: UserRole,
  nextPath = "/dashboard",
): Promise<SessionContext> {
  const context = await requireSession(nextPath);
  if (!hasRole(context.profile.role, minimum)) {
    redirect("/dashboard?error=forbidden");
  }
  return context;
}
