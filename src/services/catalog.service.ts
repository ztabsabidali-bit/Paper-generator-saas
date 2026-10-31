import type { SupabaseServerClient } from "@/lib/auth/session";
import type { Subject, SubjectWithTopics } from "@/types/domain";

interface RawSubject extends Subject {
  topics?: SubjectWithTopics["topics"];
}

function normalizeSubject(row: RawSubject): SubjectWithTopics {
  const topics = [...(row.topics ?? [])].sort((a, b) => {
    if (a.chapter_order !== b.chapter_order) return a.chapter_order - b.chapter_order;
    return a.chapter_title.localeCompare(b.chapter_title);
  });

  return {
    id: row.id,
    class_name: row.class_name,
    subject_name: row.subject_name,
    topics,
  };
}

/** Whole catalogue: subjects with their chapter/topic tree. */
export async function getCatalog(
  supabase: SupabaseServerClient,
): Promise<SubjectWithTopics[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select(
      "id, class_name, subject_name, topics(id, subject_id, chapter_title, topic_title, subtopic_title, chapter_order)",
    )
    .order("class_name")
    .order("subject_name")
    .order("chapter_order", { referencedTable: "topics" });

  if (error) throw new Error(`Could not load the catalogue: ${error.message}`);

  return ((data ?? []) as unknown as RawSubject[]).map(normalizeSubject);
}

export async function getSubjects(
  supabase: SupabaseServerClient,
): Promise<Subject[]> {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, class_name, subject_name")
    .order("class_name")
    .order("subject_name");

  if (error) throw new Error(`Could not load subjects: ${error.message}`);
  return (data ?? []) as Subject[];
}
