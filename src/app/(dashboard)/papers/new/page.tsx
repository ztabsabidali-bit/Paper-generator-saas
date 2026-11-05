import { requireSession } from "@/lib/auth/guards";
import { DEFAULT_INSTRUCTIONS } from "@/lib/constants";
import { getCatalog } from "@/services/catalog.service";
import { getInstitution } from "@/services/institution.service";
import { PaperBuilder } from "@/components/papers/paper-builder";
import { Alert, PageHeader } from "@/components/ui/shell";

export const metadata = { title: "Generate paper" };

export default async function NewPaperPage() {
  const { supabase, profile } = await requireSession("/papers/new");

  if (!profile.institution_id) {
    return (
      <>
        <PageHeader
          title="Generate a paper"
          description="Papers belong to a single institution's question bank."
        />
        <Alert tone="warning" title="No institution linked to this account">
          Developer accounts are not tied to a school, so they cannot generate papers. Ask
          an institution admin or teacher to build the paper, or link this account to a
          school from the Staff page.
        </Alert>
      </>
    );
  }

  const [catalog, institution] = await Promise.all([
    getCatalog(supabase, profile.institution_id),
    getInstitution(supabase, profile.institution_id),
  ]);

  return (
    <>
      <PageHeader
        title="Generate a paper"
        description="Filter the bank and tick the questions to print, or auto-fill from a blueprint."
      />
      <PaperBuilder
        catalog={catalog}
        defaultSession={institution.exam_session ?? ""}
        defaultInstructions={DEFAULT_INSTRUCTIONS}
      />
    </>
  );
}
