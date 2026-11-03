"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  BookOpen,
  Building2,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  Settings,
  Users,
  X,
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
  institutions: Building2,
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Brand({ institutionName }: { institutionName?: string | null }) {
  return (
    <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5 px-5 py-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
        <GraduationCap className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-tight text-slate-900">
          PaperForge
        </span>
        <span className="block truncate text-[11px] text-slate-500">
          {institutionName ?? "Exam paper studio"}
        </span>
      </span>
    </Link>
  );
}

function AccountFooter({
  name,
  email,
  role,
}: {
  name: string | null;
  email: string;
  role: UserRole;
}) {
  return (
    <div className="border-t border-slate-100 px-4 py-4">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
          {initials(name, "U")}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-800">{name ?? email}</p>
          <p className="truncate text-[11px] text-slate-500">{ROLE_META[role].label}</p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  role,
  name,
  email,
  institutionName,
  open,
  onClose,
}: {
  role: UserRole;
  name: string | null;
  email: string;
  institutionName?: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => hasRole(role, item.minRole));
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the drawer when it opens so keyboard users land on it.
  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  const links = items.map((item) => {
    const Icon = ICONS[item.icon];
    const active = isActive(pathname, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onClose}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          active
            ? "bg-brand-50 text-brand-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  });

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <Brand institutionName={institutionName} />
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">{links}</nav>
        <AccountFooter name={name} email={email} role={role} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
        inert={!open}
      >
        <div
          className={cn(
            "absolute inset-0 bg-slate-900/40 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Main navigation"
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 ease-out",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-100 pr-2">
            <Brand institutionName={institutionName} />
            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              aria-label="Close navigation"
            >
              <X className="h-4.5 w-4.5" aria-hidden />
            </button>
          </div>
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain px-3 py-3">
            {links}
          </nav>
          <AccountFooter name={name} email={email} role={role} />
        </div>
      </div>
    </>
  );
}
