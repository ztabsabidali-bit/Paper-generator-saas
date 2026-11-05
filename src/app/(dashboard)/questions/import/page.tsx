import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { canManageBank } from "@/lib/rbac";
import { getCatalog } from "@/services/catalog.service";
import { QuestionImport } from "@/components/questions/question-import";
import { Alert, PageHeader } from "@/components/ui/shell";

export const metadata = { title: "Import questions" };

export default async function ImportQuestionsPage() {
  const { supabase, profile } = await requireSession("/questions/import");

  if (!profile.institution_id) {
    return (
      <>
        <PageHeader
          title="Import questions"
          description="CSV imports land in a single institution's question bank."
        />
        <Alert tone="warning" title="No institution linked to this account">
          Developer accounts are not tied to a school, so they cannot import questions. Ask an
          institution admin to run the import, or link this account to a school from the Staff
          page.
        </Alert>
      </>
    );
  }

  const catalog = await getCatalog(supabase, profile.institution_id);

  return (
    <>
      <div className="mb-4">
        <Link
          href="/questions"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Question bank
        </Link>
      </div>

      <PageHeader
        title="Import questions from CSV"
        description="Upload a spreadsheet exported from Excel or Google Sheets. Preview every row before anything is saved."
      />

      <QuestionImport
        catalog={catalog}
        canManageTopics={canManageBank(profile.role)}
      />
    </>
  );
}
