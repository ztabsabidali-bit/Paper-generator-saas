import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { getInstitution } from "@/services/institution.service";
import { InstitutionForm } from "@/components/settings/institution-form";
import { buttonClasses } from "@/components/ui/button";
import { Alert, PageHeader } from "@/components/ui/shell";

export const metadata = { title: "Institution" };

export default async function SettingsPage() {
  const { supabase, profile } = await requireRole("admin", "/settings");

  if (!profile.institution_id) {
    return (
      <>
        <PageHeader
          title="Institution profile"
          description="Drives the printed header, session label and footer on every paper."
        />
        <Alert tone="warning">
          Your account is not linked to an institution. Manage schools from the{" "}
          <Link href="/institutions" className="font-medium underline">
            Institutions page
          </Link>
          , or open one there to edit its branding.
        </Alert>
      </>
    );
  }

  const institution = await getInstitution(supabase, profile.institution_id);

  return (
    <>
      <PageHeader
        title="Institution profile"
        description="Drives the printed header, session label and footer on every paper."
        actions={
          profile.role === "super_admin" ? (
            <Link href="/institutions" className={buttonClasses("outline", "md")}>
              All institutions
            </Link>
          ) : null
        }
      />
      <InstitutionForm institution={institution} institutionId={profile.institution_id} />
    </>
  );
}
