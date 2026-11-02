import { requireSession } from "@/lib/auth/guards";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
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
    <div className="min-h-screen md:flex">
      <Sidebar
        role={profile.role}
        name={profile.full_name}
        email={profile.email}
        institutionName={subtitle}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar name={profile.full_name} email={profile.email} role={profile.role} />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
