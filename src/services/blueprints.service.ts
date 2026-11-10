import type { SupabaseServerClient } from "@/lib/auth/session";
import { DEFAULT_BLUEPRINT } from "@/lib/papers/blueprint";
import { blueprintRowSchema } from "@/lib/validation/paper";
import type { Json } from "@/types/database";
import type {
  PaperBlueprint,
  PaperBlueprintSection,
  Subject,
} from "@/types/domain";

const BLUEPRINT_COLUMNS = [
  "id",
  "institution_id",
  "created_by",
  "name",
  "subject_id",
  "topic_ids",
  "blueprint",
  "set_count",
  "shuffle_options",
  "duration_minutes",
  "created_at",
  "updated_at",
].join(", ");

const SUBJECT_SELECT = "id, class_name, subject_name";

interface RawBlueprint {
  id: string;
  institution_id: string;
  created_by: string | null;
  name: string;
  subject_id: string;
  topic_ids: string[] | null;
  blueprint: unknown;
  set_count: number;
  shuffle_options: boolean;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
  subject: Subject | Subject[] | null;
}

function first<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseSections(value: unknown): PaperBlueprintSection[] {
  const parsed = blueprintRowSchema.array().safeParse(value);
  if (!parsed.success || parsed.data.length === 0) {
    return DEFAULT_BLUEPRINT;
  }
  return parsed.data;
}

function normalizeBlueprint(row: RawBlueprint): PaperBlueprint {
  return {
    id: row.id,
    institution_id: row.institution_id,
    created_by: row.created_by,
    name: row.name,
    subject_id: row.subject_id,
    topic_ids: row.topic_ids ?? [],
    blueprint: parseSections(row.blueprint),
    set_count: row.set_count,
    shuffle_options: row.shuffle_options,
    duration_minutes: row.duration_minutes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    subject: first(row.subject),
  };
}

export interface BlueprintOwner {
  id: string;
  created_by: string | null;
  institution_id: string;
}

export interface BlueprintPayload {
  name: string;
  subjectId: string;
  topicIds: string[];
  blueprint: PaperBlueprintSection[];
  setCount: number;
  shuffleOptions: boolean;
  durationMinutes: number;
}

/** Blueprints for one institution, newest edits first. */
export async function listBlueprints(
  supabase: SupabaseServerClient,
  institutionId?: string | null,
): Promise<PaperBlueprint[]> {
  let query = supabase
    .from("paper_blueprints")
    .select(`${BLUEPRINT_COLUMNS}, subject:subjects(${SUBJECT_SELECT})`)
    .order("updated_at", { ascending: false });

  if (institutionId) query = query.eq("institution_id", institutionId);

  const { data, error } = await query;
  if (error) throw new Error(`Could not load blueprints: ${error.message}`);

  return ((data ?? []) as unknown as RawBlueprint[]).map(normalizeBlueprint);
}

export async function getBlueprintOwner(
  supabase: SupabaseServerClient,
  id: string,
): Promise<BlueprintOwner | null> {
  const { data, error } = await supabase
    .from("paper_blueprints")
    .select("id, created_by, institution_id")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load the blueprint: ${error.message}`);
  return (data as BlueprintOwner | null) ?? null;
}

export async function createBlueprint(
  supabase: SupabaseServerClient,
  institutionId: string,
  payload: BlueprintPayload,
): Promise<PaperBlueprint> {
  const { data, error } = await supabase
    .from("paper_blueprints")
    .insert({
      institution_id: institutionId,
      name: payload.name,
      subject_id: payload.subjectId,
      topic_ids: payload.topicIds,
      blueprint: payload.blueprint as unknown as Json,
      set_count: payload.setCount,
      shuffle_options: payload.shuffleOptions,
      duration_minutes: payload.durationMinutes,
    })
    .select(`${BLUEPRINT_COLUMNS}, subject:subjects(${SUBJECT_SELECT})`)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A blueprint with that name already exists. Pick another name.");
    }
    throw new Error(`Could not save the blueprint: ${error.message}`);
  }

  return normalizeBlueprint(data as unknown as RawBlueprint);
}

export async function updateBlueprint(
  supabase: SupabaseServerClient,
  id: string,
  payload: BlueprintPayload,
): Promise<PaperBlueprint> {
  const { data, error } = await supabase
    .from("paper_blueprints")
    .update({
      name: payload.name,
      subject_id: payload.subjectId,
      topic_ids: payload.topicIds,
      blueprint: payload.blueprint as unknown as Json,
      set_count: payload.setCount,
      shuffle_options: payload.shuffleOptions,
      duration_minutes: payload.durationMinutes,
    })
    .eq("id", id)
    .select(`${BLUEPRINT_COLUMNS}, subject:subjects(${SUBJECT_SELECT})`)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A blueprint with that name already exists. Pick another name.");
    }
    throw new Error(`Could not update the blueprint: ${error.message}`);
  }

  return normalizeBlueprint(data as unknown as RawBlueprint);
}

export async function deleteBlueprint(
  supabase: SupabaseServerClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("paper_blueprints").delete().eq("id", id);
  if (error) throw new Error(`Could not delete the blueprint: ${error.message}`);
}
