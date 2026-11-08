import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  LibraryBig,
  Plus,
  Upload,
} from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { canEditQuestion, canManageBank } from "@/lib/rbac";
import {
  questionFilterSchema,
  type QuestionFilters as QuestionFilterValues,
} from "@/lib/validation/question";
import { getCatalog } from "@/services/catalog.service";
import {
  getQuestionUsageCounts,
  listQuestionsPage,
} from "@/services/questions.service";
import { ArchiveQuestionButton } from "@/components/questions/archive-question-button";
import { DeleteQuestionButton } from "@/components/questions/delete-question-button";
import { MathText } from "@/components/questions/math-text";
import { QuestionBulkBar } from "@/components/questions/question-bulk-bar";
import { QuestionFilters } from "@/components/questions/question-filters";
import {
  QuestionSelectAllCheckbox,
  QuestionSelectCheckbox,
  QuestionSelectionProvider,
} from "@/components/questions/question-selection";
import { RestoreQuestionButton } from "@/components/questions/restore-question-button";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/shell";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { DIFFICULTY_META, QUESTION_TYPE_META } from "@/lib/constants";
import { cn, pluralize } from "@/lib/utils";

export const metadata = { title: "Question bank" };

const PAGE_SIZE = 50;

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(params: SearchParams, key: string) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function buildQuestionsHref(params: SearchParams, page: number) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page") continue;
    const single = Array.isArray(value) ? value[0] : value;
    if (single) next.set(key, single);
  }
  if (page > 1) next.set("page", String(page));
  const query = next.toString();
  return query ? `/questions?${query}` : "/questions";
}

export default async function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { supabase, profile } = await requireSession("/questions");

  const parsed = questionFilterSchema.safeParse({
    class: readParam(params, "class") || undefined,
    subject: readParam(params, "subject") || undefined,
    chapter: readParam(params, "chapter") || undefined,
    topic: readParam(params, "topic") || undefined,
    subtopic: readParam(params, "subtopic") || undefined,
    type: readParam(params, "type") || undefined,
    difficulty: readParam(params, "difficulty") || undefined,
    medium: readParam(params, "medium") || undefined,
    status: readParam(params, "status") || undefined,
    q: readParam(params, "q") || undefined,
  });
  const filters: QuestionFilterValues = parsed.success ? parsed.data : {};
  const requestedPage = Math.max(Number(readParam(params, "page")) || 1, 1);

  const catalog = await getCatalog(supabase);

  const topicRows = catalog.flatMap((subject) =>
    subject.topics.map((topic) => ({ subject, topic })),
  );

  let topicIds: string[] | undefined;
  if (
    filters.class ||
    filters.subject ||
    filters.chapter ||
    filters.topic ||
    filters.subtopic
  ) {
    topicIds = topicRows
      .filter(
        ({ subject, topic }) =>
          (!filters.class || subject.class_name === filters.class) &&
          (!filters.subject || subject.id === filters.subject) &&
          (!filters.chapter || topic.chapter_title === filters.chapter) &&
          (!filters.topic || topic.topic_title === filters.topic) &&
          (!filters.subtopic || topic.subtopic_title === filters.subtopic),
      )
      .map(({ topic }) => topic.id);
  }

  const pageData = await listQuestionsPage(supabase, {
    topicIds,
    type: filters.type,
    difficulty: filters.difficulty,
    medium: filters.medium,
    status: filters.status,
    search: filters.q,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(pageData.total / pageData.pageSize));
  if (requestedPage > totalPages) {
    redirect(buildQuestionsHref(params, totalPages));
  }

  const questions = pageData.questions;
  const usage = await getQuestionUsageCounts(
    supabase,
    questions.map((question) => question.id),
  );
  const firstShown = pageData.total === 0 ? 0 : (pageData.page - 1) * pageData.pageSize + 1;
  const lastShown = Math.min(pageData.page * pageData.pageSize, pageData.total);

  const filterCatalog = catalog.map((subject) => ({
    id: subject.id,
    className: subject.class_name,
    subjectName: subject.subject_name,
    topics: subject.topics.map((topic) => ({
      chapter: topic.chapter_title,
      topic: topic.topic_title,
      subtopic: topic.subtopic_title,
    })),
  }));

  return (
    <>
      <PageHeader
        title="Question bank"
        description={`${pageData.total} ${pluralize(pageData.total, "question")} matching your filters. LaTeX and Urdu are supported.`}
        actions={
          <>
            {canManageBank(profile.role) ? (
              <Link href="/subjects" className={buttonClasses("outline", "md")}>
                Manage subjects
              </Link>
            ) : null}
            <Link href="/questions/import" className={buttonClasses("outline", "md")}>
              <Upload className="h-4 w-4" aria-hidden />
              Import CSV
            </Link>
            <Link href="/questions/new" className={buttonClasses("primary", "md")}>
              <Plus className="h-4 w-4" aria-hidden />
              New question
            </Link>
          </>
        }
      />

      <QuestionFilters catalog={filterCatalog} />

      <QuestionSelectionProvider ids={questions.map((question) => question.id)}>
        <QuestionBulkBar />

        <Card className="overflow-hidden">
          {questions.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={<LibraryBig className="h-5 w-5" aria-hidden />}
                title="No questions match these filters"
                description={
                  topicIds?.length === 0
                    ? "The selected chapter has no topics yet. Ask an admin to add one."
                    : "Adjust the filters, or add the first question for this chapter."
                }
                action={
                  <Link href="/questions/new" className={buttonClasses("primary", "sm")}>
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                    Add a question
                  </Link>
                }
              />
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH className="w-10">
                    <QuestionSelectAllCheckbox />
                  </TH>
                  <TH className="w-[42%]">Question</TH>
                  <TH className="hidden sm:table-cell">Type</TH>
                  <TH className="hidden sm:table-cell">Marks</TH>
                  <TH className="hidden lg:table-cell">Placement</TH>
                  <TH className="hidden xl:table-cell">Usage</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {questions.map((question) => {
                  const meta = QUESTION_TYPE_META[question.question_type];
                  const difficulty = DIFFICULTY_META[question.difficulty];
                  const usedIn = usage[question.id] ?? 0;
                  return (
                    <TR key={question.id} className={question.is_active ? "" : "opacity-60"}>
                      <TD>
                        <QuestionSelectCheckbox id={question.id} />
                      </TD>
                      <TD>
                        <div className="max-h-40 overflow-hidden">
                          <MathText
                            content={question.question_text}
                            direction={question.text_direction}
                            compact
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <Badge className={difficulty.className}>{difficulty.label}</Badge>
                          {question.medium !== "english" ? (
                            <Badge tone="brand">
                              {question.medium === "urdu" ? "Urdu" : "Bilingual"}
                            </Badge>
                          ) : null}
                          {!question.is_active ? <Badge tone="danger">Archived</Badge> : null}
                          {question.created_by === profile.id ? (
                            <Badge tone="neutral">Mine</Badge>
                          ) : null}
                          <Badge tone={usedIn > 0 ? "warning" : "neutral"}>
                            {usedIn > 0
                              ? `Used in ${usedIn} ${pluralize(usedIn, "paper")}`
                              : "Not used yet"}
                          </Badge>
                        </div>
                        <p className="mt-1.5 text-[11px] text-slate-500 lg:hidden">
                          {meta.short} · {question.marks}{" "}
                          {pluralize(question.marks, "mark")}
                          {question.topic
                            ? ` · ${question.topic.chapter_title} · ${question.topic.subject?.class_name ?? ""} ${question.topic.subject?.subject_name ?? ""}`
                            : ""}
                        </p>
                      </TD>
                      <TD className="hidden sm:table-cell">
                        <span className="text-xs font-medium text-slate-700">{meta.short}</span>
                      </TD>
                      <TD className="hidden sm:table-cell">
                        <span className="text-xs text-slate-700">{question.marks}</span>
                      </TD>
                      <TD className="hidden text-xs text-slate-500 lg:table-cell">
                        {question.topic ? (
                          <div className="space-y-0.5">
                            <p className="font-medium text-slate-700">
                              {question.topic.chapter_title}
                            </p>
                            <p>
                              {question.topic.subject?.class_name} ·{" "}
                              {question.topic.subject?.subject_name}
                            </p>
                          </div>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD className="hidden text-xs text-slate-600 xl:table-cell">
                        {usedIn > 0
                          ? `${usedIn} ${pluralize(usedIn, "paper")}`
                          : "Unused"}
                      </TD>
                      <TD>
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <Link
                            href={`/questions/${question.id}/edit`}
                            className={buttonClasses("ghost", "sm")}
                          >
                            Edit
                          </Link>
                          {question.is_active ? (
                            <ArchiveQuestionButton id={question.id} />
                          ) : (
                            <RestoreQuestionButton id={question.id} />
                          )}
                          {canEditQuestion(
                            profile.role,
                            profile.id,
                            question.created_by,
                          ) ? (
                            <DeleteQuestionButton id={question.id} />
                          ) : null}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </Card>
      </QuestionSelectionProvider>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[11px] text-slate-500">
          {pageData.total > 0
            ? `Showing ${firstShown}–${lastShown} of ${pageData.total}. `
            : ""}
          Archived questions remain in papers that already use them. Deleting is permanent;
          questions used in a paper must be archived instead.
        </p>

        {totalPages > 1 ? (
          <nav className="flex items-center gap-1.5" aria-label="Question bank pages">
            {requestedPage > 1 ? (
              <Link
                href={buildQuestionsHref(params, requestedPage - 1)}
                className={buttonClasses("outline", "sm")}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Previous
              </Link>
            ) : (
              <span
                className={cn(buttonClasses("outline", "sm"), "pointer-events-none opacity-40")}
                aria-disabled
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                Previous
              </span>
            )}

            <span className="px-2 text-xs text-slate-600">
              Page {requestedPage} of {totalPages}
            </span>

            {requestedPage < totalPages ? (
              <Link
                href={buildQuestionsHref(params, requestedPage + 1)}
                className={buttonClasses("outline", "sm")}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            ) : (
              <span
                className={cn(buttonClasses("outline", "sm"), "pointer-events-none opacity-40")}
                aria-disabled
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            )}
          </nav>
        ) : null}
      </div>
    </>
  );
}
