"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  Settings,
  Users,
} from "lucide-react";
import { NAV_ITEMS, type NavIcon } from "@/lib/navigation";
import { hasRole } from "@/lib/rbac";
import { ROLE_META } from "@/lib/constants";
import { cn, initials } from "@/lib/utils";
import type { UserRole } from "@/types/database";

const ICONS: Record<NavIcon, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  questions: LibraryBig,
  papers: FileText,
  subjects: BookOpen,
  settings: Settings,
  users: Users,
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  role,
  name,
  email,
}: {
  role: UserRole;
  name: string | null;
  email: string;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => hasRole(role, item.minRole));
  const roleMeta = ROLE_META[role];

  const links = (
    <>
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:flex md:flex-col">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <GraduationCap className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight text-slate-900">
              PaperForge
            </span>
            <span className="block text-[11px] text-slate-500">Exam paper studio</span>
          </span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1 px-3 pb-4">{links}</nav>

        <div className="border-t border-slate-100 px-4 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
              {initials(name, "U")}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-slate-800">{name ?? email}</p>
              <p className="truncate text-[11px] text-slate-500">{roleMeta.label}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="border-b border-slate-200 bg-white md:hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <GraduationCap className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-sm font-semibold text-slate-900">PaperForge</span>
          <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
            {roleMeta.label}
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100",
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
