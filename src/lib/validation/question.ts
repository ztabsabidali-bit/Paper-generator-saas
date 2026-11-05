import { z } from "zod";

export const questionTypeSchema = z.enum(["mcq", "short", "long"]);
export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const mediumSchema = z.enum(["english", "urdu", "bilingual"]);
export const directionSchema = z.enum(["ltr", "rtl"]);

export const optionSchema = z.object({
  key: z.string().trim().min(1).max(4),
  text: z.string().trim().min(1, "Option text is required").max(1000),
});

export const questionInputSchema = z
  .object({
    id: z.uuid().optional(),
    topic_id: z.uuid("Select a chapter and topic"),
    question_type: questionTypeSchema,
    question_text: z
      .string()
      .trim()
      .min(3, "Question text is too short")
      .max(10000),
    options: z.array(optionSchema).max(8).nullable().optional(),
    correct_answer: z.string().trim().max(5000).nullable().optional(),
    medium: mediumSchema,
    difficulty: difficultySchema,
    marks: z.number().positive("Marks must be greater than zero").max(100),
    text_direction: directionSchema,
    explanation: z.string().trim().max(5000).nullable().optional(),
    is_active: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.question_type !== "mcq") return;

    if (!value.options || value.options.length < 2) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "An MCQ needs at least two options",
      });
      return;
    }

    const keys = new Set(value.options.map((option) => option.key));
    if (keys.size !== value.options.length) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: "Option labels must be unique",
      });
    }

    if (!value.correct_answer || !keys.has(value.correct_answer)) {
      ctx.addIssue({
        code: "custom",
        path: ["correct_answer"],
        message: "Select which option is correct",
      });
    }
  });

export type QuestionInput = z.infer<typeof questionInputSchema>;

export const questionFilterSchema = z.object({
  class: z.string().optional(),
  subject: z.string().optional(),
  chapter: z.string().optional(),
  topic: z.string().optional(),
  subtopic: z.string().optional(),
  type: questionTypeSchema.optional(),
  difficulty: difficultySchema.optional(),
  medium: mediumSchema.optional(),
  q: z.string().optional(),
});

export type QuestionFilters = z.infer<typeof questionFilterSchema>;
