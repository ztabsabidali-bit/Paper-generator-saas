import { requireRole } from "@/lib/auth/guards";
import { listUsers } from "@/services/users.service";
import { UsersManager } from "@/components/users/users-manager";
import { PageHeader } from "@/components/ui/shell";

export const metadata = { title: "Staff" };

export default async function UsersPage() {
  const { supabase, profile } = await requireRole("super_admin", "/users");
  const users = await listUsers(supabase);

  return (
    <>
      <PageHeader
        title="Staff & roles"
        description="Create accounts, assign roles and disable access. Only super admins can manage staff."
      />
      <UsersManager users={users} currentUserId={profile.id} />
    </>
  );
}
