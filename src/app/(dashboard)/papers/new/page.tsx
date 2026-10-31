import { requireSession } from "@/lib/auth/guards";
import { DEFAULT_INSTRUCTIONS } from "@/lib/constants";
import { getCatalog } from "@/services/catalog.service";
import { getInstitution } from "@/services/institution.service";
import { PaperBuilder } from "@/components/papers/paper-builder";
import { PageHeader } from "@/components/ui/shell";

export const metadata = { title: "Generate paper" };

export default async function NewPaperPage() {
  const { supabase } = await requireSession("/papers/new");
  const [catalog, institution] = await Promise.all([
    getCatalog(supabase),
    getInstitution(supabase),
  ]);

  return (
    <>
      <PageHeader
        title="Generate a paper"
        description="Pick the scope, set counts and marks, then produce one or more variants with an answer key."
      />
      <PaperBuilder
        catalog={catalog}
        defaultSession={institution.exam_session ?? ""}
        defaultInstructions={DEFAULT_INSTRUCTIONS}
      />
    </>
  );
}
