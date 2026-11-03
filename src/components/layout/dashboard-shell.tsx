"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import type { UserRole } from "@/types/database";

export function DashboardShell({
  role,
  name,
  email,
  institutionName,
  children,
}: {
  role: UserRole;
  name: string | null;
  email: string;
  institutionName?: string | null;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Any navigation closes the drawer, including browser back/forward.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen md:flex">
      <Sidebar
        role={role}
        name={name}
        email={email}
        institutionName={institutionName}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar
          name={name}
          email={email}
          role={role}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <main className="mx-auto w-full min-w-0 max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
