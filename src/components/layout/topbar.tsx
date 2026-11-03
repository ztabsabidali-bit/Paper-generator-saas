"use client";

import { LogOut, Menu } from "lucide-react";
import { ROLE_META } from "@/lib/constants";
import { initials } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export function Topbar({
  name,
  email,
  role,
  onOpenMenu,
}: {
  name: string | null;
  email: string;
  role: UserRole;
  onOpenMenu: () => void;
}) {
  const roleMeta = ROLE_META[role];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white/85 px-3 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={onOpenMenu}
          className="-ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <span className="truncate text-xs font-medium text-slate-500 md:hidden">
          {roleMeta.label}
        </span>
        <div className="hidden truncate text-xs text-slate-500 md:block">
          Signed in as <span className="font-medium text-slate-700">{email}</span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
            {initials(name, "U")}
          </span>
          <span className="hidden max-w-[160px] truncate text-xs font-medium text-slate-700 sm:block">
            {name ?? email}
          </span>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
