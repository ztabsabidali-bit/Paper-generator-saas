import type { Difficulty, Medium, QuestionType, TextDirection, UserRole } from "./database";

export type { Difficulty, Medium, QuestionType, TextDirection, UserRole };

export interface QuestionOption {
  key: string;
  text: string;
}

export interface Subject {
  id: string;
  class_name: string;
  subject_name: string;
}

export interface Topic {
  id: string;
  subject_id: string;
  chapter_title: string;
  topic_title: string | null;
  subtopic_title: string | null;
  chapter_order: number;
}

export interface SubjectWithTopics extends Subject {
  topics: Topic[];
}

export interface Question {
  id: string;
  topic_id: string;
  question_type: QuestionType;
  question_text: string;
  options: QuestionOption[] | null;
  correct_answer: string | null;
  medium: Medium;
  difficulty: Difficulty;
  marks: number;
  text_direction: TextDirection;
  explanation: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionWithTopic extends Question {
  topic: (Topic & { subject: Subject | null }) | null;
}

export interface PaperPrintOptions {
  title: boolean;
  session: boolean;
  duration: boolean;
  set_label: boolean;
  instructions: boolean;
}

export interface Paper {
  id: string;
  title: string;
  total_marks: number;
  created_by: string | null;
  institution_id: string;
  created_at: string;
  updated_at: string;
  class_name: string;
  subject_id: string | null;
  instructions: string | null;
  duration_minutes: number;
  exam_session: string | null;
  seed: number;
  status: string;
  print_options: PaperPrintOptions;
}

export interface PaperSet {
  id: string;
  paper_id: string;
  set_label: string;
  seed: number;
  created_at: string;
}

export interface PaperQuestionRow {
  id: string;
  paper_set_id: string;
  question_id: string;
  display_order: number;
  section: string | null;
  marks_override: number | null;
  option_order: string[] | null;
  question: Question | null;
}

export interface PaperWithSets extends Paper {
  subject: Subject | null;
  sets: Array<
    PaperSet & {
      items: PaperQuestionRow[];
    }
  >;
}

export interface InstitutionSettings {
  name: string;
  tagline: string | null;
  address: string | null;
  logo_url: string | null;
  exam_session: string | null;
  footer_note: string | null;
}

export interface Institution extends InstitutionSettings {
  id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  institution_id: string | null;
  created_at: string;
}

export interface StaffMember extends Profile {
  institution: { id: string; name: string } | null;
}

export interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
}
