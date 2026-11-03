import Link from "next/link";
import { FilePlus2, FileText, Printer } from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { formatDate, pluralize } from "@/lib/utils";
import { listPapers } from "@/services/papers.service";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/shell";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

export const metadata = { title: "Papers" };

export default async function PapersPage() {
  const { supabase } = await requireSession("/papers");
  const papers = await listPapers(supabase);

  return (
    <>
      <PageHeader
        title="Papers"
        description="Every generated paper keeps its variants, seed and printable answer key."
        actions={
          <Link href="/papers/new" className={buttonClasses("primary", "md")}>
            <FilePlus2 className="h-4 w-4" aria-hidden />
            Generate paper
          </Link>
        }
      />

      <Card className="overflow-hidden">
        {papers.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<FileText className="h-5 w-5" aria-hidden />}
              title="No papers generated yet"
              description="Choose a class and chapters, set the blueprint, and generate Set A and Set B in one click."
              action={
                <Link href="/papers/new" className={buttonClasses("primary", "sm")}>
                  Generate your first paper
                </Link>
              }
            />
          </div>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="w-[42%]">Paper</TH>
                <TH className="hidden sm:table-cell">Class · Subject</TH>
                <TH className="hidden sm:table-cell">Sets</TH>
                <TH className="hidden lg:table-cell">Marks</TH>
                <TH className="hidden lg:table-cell">Created</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {papers.map((paper) => (
                <TR key={paper.id}>
                  <TD>
                    <Link
                      href={`/papers/${paper.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-brand-700"
                    >
                      {paper.title}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {paper.duration_minutes} minutes · {paper.exam_session ?? "No session"}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 sm:hidden">
                      {paper.class_name || "—"}
                      {paper.subject ? ` · ${paper.subject.subject_name}` : ""} ·{" "}
                      {paper.set_count} {pluralize(paper.set_count, "set")} ·{" "}
                      {paper.total_marks} marks · {formatDate(paper.created_at)}
                    </p>
                  </TD>
                  <TD className="hidden text-xs text-slate-600 sm:table-cell">
                    {paper.class_name || "—"}
                    {paper.subject ? ` · ${paper.subject.subject_name}` : ""}
                  </TD>
                  <TD className="hidden sm:table-cell">
                    <Badge tone="brand">{paper.set_count}</Badge>
                  </TD>
                  <TD className="hidden text-xs text-slate-700 lg:table-cell">
                    {paper.total_marks}
                  </TD>
                  <TD className="hidden text-xs text-slate-500 lg:table-cell">
                    {formatDate(paper.created_at)}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/papers/${paper.id}`}
                        className={buttonClasses("ghost", "sm")}
                      >
                        Open
                      </Link>
                      <Link
                        href={`/papers/${paper.id}/print`}
                        className={buttonClasses("outline", "sm")}
                      >
                        <Printer className="h-3.5 w-3.5" aria-hidden />
                        Print
                      </Link>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </>
  );
}
