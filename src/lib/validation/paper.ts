import { z } from "zod";
import { difficultySchema, questionTypeSchema } from "./question";

export const blueprintRowSchema = z
  .object({
    type: questionTypeSchema,
    enabled: z.boolean(),
    count: z.number().int().min(0).max(100),
    marks: z.number().positive().max(50),
    difficulty: z.enum(["mixed", "easy", "medium", "hard"]),
  })
  .superRefine((row, ctx) => {
    if (row.enabled && row.count < 1) {
      ctx.addIssue({
        code: "custom",
        path: ["count"],
        message: "Add at least one question",
      });
    }
  });

export type BlueprintRow = z.infer<typeof blueprintRowSchema>;

export const paperPrintOptionsSchema = z.object({
  title: z.boolean(),
  session: z.boolean(),
  duration: z.boolean(),
  set_label: z.boolean(),
  instructions: z.boolean(),
});

export type PaperPrintOptionsInput = z.infer<typeof paperPrintOptionsSchema>;

export const generatePaperSchema = z.object({
  title: z.string().trim().min(3, "Give the paper a title").max(200),
  class_name: z.string().trim().min(1, "Select a class"),
  subject_id: z.uuid("Select a subject"),
  topic_ids: z.array(z.uuid()).min(1, "Select at least one chapter or topic"),
  blueprint: z
    .array(blueprintRowSchema)
    .min(1)
    .refine((rows) => rows.some((row) => row.enabled && row.count > 0), {
      message: "Enable at least one section",
    }),
  set_count: z.number().int().min(1).max(4),
  shuffle_options: z.boolean(),
  duration_minutes: z.number().int().min(15).max(300),
  instructions: z.string().trim().max(2000).nullable().optional(),
  exam_session: z.string().trim().max(50).nullable().optional(),
  print_options: paperPrintOptionsSchema.optional(),
  seed: z.number().int().nonnegative().optional(),
});

export type GeneratePaperInput = z.infer<typeof generatePaperSchema>;

export const selectableQuestionFilterSchema = z.object({
  subject_id: z.uuid("Select a subject"),
  chapter: z.string().trim().max(200).optional(),
  topic: z.string().trim().max(200).optional(),
  subtopic: z.string().trim().max(200).optional(),
  type: questionTypeSchema.optional(),
  difficulty: difficultySchema.optional(),
  search: z.string().trim().max(200).optional(),
});

export type SelectableQuestionFilter = z.infer<typeof selectableQuestionFilterSchema>;

export const manualSelectionSchema = z.object({
  title: z.string().trim().min(3, "Give the paper a title").max(200),
  class_name: z.string().trim().min(1, "Select a class"),
  subject_id: z.uuid("Select a subject"),
  question_ids: z.array(z.uuid()).min(1, "Select at least one question").max(300),
  /** Questions currently visible in the picker, used for variant swaps. */
  pool_ids: z.array(z.uuid()).max(300).optional(),
  set_count: z.number().int().min(1).max(4),
  shuffle_options: z.boolean(),
  duration_minutes: z.number().int().min(15).max(300),
  instructions: z.string().trim().max(2000).nullable().optional(),
  exam_session: z.string().trim().max(50).nullable().optional(),
  print_options: paperPrintOptionsSchema.optional(),
  seed: z.number().int().nonnegative().optional(),
});

export type ManualSelectionInput = z.infer<typeof manualSelectionSchema>;

export const paperEditItemSchema = z.object({
  question_id: z.uuid(),
  section: z.string().trim().max(120).nullable().optional(),
  marks_override: z.number().positive().max(100).nullable().optional(),
  option_order: z.array(z.string().trim().min(1).max(4)).max(8).nullable().optional(),
});

export const paperEditSetSchema = z.object({
  id: z.uuid(),
  items: z.array(paperEditItemSchema).max(300),
});

export const updatePaperSchema = z.object({
  paper_id: z.uuid(),
  title: z.string().trim().min(3, "Give the paper a title").max(200),
  duration_minutes: z.number().int().min(15).max(300),
  instructions: z.string().trim().max(2000).nullable().optional(),
  exam_session: z.string().trim().max(50).nullable().optional(),
  print_options: paperPrintOptionsSchema,
  sets: z.array(paperEditSetSchema).min(1).max(4),
});

export type UpdatePaperInput = z.infer<typeof updatePaperSchema>;

export const blueprintInputSchema = z.object({
  name: z.string().trim().min(1, "Give the blueprint a name").max(80),
  subject_id: z.uuid("Select a subject"),
  topic_ids: z.array(z.uuid()).min(1, "Select at least one chapter").max(300),
  blueprint: z
    .array(blueprintRowSchema)
    .min(1)
    .refine((rows) => rows.some((row) => row.enabled && row.count > 0), {
      message: "Enable at least one section",
    }),
  set_count: z.number().int().min(1).max(4),
  shuffle_options: z.boolean(),
  duration_minutes: z.number().int().min(15).max(300),
});

export type BlueprintInput = z.infer<typeof blueprintInputSchema>;

export const createBlueprintSchema = blueprintInputSchema;

export const updateBlueprintSchema = blueprintInputSchema.extend({
  id: z.uuid(),
});

export type UpdateBlueprintInput = z.infer<typeof updateBlueprintSchema>;


export const poolCountRequestSchema = z.object({
  topic_ids: z.array(z.uuid()).min(1),
});

export const poolCountsSchema = z.object({
  byType: z.record(questionTypeSchema, z.record(difficultySchema, z.number())),
  total: z.number(),
});

export type PoolCounts = z.infer<typeof poolCountsSchema>;
