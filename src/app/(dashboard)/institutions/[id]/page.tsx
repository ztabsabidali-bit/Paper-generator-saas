import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/guards";
import { getInstitutionById } from "@/services/institution.service";
import { InstitutionForm } from "@/components/settings/institution-form";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/shell";

export const metadata = { title: "Institution" };

export default async function InstitutionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireRole("super_admin", `/institutions/${id}`);
  const institution = await getInstitutionById(supabase, id);

  if (!institution) notFound();

  return (
    <>
      <PageHeader
        title={institution.name}
        description="Branding and print header for this school."
        actions={
          <>
            <Link href="/institutions" className={buttonClasses("ghost", "md")}>
              <ArrowLeft className="h-4 w-4" aria-hidden />
              All institutions
            </Link>
            <Link href="/users" className={buttonClasses("outline", "md")}>
              <Users className="h-4 w-4" aria-hidden />
              Staff
            </Link>
          </>
        }
      />
      <InstitutionForm institution={institution} institutionId={institution.id} />
    </>
  );
}
