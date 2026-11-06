import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/guards";
import { getInstitution } from "@/services/institution.service";
import { getPaperWithSets } from "@/services/papers.service";
import { AnswerKeyDocument, PaperDocument } from "@/components/print/paper-document";
import { PrintToolbar } from "@/components/print/print-toolbar";

export const metadata = { title: "Print paper" };

// Auth-gated and per-paper: never prerender.
export const dynamic = "force-dynamic";

export default async function PrintPaperPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ set?: string; key?: string }>;
}) {
  const { id } = await params;
  const { set: requestedSet, key: requestedKey } = await searchParams;
  const { supabase } = await requireSession(`/papers/${id}/print`);

  const paper = await getPaperWithSets(supabase, id);
  if (!paper || paper.sets.length === 0) notFound();

  const institution = await getInstitution(supabase, paper.institution_id);
  const includeAnswerKey = requestedKey !== "0";

  const activeSet =
    paper.sets.find((set) => set.set_label === requestedSet) ?? paper.sets[0];

  return (
    <div className="min-h-screen bg-slate-100 pb-10 print:bg-white print:pb-0">
      <PrintToolbar
        paperId={paper.id}
        sets={paper.sets.map((set) => set.set_label)}
        activeSet={activeSet.set_label}
        title={paper.title}
        includeAnswerKey={includeAnswerKey}
      />

      <div className="mx-auto mt-4 max-w-5xl space-y-6 px-2 sm:mt-6 sm:px-4 print:mt-0 print:max-w-none print:space-y-0 print:px-0">
        <PaperDocument paper={paper} set={activeSet} institution={institution} />
        {includeAnswerKey ? (
          <AnswerKeyDocument paper={paper} set={activeSet} institution={institution} />
        ) : null}
      </div>
    </div>
  );
}
