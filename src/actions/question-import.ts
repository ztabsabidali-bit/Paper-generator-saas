"use server";

import { revalidatePath } from "next/cache";
import {
  actionError,
  actionOk,
  describeError,
  type ActionResult,
} from "@/lib/action-result";
import { getSessionContext } from "@/lib/auth/session";
import { canManageBank } from "@/lib/rbac";
import {
  importEnvelopeSchema,
  normalizeLabel,
  normalizeQuestionText,
  parseImportRow,
  topicKey,
  type ParsedImportRow,
} from "@/lib/validation/question-import";
import {
  getQuestionTextsByTopic,
  getSubjectTopics,
  insertQuestionRows,
  type NewQuestionRow,
  type SubjectTopicRow,
} from "@/services/questions.service";

export interface ImportSummary {
  imported: number;
  duplicates: number;
  invalid: number;
  createdTopics: number;
  errors: Array<{ row: number; message: string }>;
}

interface ParsedRow {
  rowNumber: number;
  value: ParsedImportRow;
}

const BATCH_SIZE = 100;
/** Keep a bad import from flooding the response. */
const MAX_REPORTED_ERRORS = 60;

function friendlyInsertError(message: string) {
  if (message.includes("questions_mcq_options_check")) {
    return "MCQ rows need at least two options with text.";
  }
  if (message.includes("questions_marks_check")) {
    return "Marks must be greater than zero.";
  }
  return message;
}

/**
 * Imports a CSV batch for one subject. Rows are re-parsed on the server, topics
 * are resolved (or created by admins), duplicates are skipped, and inserts are
 * batched with a per-row fallback so one bad row cannot sink the batch.
 */
export async function importQuestionsAction(
  input: unknown,
): Promise<ActionResult<ImportSummary>> {
  const parsed = importEnvelopeSchema.safeParse(input);
  if (!parsed.success) {
    return actionError(
      parsed.error.issues[0]?.message ?? "The import file could not be read.",
    );
  }

  const context = await getSessionContext();
  if (!context) return actionError("Your session has expired. Sign in again.");

  const { supabase, profile } = context;
  const values = parsed.data;

  if (!profile.institution_id) {
    return actionError("Your account is not linked to an institution. Ask a super admin.");
  }

  if (values.create_missing_topics && !canManageBank(profile.role)) {
    return actionError(
      "Only admins can add missing chapters. Ask your institution admin, or correct the chapter names in the file.",
    );
  }

  try {
    const { data: subject, error: subjectError } = await supabase
      .from("subjects")
      .select("id, class_name, subject_name, institution_id")
      .eq("id", values.subject_id)
      .maybeSingle();

    if (subjectError || !subject) return actionError("That subject could not be found.");
    if (subject.institution_id !== profile.institution_id) {
      return actionError("That subject belongs to another institution.");
    }

    const errors: Array<{ row: number; message: string }> = [];
    let invalidCount = 0;
    const parsedRows: ParsedRow[] = [];

    values.rows.forEach((raw, index) => {
      const rowNumber = index + 2;
      const result = parseImportRow(raw);
      if (result.ok) {
        parsedRows.push({ rowNumber, value: result.value });
      } else {
        invalidCount += 1;
        if (errors.length < MAX_REPORTED_ERRORS) {
          errors.push({ row: rowNumber, message: result.errors.join(" ") });
        }
      }
    });

    const existingTopics = await getSubjectTopics(supabase, subject.id);
    const topicMap = new Map<string, string>();
    existingTopics.forEach((topic) => {
      topicMap.set(
        topicKey(topic.chapter_title, topic.topic_title, topic.subtopic_title),
        topic.id,
      );
    });

    // Collect placements the file references but the subject does not have yet.
    const missing = new Map<
      string,
      { chapter: string; topic: string | null; subtopic: string | null }
    >();
    for (const row of parsedRows) {
      const key = topicKey(row.value.chapter, row.value.topic, row.value.subtopic);
      if (topicMap.has(key)) continue;
      if (!missing.has(key)) {
        missing.set(key, {
          chapter: row.value.chapter,
          topic: row.value.topic,
          subtopic: row.value.subtopic,
        });
      }
    }

    let createdTopics = 0;

    if (missing.size > 0 && !values.create_missing_topics) {
      const unresolvedKeys = new Set(missing.keys());
      for (let index = parsedRows.length - 1; index >= 0; index -= 1) {
        const row = parsedRows[index];
        const key = topicKey(row.value.chapter, row.value.topic, row.value.subtopic);
        if (!unresolvedKeys.has(key)) continue;
        parsedRows.splice(index, 1);
        invalidCount += 1;
        if (errors.length < MAX_REPORTED_ERRORS) {
          errors.push({
            row: row.rowNumber,
            message: `Chapter/topic "${[row.value.chapter, row.value.topic, row.value.subtopic]
              .filter(Boolean)
              .join(" › ")}" is not in this subject. Add it under Subjects or start a new import with "create missing chapters".`,
          });
        }
      }
    }

    if (missing.size > 0 && values.create_missing_topics) {
      let nextChapterOrder =
        existingTopics.reduce(
          (max: number, topic: SubjectTopicRow) => Math.max(max, topic.chapter_order),
          0,
        ) + 1;
      const chapterOrders = new Map<string, number>();
      const payload = [...missing.values()].map((spec) => {
        const chapterKey = normalizeLabel(spec.chapter);
        if (!chapterOrders.has(chapterKey)) {
          chapterOrders.set(chapterKey, nextChapterOrder);
          nextChapterOrder += 1;
        }
        return {
          subject_id: subject.id,
          chapter_title: spec.chapter,
          topic_title: spec.topic,
          subtopic_title: spec.subtopic,
          chapter_order: chapterOrders.get(chapterKey) as number,
        };
      });

      const { data: created, error: createError } = await supabase
        .from("topics")
        .insert(payload)
        .select("id, chapter_title, topic_title, subtopic_title");

      if (createError) {
        return actionError(`Could not add the missing chapters: ${createError.message}`);
      }

      (created ?? []).forEach((topic: {
        id: string;
        chapter_title: string;
        topic_title: string | null;
        subtopic_title: string | null;
      }) => {
        topicMap.set(
          topicKey(topic.chapter_title, topic.topic_title, topic.subtopic_title),
          topic.id,
        );
      });
      createdTopics = created?.length ?? 0;
    }

    // Every remaining row must now resolve to a topic.
    const resolved: Array<ParsedRow & { topicId: string }> = [];
    for (const row of parsedRows) {
      const topicId = topicMap.get(
        topicKey(row.value.chapter, row.value.topic, row.value.subtopic),
      );
      if (!topicId) {
        invalidCount += 1;
        if (errors.length < MAX_REPORTED_ERRORS) {
          errors.push({
            row: row.rowNumber,
            message: "That chapter/topic could not be resolved after the import started.",
          });
        }
        continue;
      }
      resolved.push({ ...row, topicId });
    }

    const subjectTopicIds = [...new Set(topicMap.values())];
    const existingTexts = await getQuestionTextsByTopic(supabase, subjectTopicIds);
    const seen = new Set(existingTexts.map(normalizeQuestionText));

    let duplicates = 0;
    const toInsert: Array<ParsedRow & { topicId: string; payload: NewQuestionRow }> = [];

    for (const row of resolved) {
      const normalized = normalizeQuestionText(row.value.question_text);
      if (seen.has(normalized)) {
        duplicates += 1;
        continue;
      }
      seen.add(normalized);
      toInsert.push({
        ...row,
        payload: {
          topic_id: row.topicId,
          question_type: row.value.question_type,
          question_text: row.value.question_text,
          options: row.value.options,
          correct_answer: row.value.correct_answer,
          medium: row.value.medium,
          difficulty: row.value.difficulty,
          marks: row.value.marks,
          text_direction: row.value.text_direction,
          explanation: row.value.explanation,
          created_by: profile.id,
          institution_id: profile.institution_id,
        },
      });
    }

    let imported = 0;

    for (let start = 0; start < toInsert.length; start += BATCH_SIZE) {
      const batch = toInsert.slice(start, start + BATCH_SIZE);
      const bulk = await insertQuestionRows(
        supabase,
        batch.map((row) => row.payload),
      );

      if (!bulk.error) {
        imported += bulk.inserted;
        continue;
      }

      // Isolate the bad row(s) so the rest of the batch still lands.
      for (const row of batch) {
        const single = await insertQuestionRows(supabase, [row.payload]);
        if (single.error) {
          if (errors.length < MAX_REPORTED_ERRORS) {
            errors.push({ row: row.rowNumber, message: friendlyInsertError(single.error) });
          }
          continue;
        }
        imported += single.inserted;
      }
    }

    revalidatePath("/questions");
    revalidatePath("/dashboard");
    if (createdTopics > 0) revalidatePath("/subjects");

    return actionOk({
      imported,
      duplicates,
      invalid: invalidCount,
      createdTopics,
      errors,
    });
  } catch (error) {
    return actionError(describeError(error));
  }
}
