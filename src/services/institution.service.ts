import type { SupabaseServerClient } from "@/lib/auth/session";
import type { InstitutionSettings } from "@/types/domain";

const FALLBACK: InstitutionSettings = {
  name: "Your Institution",
  tagline: null,
  address: null,
  logo_url: null,
  exam_session: null,
  footer_note: null,
};

export async function getInstitution(
  supabase: SupabaseServerClient,
): Promise<InstitutionSettings> {
  const { data, error } = await supabase
    .from("institution_settings")
    .select("name, tagline, address, logo_url, exam_session, footer_note")
    .eq("id", true)
    .maybeSingle();

  if (error) throw new Error(`Could not load institution settings: ${error.message}`);
  return (data as InstitutionSettings | null) ?? FALLBACK;
}

export async function updateInstitution(
  supabase: SupabaseServerClient,
  values: InstitutionSettings,
) {
  const { error } = await supabase.from("institution_settings").upsert(
    {
      id: true,
      name: values.name,
      tagline: values.tagline,
      address: values.address,
      logo_url: values.logo_url,
      exam_session: values.exam_session,
      footer_note: values.footer_note,
    },
    { onConflict: "id" },
  );

  if (error) throw new Error(`Could not save institution settings: ${error.message}`);
}
