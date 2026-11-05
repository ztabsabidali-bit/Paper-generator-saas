import type { SubjectWithTopics } from "@/types/domain";

/** Default title shown in the paper builders until the teacher edits it. */
export function defaultPaperTitle(subject: SubjectWithTopics | null | undefined) {
  return subject ? `${subject.class_name} · ${subject.subject_name} — Final Term` : "";
}
