import { requireRole } from "@/lib/auth/guards";
import { listInstitutions } from "@/services/institution.service";
import { listUsers } from "@/services/users.service";
import { UsersManager } from "@/components/users/users-manager";
import { PageHeader } from "@/components/ui/shell";
import type { Institution } from "@/types/domain";

export const metadata = { title: "Staff" };

export default async function UsersPage() {
  const { supabase, profile } = await requireRole("admin", "/users");

  const [users, institutions] = await Promise.all([
    listUsers(supabase),
    profile.role === "super_admin"
      ? listInstitutions(supabase)
      : Promise.resolve<Institution[]>([]),
  ]);

  return (
    <>
      <PageHeader
        title="Staff & roles"
        description={
          profile.role === "super_admin"
            ? "Provision institution heads and teachers. Only a super admin can delete accounts."
            : "Manage the teachers and admins of your institution."
        }
      />
      <UsersManager
        users={users}
        currentUserId={profile.id}
        currentRole={profile.role}
        institutions={institutions}
      />
    </>
  );
}
