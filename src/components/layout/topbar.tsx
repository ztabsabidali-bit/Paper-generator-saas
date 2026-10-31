import { LogOut } from "lucide-react";
import { ROLE_META } from "@/lib/constants";
import { initials } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export function Topbar({
  name,
  email,
  role,
}: {
  name: string | null;
  email: string;
  role: UserRole;
}) {
  const roleMeta = ROLE_META[role];

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-2 md:hidden">
        <span className="text-xs font-medium text-slate-500">
          {roleMeta.label}
        </span>
      </div>
      <div className="hidden text-xs text-slate-500 md:block">
        Signed in as <span className="font-medium text-slate-700">{email}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
            {initials(name, "U")}
          </span>
          <span className="hidden text-xs font-medium text-slate-700 sm:block">
            {name ?? email}
          </span>
        </div>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}
