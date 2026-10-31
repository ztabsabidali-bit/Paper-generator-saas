import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FilePlus2,
  FileText,
  GraduationCap,
  LibraryBig,
  Plus,
  Users,
} from "lucide-react";
import { requireSession } from "@/lib/auth/guards";
import { ROLE_META } from "@/lib/constants";
import { canManageBank, canManageUsers } from "@/lib/rbac";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, EmptyState, PageHeader, StatCard } from "@/components/ui/shell";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { supabase, profile } = await requireSession("/dashboard");

  const [questions, papers, subjects, recentPapers] = await Promise.all([
    supabase.from("questions").select("id", { count: "exact", head: true }),
    supabase.from("papers").select("id", { count: "exact", head: true }),
    supabase.from("subjects").select("id", { count: "exact", head: true }),
    supabase
      .from("papers")
      .select("id, title, class_name, total_marks, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const roleMeta = ROLE_META[profile.role];
  const firstName = profile.full_name?.split(" ")[0] ?? "there";

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={`${roleMeta.description} Your work is saved against ${profile.email}.`}
        actions={
          <>
            <Link href="/questions/new" className={buttonClasses("outline", "md")}>
              <Plus className="h-4 w-4" aria-hidden />
              New question
            </Link>
            <Link href="/papers/new" className={buttonClasses("primary", "md")}>
              <FilePlus2 className="h-4 w-4" aria-hidden />
              Generate paper
            </Link>
          </>
        }
      />

      {error === "forbidden" ? (
        <Alert tone="warning" className="mb-4">
          Your role does not have access to that page. Ask a super admin if you need it.
        </Alert>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{roleMeta.label}</Badge>
        <span className="text-xs text-slate-500">
          Role permissions are enforced by Supabase row level security.
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Questions"
          value={questions.count ?? 0}
          hint="Across the shared bank"
          icon={<LibraryBig className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Papers"
          value={papers.count ?? 0}
          hint="Generated and printable"
          icon={<FileText className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Subjects"
          value={subjects.count ?? 0}
          hint="Classes and subjects configured"
          icon={<BookOpen className="h-4 w-4" aria-hidden />}
        />
        <StatCard
          label="Access"
          value={roleMeta.label}
          hint="Change roles from the staff page"
          icon={<GraduationCap className="h-4 w-4" aria-hidden />}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Recent papers</CardTitle>
            <Link
              href="/papers"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {recentPapers.data && recentPapers.data.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {recentPapers.data.map((paper) => (
                  <li key={paper.id}>
                    <Link
                      href={`/papers/${paper.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {paper.title}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {paper.class_name || "Unassigned class"} ·{" "}
                          {formatDate(paper.created_at)}
                        </p>
                      </div>
                      <Badge tone="neutral">{paper.total_marks} marks</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-5">
                <EmptyState
                  icon={<FileText className="h-5 w-5" aria-hidden />}
                  title="No papers yet"
                  description="Pick a class, choose chapters and generate your first set."
                  action={
                    <Link href="/papers/new" className={buttonClasses("primary", "sm")}>
                      Generate a paper
                    </Link>
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <QuickLink href="/questions/new" icon={<LibraryBig className="h-4 w-4" />}>
              Add a question
            </QuickLink>
            <QuickLink href="/papers/new" icon={<FilePlus2 className="h-4 w-4" />}>
              Build a paper
            </QuickLink>
            {canManageBank(profile.role) ? (
              <QuickLink href="/subjects" icon={<BookOpen className="h-4 w-4" />}>
                Manage subjects
              </QuickLink>
            ) : null}
            {canManageUsers(profile.role) ? (
              <QuickLink href="/users" icon={<Users className="h-4 w-4" />}>
                Invite staff
              </QuickLink>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function QuickLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-800"
    >
      <span className="text-slate-400">{icon}</span>
      {children}
      <ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-400" aria-hidden />
    </Link>
  );
}
