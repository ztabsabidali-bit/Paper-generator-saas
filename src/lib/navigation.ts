import type { UserRole } from "@/types/database";

export type NavIcon =
  | "dashboard"
  | "questions"
  | "papers"
  | "subjects"
  | "settings"
  | "users";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIcon;
  minRole: UserRole;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
    minRole: "teacher",
    description: "Overview and quick actions",
  },
  {
    label: "Question bank",
    href: "/questions",
    icon: "questions",
    minRole: "teacher",
    description: "Create and curate questions",
  },
  {
    label: "Papers",
    href: "/papers",
    icon: "papers",
    minRole: "teacher",
    description: "Generated exam papers",
  },
  {
    label: "Subjects",
    href: "/subjects",
    icon: "subjects",
    minRole: "admin",
    description: "Classes, subjects and chapters",
  },
  {
    label: "Institution",
    href: "/settings",
    icon: "settings",
    minRole: "admin",
    description: "Print header and branding",
  },
  {
    label: "Staff",
    href: "/users",
    icon: "users",
    minRole: "super_admin",
    description: "Accounts and roles",
  },
];
