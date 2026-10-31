import { requireSession } from "@/lib/auth/guards";
import { getCatalog } from "@/services/catalog.service";
import { QuestionForm } from "@/components/questions/question-form";
import { PageHeader } from "@/components/ui/shell";

export const metadata = { title: "New question" };

export default async function NewQuestionPage() {
  const { supabase } = await requireSession("/questions/new");
  const catalog = await getCatalog(supabase);

  return (
    <>
      <PageHeader
        title="New question"
        description="Attach the question to a chapter, write it in Markdown with LaTeX math, and preview it live."
      />
      <QuestionForm catalog={catalog} />
    </>
  );
}
