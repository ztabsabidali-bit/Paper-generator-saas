import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { getPaperWithSets } from "@/services/papers.service";
import { getSelectableQuestions } from "@/services/questions.service";
import { PaperEditor } from "@/components/papers/paper-editor";
import { PageHeader } from "@/components/ui/shell";

export const metadata = { title: "Edit paper" };

export default async function EditPaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireSession(`/papers/${id}/edit`);

  const paper = await getPaperWithSets(supabase, id);
  if (!paper) notFound();

  let pool: Awaited<ReturnType<typeof getSelectableQuestions>> = [];
  if (paper.subject_id) {
    const { data: topics, error } = await supabase
      .from("topics")
      .select("id")
      .eq("subject_id", paper.subject_id);

    if (error) throw new Error(`Could not load the subject's chapters: ${error.message}`);

    const topicIds = ((topics ?? []) as Array<{ id: string }>).map((topic) => topic.id);
    pool = await getSelectableQuestions(supabase, topicIds);
  }

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/papers/${paper.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to paper
        </Link>
      </div>

      <PageHeader
        title="Edit paper"
        description={`${paper.title} · ${paper.class_name}${
          paper.subject ? ` · ${paper.subject.subject_name}` : ""
        }`}
      />

      <PaperEditor paper={paper} pool={pool} />
    </>
  );
}
