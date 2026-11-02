import type { Difficulty, Medium, QuestionType, UserRole } from "@/types/database";

export const APP_NAME = "PaperForge";

export const CLASS_OPTIONS = [
  "Class 9",
  "Class 10",
  "Class 11",
  "Class 12",
] as const;

export const QUESTION_TYPE_META: Record<
  QuestionType,
  { label: string; short: string; defaultMarks: number; description: string }
> = {
  mcq: {
    label: "Multiple choice",
    short: "MCQ",
    defaultMarks: 1,
    description: "Four options, one correct answer.",
  },
  short: {
    label: "Short question",
    short: "Short",
    defaultMarks: 3,
    description: "Brief written answer, 2–4 lines.",
  },
  long: {
    label: "Long question",
    short: "Long",
    defaultMarks: 8,
    description: "Extended response with working or explanation.",
  },
};

export const DIFFICULTY_META: Record<
  Difficulty,
  { label: string; className: string }
> = {
  easy: {
    label: "Easy",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  },
  medium: {
    label: "Medium",
    className: "bg-amber-50 text-amber-700 ring-amber-600/20",
  },
  hard: {
    label: "Hard",
    className: "bg-rose-50 text-rose-700 ring-rose-600/20",
  },
};

export const MEDIUM_META: Record<Medium, { label: string; direction: "ltr" | "rtl" }> = {
  english: { label: "English", direction: "ltr" },
  urdu: { label: "Urdu", direction: "rtl" },
  bilingual: { label: "Bilingual", direction: "ltr" },
};

export const ROLE_META: Record<
  UserRole,
  { label: string; description: string; className: string }
> = {
  super_admin: {
    label: "Super admin",
    description: "Platform owner. Adds institutions and provisions their heads.",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-600/20",
  },
  admin: {
    label: "Admin",
    description: "Institution head. Manages staff, subjects, the bank and branding.",
    className: "bg-sky-50 text-sky-700 ring-sky-600/20",
  },
  teacher: {
    label: "Teacher",
    description: "Paper generator. Creates questions and papers for their institution.",
    className: "bg-slate-100 text-slate-700 ring-slate-600/20",
  },
};

export const SET_LABELS = ["A", "B", "C", "D"] as const;

export const DEFAULT_INSTRUCTIONS = [
  "Attempt all questions in the given sections.",
  "Write your roll number on every sheet.",
  "Marks are indicated against each question.",
].join("\n");

export const QUESTION_FILTER_KEYS = [
  "class",
  "subject",
  "chapter",
  "type",
  "difficulty",
  "medium",
  "q",
] as const;
