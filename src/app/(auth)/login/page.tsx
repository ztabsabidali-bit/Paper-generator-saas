import Link from "next/link";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/auth/session";
import { Alert } from "@/components/ui/shell";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

// Reads the runtime environment to decide whether Supabase is configured, so it
// must not be baked into a static page at build time.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-slate-900 px-12 py-10 text-white lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold">PaperForge</span>
        </Link>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Exam papers that look like they took a week.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Build curriculum-aligned papers from a shared question bank, generate
            Set A and Set B in one click, and print with a ready answer key.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              Role-based access enforced in Postgres, not just the UI.
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              LaTeX math and right-to-left Urdu in the same paper.
            </li>
            <li className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
              Print-ready A4 layouts with an automatic answer key.
            </li>
          </ul>
        </div>

        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} PaperForge. Built for schools.
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
                <GraduationCap className="h-5 w-5" aria-hidden />
              </span>
              <span className="text-sm font-semibold text-slate-900">PaperForge</span>
            </Link>
          </div>

          <h2 className="text-xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">
            Use the account issued by your institution administrator.
          </p>

          <div className="mt-6">
            {!configured ? (
              <Alert tone="warning" title="Supabase is not configured">
                Add <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
                <code className="font-mono">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
                <code className="font-mono">.env.local</code>, then restart the dev server.
                Migrations live in <code className="font-mono">supabase/migrations</code>.
              </Alert>
            ) : null}

            {error === "auth" ? (
              <Alert tone="danger" className="mb-4">
                That sign-in link is invalid or has expired.
              </Alert>
            ) : null}

            <div className="mt-4">
              <LoginForm next={next} disabled={!configured} />
            </div>
          </div>

          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            No self-registration: accounts are created by a super admin. Lost access?
            Contact your institution administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
