import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  GraduationCap,
  Languages,
  Printer,
  Shuffle,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/button";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Curriculum-mapped bank",
    body: "Class → subject → chapter → topic. Tag every question by type, difficulty, marks and medium.",
  },
  {
    icon: Languages,
    title: "LaTeX + Urdu, together",
    body: "Math renders with KaTeX. Urdu questions get proper Nastaliq shaping and right-to-left alignment.",
  },
  {
    icon: Shuffle,
    title: "Multi-set variants",
    body: "Generate Set A and Set B from the same blueprint with disjoint questions and shuffled options.",
  },
  {
    icon: Printer,
    title: "Print-ready output",
    body: "A4 layouts with your institution header, marks gutter, and an answer key on its own page.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold tracking-tight text-slate-900">
            PaperForge
          </span>
        </div>
        <Link href="/login" className={buttonClasses("primary", "sm")}>
          Sign in
        </Link>
      </header>

      <main>
        <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-14 sm:pt-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-inset ring-brand-600/20">
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Built for schools that still print
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
              Generate exam papers in minutes,
              <span className="text-brand-600"> not evenings.</span>
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600">
              A minimalist paper generator for schools: shared question bank, role-based
              staff access, multi-set variants to stop copying, and a print layout with an
              automatic answer key.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/login" className={buttonClasses("primary", "lg")}>
                Sign in to your desk
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <span className="text-xs text-slate-500">
                Accounts are issued by your institution administrator.
              </span>
            </div>
          </div>

          <dl className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <feature.icon className="h-5 w-5 text-brand-600" aria-hidden />
                <dt className="mt-3 text-sm font-semibold text-slate-900">{feature.title}</dt>
                <dd className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
                  {feature.body}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-y border-slate-100 bg-slate-50/70">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-6 py-14 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                One blueprint. Every variant.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Set the number of MCQs, short and long questions with their marks. The
                generator draws from your chapters, keeps sets disjoint while the bank
                allows it, and records the seed so a paper can be reproduced exactly.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                {[
                  "Deterministic generation from a stored seed",
                  "Shortfall warnings instead of silent padding",
                  "Per-set option shuffling with a matching answer key",
                  "Role-aware access: teachers, admins and super admins",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Section A — Multiple choice
                </p>
                <span className="text-xs text-slate-500">5 × 1</span>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="font-medium text-slate-400">1.</span>
                  <span>
                    A body starts from rest and accelerates at{" "}
                    <span className="font-mono text-[13px]">2 m/s²</span>. What distance
                    does it cover in 5 s?
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-medium text-slate-400">2.</span>
                  <span dir="rtl" className="text-urdu">
                    حرکت کی دوسری مساوات تحریر کریں۔
                  </span>
                </li>
              </ol>
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs text-slate-600">
                {["A. 10 m", "B. 20 m", "C. 25 m", "D. 50 m"].map((option) => (
                  <span key={option} className="rounded-md bg-slate-50 px-2.5 py-1.5">
                    {option}
                  </span>
                ))}
              </div>
              <p className="mt-5 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                Set A · 60 marks · 2 hours · Answer key attached
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-slate-500">
        <p>© {new Date().getFullYear()} PaperForge</p>
        <p>Next.js · Supabase · Cloudflare Workers</p>
      </footer>
    </div>
  );
}
