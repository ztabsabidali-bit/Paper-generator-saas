import type { SupabaseServerClient } from "@/lib/auth/session";
import type { GeneratedSet } from "@/lib/papers/generator";
import type {
  Paper,
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
