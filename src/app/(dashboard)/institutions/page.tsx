import { requireRole } from "@/lib/auth/guards";
import { listInstitutions } from "@/services/institution.service";
import { InstitutionsManager } from "@/components/institutions/institutions-manager";
import { PageHeader } from "@/components/ui/shell";

export const metadata = { title: "Institutions" };

export default async function InstitutionsPage() {
  const { supabase } = await requireRole("super_admin", "/institutions");
  const institutions = await listInstitutions(supabase);

  return (
    <>
      <PageHeader
        title="Institutions"
        description="Every school on the platform. Create one, then add its head from the Staff page."
      />
      <InstitutionsManager institutions={institutions} />
    </>
  );
}
