import type { SupabaseServerClient } from "@/lib/auth/session";
import type { Institution, InstitutionSettings } from "@/types/domain";

const FALLBACK: InstitutionSettings = {
  name: "Your Institution",
  tagline: null,
  address: null,
  logo_url: null,
  exam_session: null,
  footer_note: null,
};

const COLUMNS = "id, name, tagline, address, logo_url, exam_session, footer_note, created_at";

/** Institutions visible to the caller (all of them for the developer). */
export async function listInstitutions(
  supabase: SupabaseServerClient,
): Promise<Institution[]> {
  const { data, error } = await supabase
    .from("institutions")
    .select(COLUMNS)
    .order("name");

  if (error) throw new Error(`Could not load institutions: ${error.message}`);
  return (data ?? []) as Institution[];
}

export async function getInstitutionById(
  supabase: SupabaseServerClient,
  id: string,
): Promise<Institution | null> {
  const { data, error } = await supabase
    .from("institutions")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load the institution: ${error.message}`);
  return (data as Institution | null) ?? null;
}

/**
 * Printable profile for a paper. Falls back to a neutral header when the row
 * cannot be read (RLS or a deleted institution).
 */
export async function getInstitution(
  supabase: SupabaseServerClient,
  institutionId: string | null | undefined,
): Promise<InstitutionSettings> {
  if (!institutionId) return FALLBACK;

  const { data, error } = await supabase
    .from("institutions")
    .select("name, tagline, address, logo_url, exam_session, footer_note")
    .eq("id", institutionId)
    .maybeSingle();

  if (error) throw new Error(`Could not load institution settings: ${error.message}`);
  return (data as InstitutionSettings | null) ?? FALLBACK;
}

export async function createInstitution(
  supabase: SupabaseServerClient,
  values: InstitutionSettings,
): Promise<string> {
  const { data, error } = await supabase
    .from("institutions")
    .insert({
      name: values.name,
      tagline: values.tagline,
      address: values.address,
      logo_url: values.logo_url,
      exam_session: values.exam_session,
      footer_note: values.footer_note,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`Could not create the institution: ${error?.message ?? "unknown error"}`);
  }
  return data.id;
}

export async function updateInstitution(
  supabase: SupabaseServerClient,
  id: string,
  values: InstitutionSettings,
) {
  const { error } = await supabase
    .from("institutions")
    .update({
      name: values.name,
      tagline: values.tagline,
      address: values.address,
      logo_url: values.logo_url,
      exam_session: values.exam_session,
      footer_note: values.footer_note,
    })
    .eq("id", id);

  if (error) throw new Error(`Could not save institution settings: ${error.message}`);
}
