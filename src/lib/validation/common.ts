import { z } from "zod";

export const subjectInputSchema = z.object({
  class_name: z.string().trim().min(1, "Class is required").max(50),
  subject_name: z.string().trim().min(1, "Subject is required").max(100),
});

export const topicInputSchema = z.object({
  subject_id: z.uuid("Select a subject"),
  chapter_title: z.string().trim().min(1, "Chapter is required").max(200),
  topic_title: z.string().trim().max(200).optional(),
  subtopic_title: z.string().trim().max(200).optional(),
  chapter_order: z.number().int().min(0).max(999).optional(),
});

export const institutionInputSchema = z.object({
  name: z.string().trim().min(1, "Institution name is required").max(200),
  tagline: z.string().trim().max(200).optional(),
  address: z.string().trim().max(300).optional(),
  logo_url: z.union([z.url(), z.literal("")]).optional(),
  exam_session: z.string().trim().max(50).optional(),
  footer_note: z.string().trim().max(300).optional(),
});

export const userInputSchema = z.object({
  email: z.email("Enter a valid email address"),
  full_name: z.string().trim().min(2, "Full name is required").max(120),
  role: z.enum(["super_admin", "admin", "teacher"]),
  password: z
    .string()
    .min(8, "Use at least 8 characters")
    .max(72, "Supabase passwords are limited to 72 characters"),
  institution_id: z.uuid().nullish(),
});

export const roleUpdateSchema = z.object({
  id: z.uuid(),
  role: z.enum(["super_admin", "admin", "teacher"]),
});

export const userStatusSchema = z.object({
  id: z.uuid(),
  is_active: z.boolean(),
});
