import { requireSession } from "@/lib/auth/guards";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { getInstitutionById } from "@/services/institution.service";

// Every page under this layout is per-user and cookie-bound. Without this,
// Next can prune the dynamic render at build time (when Supabase env vars are
// absent) and bake a "redirect to /login" response into the static output.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { supabase, profile } = await requireSession("/dashboard");
  const institution = profile.institution_id
    ? await getInstitutionById(supabase, profile.institution_id)
    : null;

  const subtitle =
    profile.role === "super_admin" ? "Platform" : (institution?.name ?? null);

  return (
    <DashboardShell
      role={profile.role}
      name={profile.full_name}
      email={profile.email}
      institutionName={subtitle}
    >
      {children}
    </DashboardShell>
  );
}
