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
  seed: z.number().int().nonnegative().optional(),
});

export type ManualSelectionInput = z.infer<typeof manualSelectionSchema>;

export const poolCountRequestSchema = z.object({
  topic_ids: z.array(z.uuid()).min(1),
});

export const poolCountsSchema = z.object({
  byType: z.record(questionTypeSchema, z.record(difficultySchema, z.number())),
  total: z.number(),
});

export type PoolCounts = z.infer<typeof poolCountsSchema>;
