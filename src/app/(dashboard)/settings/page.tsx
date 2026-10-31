import { requireRole } from "@/lib/auth/guards";
import { getInstitution } from "@/services/institution.service";
import { InstitutionForm } from "@/components/settings/institution-form";
import { PageHeader } from "@/components/ui/shell";

export const metadata = { title: "Institution" };

export default async function SettingsPage() {
  const { supabase } = await requireRole("admin", "/settings");
  const institution = await getInstitution(supabase);

  return (
    <>
      <PageHeader
        title="Institution profile"
        description="Drives the printed header, session label and footer on every paper."
      />
      <InstitutionForm institution={institution} />
    </>
  );
}
