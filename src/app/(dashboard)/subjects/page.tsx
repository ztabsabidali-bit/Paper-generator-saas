import { requireRole } from "@/lib/auth/guards";
import { getCatalog } from "@/services/catalog.service";
import { SubjectsManager } from "@/components/subjects/subjects-manager";
import { PageHeader } from "@/components/ui/shell";

export const metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const { supabase } = await requireRole("admin", "/subjects");
  const catalog = await getCatalog(supabase);

  return (
    <>
      <PageHeader
        title="Subjects & chapters"
        description="The catalogue that drives the question bank and paper builder. Class → subject → chapter → topic."
      />
      <SubjectsManager catalog={catalog} />
    </>
  );
}
