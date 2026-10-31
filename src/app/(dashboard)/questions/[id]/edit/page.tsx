import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { canEditQuestion } from "@/lib/rbac";
import { getCatalog } from "@/services/catalog.service";
import { getQuestionById } from "@/services/questions.service";
import { QuestionForm } from "@/components/questions/question-form";
import { PageHeader } from "@/components/ui/shell";

export const metadata = { title: "Edit question" };

export default async function EditQuestionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile } = await requireSession(`/questions/${id}/edit`);

  const [question, catalog] = await Promise.all([
    getQuestionById(supabase, id),
    getCatalog(supabase),
  ]);

  if (!question) notFound();
  if (!canEditQuestion(profile.role, profile.id, question.created_by)) {
    redirect("/questions?error=forbidden");
  }

  return (
    <>
      <PageHeader
        title="Edit question"
        description="Changes apply to future papers; already-generated papers keep a snapshot of the question."
      />
      <QuestionForm catalog={catalog} question={question} />
    </>
  );
}
