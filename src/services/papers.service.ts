import type { SupabaseServerClient } from "@/lib/auth/session";
import { resolvePrintOptions } from "@/lib/papers/print-options";
import type { GeneratedSet } from "@/lib/papers/generator";
import type { Json } from "@/types/database";
import type {
  Paper,
  PaperPrintOptions,
  PaperQuestionRow,
  PaperSet,
  PaperWithSets,
  Question,
  Subject,
} from "@/types/domain";

export interface ListPaperRow extends Paper {
  subject: Subject | null;
  set_count: number;
}

export interface CreatePaperPayload {
  title: string;
  class_name: string;
  subject_id: string;
  institution_id: string;
  instructions: string | null;
  duration_minutes: number;
  exam_session: string | null;
  print_options: PaperPrintOptions;
  seed: number;
  total_marks: number;
  sets: GeneratedSet[];
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export async function listPapers(
  supabase: SupabaseServerClient,
): Promise<ListPaperRow[]> {
  const { data, error } = await supabase
    .from("papers")
    .select("*, subject:subjects(id, class_name, subject_name), sets:paper_sets(id)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Could not load papers: ${error.message}`);

  return ((data ?? []) as unknown as Array<
    Paper & { subject: Subject | Subject[] | null; sets: Array<{ id: string }> }
  >).map((row) => ({
    ...row,
    print_options: resolvePrintOptions(row.print_options),
    subject: first(row.subject),
    set_count: row.sets?.length ?? 0,
  }));
}

/**
 * Inserts the paper, its sets and their questions. Supabase does not expose
 * multi-statement transactions over PostgREST, so failures trigger a
 * compensating delete to avoid orphaned papers.
 */
export async function createPaper(
  supabase: SupabaseServerClient,
  payload: CreatePaperPayload,
): Promise<string> {
  const { data: paper, error } = await supabase
    .from("papers")
    .insert({
      title: payload.title,
      total_marks: payload.total_marks,
      class_name: payload.class_name,
      subject_id: payload.subject_id,
      institution_id: payload.institution_id,
      instructions: payload.instructions,
      duration_minutes: payload.duration_minutes,
      exam_session: payload.exam_session,
      print_options: payload.print_options as unknown as Json,
      seed: payload.seed,
      status: "final",
    })
    .select("id")
    .single();

  if (error || !paper) {
    throw new Error(`Could not create the paper: ${error?.message ?? "unknown error"}`);
  }

  const paperId = paper.id;

  try {
    for (const set of payload.sets) {
      const { data: setRow, error: setError } = await supabase
        .from("paper_sets")
        .insert({
          paper_id: paperId,
          set_label: set.label,
          seed: set.seed,
        })
        .select("id")
        .single();

      if (setError || !setRow) {
        throw new Error(`Could not create set ${set.label}: ${setError?.message}`);
      }

      if (set.items.length === 0) continue;

      const { error: itemsError } = await supabase.from("paper_questions").insert(
        set.items.map((item) => ({
          paper_set_id: setRow.id,
          question_id: item.questionId,
          display_order: item.order,
          section: item.section,
          marks_override: item.marks,
          option_order: item.optionOrder,
        })),
      );

      if (itemsError) {
        throw new Error(`Could not attach questions to set ${set.label}: ${itemsError.message}`);
      }
    }
  } catch (error) {
    await supabase.from("papers").delete().eq("id", paperId);
    throw error;
  }

  return paperId;
}

export async function getPaperWithSets(
  supabase: SupabaseServerClient,
  paperId: string,
): Promise<PaperWithSets | null> {
  const { data: paperRow, error: paperError } = await supabase
    .from("papers")
    .select("*, subject:subjects(id, class_name, subject_name)")
    .eq("id", paperId)
    .maybeSingle();

  if (paperError) throw new Error(`Could not load the paper: ${paperError.message}`);
  if (!paperRow) return null;

  const { data: setRows, error: setsError } = await supabase
    .from("paper_sets")
    .select("id, paper_id, set_label, seed, created_at")
    .eq("paper_id", paperId)
    .order("set_label");

  if (setsError) throw new Error(`Could not load the paper sets: ${setsError.message}`);

  const sets = (setRows ?? []) as PaperSet[];
  const setIds = sets.map((set) => set.id);

  let items: PaperQuestionRow[] = [];
  if (setIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabase
      .from("paper_questions")
      .select(
        "id, paper_set_id, question_id, display_order, section, marks_override, option_order, question:questions(*)",
      )
      .in("paper_set_id", setIds)
      .order("display_order");

    if (itemsError) throw new Error(`Could not load the paper questions: ${itemsError.message}`);

    items = ((itemRows ?? []) as unknown as Array<
      Omit<PaperQuestionRow, "question" | "option_order"> & {
        option_order: string[] | null;
        question: Question | Question[] | null;
      }
    >).map((row) => ({
      ...row,
      marks_override: row.marks_override === null ? null : Number(row.marks_override),
      question: first(row.question),
    }));
  }

  const paper = paperRow as unknown as Paper & { subject: Subject | Subject[] | null };

  return {
    ...paper,
    print_options: resolvePrintOptions(paper.print_options),
    subject: first(paper.subject),
    sets: sets.map((set) => ({
      ...set,
      items: items
        .filter((item) => item.paper_set_id === set.id)
        .sort((a, b) => a.display_order - b.display_order),
    })),
  };
}

export async function deletePaper(supabase: SupabaseServerClient, paperId: string) {
  const { error } = await supabase.from("papers").delete().eq("id", paperId);
  if (error) throw new Error(`Could not delete the paper: ${error.message}`);
}

export interface PaperContentSet {
  id: string;
  items: Array<{
    questionId: string;
    section: string | null;
    marksOverride: number | null;
    optionOrder: string[] | null;
  }>;
}

export interface UpdatePaperContentPayload {
  paperId: string;
  title: string;
  duration_minutes: number;
  exam_session: string | null;
  instructions: string | null;
  print_options: PaperPrintOptions;
  total_marks: number;
  sets: PaperContentSet[];
}

/**
 * Replaces each set's questions without leaving the set empty on failure:
 * new rows are staged at high display orders, old rows are removed only after
 * the insert succeeds, then the staged rows are renumbered.
 */
export async function updatePaperContent(
  supabase: SupabaseServerClient,
  payload: UpdatePaperContentPayload,
): Promise<void> {
  for (const set of payload.sets) {
    const { data: existingRows, error: existingError } = await supabase
      .from("paper_questions")
      .select("id")
      .eq("paper_set_id", set.id);

    if (existingError) {
      throw new Error(`Could not read set questions: ${existingError.message}`);
    }

    const oldIds = ((existingRows ?? []) as Array<{ id: string }>).map((row) => row.id);
    let stagedIds: string[] = [];

    if (set.items.length > 0) {
      const { data: staged, error: insertError } = await supabase
        .from("paper_questions")
        .insert(
          set.items.map((item, index) => ({
            paper_set_id: set.id,
            question_id: item.questionId,
            display_order: 1000 + index,
            section: item.section,
            marks_override: item.marksOverride,
            option_order: item.optionOrder,
          })),
        )
        .select("id");

      if (insertError || !staged) {
        throw new Error(`Could not save set questions: ${insertError?.message ?? "unknown error"}`);
      }

      stagedIds = (staged as Array<{ id: string }>).map((row) => row.id);
    }

    if (oldIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("paper_questions")
        .delete()
        .in("id", oldIds);
      if (deleteError) {
        throw new Error(`Could not replace set questions: ${deleteError.message}`);
      }
    }

    for (let index = 0; index < stagedIds.length; index += 1) {
      const { error: orderError } = await supabase
        .from("paper_questions")
        .update({ display_order: index + 1 })
        .eq("id", stagedIds[index]);
      if (orderError) {
        throw new Error(`Could not reorder set questions: ${orderError.message}`);
      }
    }
  }

  const { error } = await supabase
    .from("papers")
    .update({
      title: payload.title,
      duration_minutes: payload.duration_minutes,
      exam_session: payload.exam_session,
      instructions: payload.instructions,
      print_options: payload.print_options as unknown as Json,
      total_marks: payload.total_marks,
    })
    .eq("id", payload.paperId);

  if (error) throw new Error(`Could not update the paper: ${error.message}`);
}

export async function duplicatePaper(
  supabase: SupabaseServerClient,
  paperId: string,
  institutionId: string,
): Promise<string> {
  const paper = await getPaperWithSets(supabase, paperId);
  if (!paper) throw new Error("That paper no longer exists.");
  if (paper.institution_id !== institutionId) {
    throw new Error("That paper belongs to another institution.");
  }
  if (!paper.subject_id) throw new Error("This paper has no subject to copy.");

  const sets: GeneratedSet[] = paper.sets.map((set) => ({
    label: set.set_label,
    seed: set.seed,
    items: set.items.map((item) => ({
      questionId: item.question_id,
      section: item.section ?? "Questions",
      order: item.display_order,
      marks: item.marks_override ?? item.question?.marks ?? 0,
      optionOrder: item.option_order,
    })),
    totalMarks: set.items.reduce(
      (sum, item) => sum + (item.marks_override ?? item.question?.marks ?? 0),
      0,
    ),
  }));

  return createPaper(supabase, {
    title: `${paper.title} (copy)`,
    class_name: paper.class_name,
    subject_id: paper.subject_id,
    institution_id: paper.institution_id,
    instructions: paper.instructions,
    duration_minutes: paper.duration_minutes,
    exam_session: paper.exam_session,
    print_options: paper.print_options,
    seed: paper.seed,
    total_marks: paper.total_marks,
    sets,
  });
}
