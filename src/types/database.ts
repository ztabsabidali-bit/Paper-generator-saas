export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "super_admin" | "admin" | "teacher";
export type QuestionType = "mcq" | "short" | "long";
export type Medium = "english" | "urdu" | "bilingual";
export type Difficulty = "easy" | "medium" | "hard";
export type TextDirection = "ltr" | "rtl";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: UserRole;
          is_active: boolean;
          institution_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          is_active?: boolean;
          institution_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          is_active?: boolean;
          institution_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      institutions: {
        Row: {
          id: string;
          name: string;
          tagline: string | null;
          address: string | null;
          logo_url: string | null;
          exam_session: string | null;
          footer_note: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          tagline?: string | null;
          address?: string | null;
          logo_url?: string | null;
          exam_session?: string | null;
          footer_note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          tagline?: string | null;
          address?: string | null;
          logo_url?: string | null;
          exam_session?: string | null;
          footer_note?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          institution_id: string;
          class_name: string;
          subject_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id?: string;
          class_name: string;
          subject_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          class_name?: string;
          subject_name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          id: string;
          subject_id: string;
          chapter_title: string;
          topic_title: string | null;
          subtopic_title: string | null;
          chapter_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          subject_id: string;
          chapter_title: string;
          topic_title?: string | null;
          subtopic_title?: string | null;
          chapter_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          subject_id?: string;
          chapter_title?: string;
          topic_title?: string | null;
          subtopic_title?: string | null;
          chapter_order?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          topic_id: string;
          institution_id: string;
          question_type: QuestionType;
          question_text: string;
          options: Json | null;
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
        };
        Insert: {
          id?: string;
          topic_id: string;
          institution_id?: string;
          question_type: QuestionType;
          question_text: string;
          options?: Json | null;
          correct_answer?: string | null;
          medium?: Medium;
          difficulty?: Difficulty;
          marks?: number;
          text_direction?: TextDirection;
          explanation?: string | null;
          created_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          topic_id?: string;
          institution_id?: string;
          question_type?: QuestionType;
          question_text?: string;
          options?: Json | null;
          correct_answer?: string | null;
          medium?: Medium;
          difficulty?: Difficulty;
          marks?: number;
          text_direction?: TextDirection;
          explanation?: string | null;
          created_by?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      papers: {
        Row: {
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
          print_options: Json;
        };
        Insert: {
          id?: string;
          title: string;
          total_marks?: number;
          created_by?: string | null;
          institution_id?: string;
          created_at?: string;
          updated_at?: string;
          class_name?: string;
          subject_id?: string | null;
          instructions?: string | null;
          duration_minutes?: number;
          exam_session?: string | null;
          seed?: number;
          status?: string;
          print_options?: Json;
        };
        Update: {
          id?: string;
          title?: string;
          total_marks?: number;
          created_by?: string | null;
          institution_id?: string;
          created_at?: string;
          updated_at?: string;
          class_name?: string;
          subject_id?: string | null;
          instructions?: string | null;
          duration_minutes?: number;
          exam_session?: string | null;
          seed?: number;
          status?: string;
          print_options?: Json;
        };
        Relationships: [];
      };
      paper_sets: {
        Row: {
          id: string;
          paper_id: string;
          set_label: string;
          seed: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          paper_id: string;
          set_label: string;
          seed?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          paper_id?: string;
          set_label?: string;
          seed?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      paper_questions: {
        Row: {
          id: string;
          paper_set_id: string;
          question_id: string;
          display_order: number;
          section: string | null;
          marks_override: number | null;
          option_order: Json | null;
        };
        Insert: {
          id?: string;
          paper_set_id: string;
          question_id: string;
          display_order: number;
          section?: string | null;
          marks_override?: number | null;
          option_order?: Json | null;
        };
        Update: {
          id?: string;
          paper_set_id?: string;
          question_id?: string;
          display_order?: number;
          section?: string | null;
          marks_override?: number | null;
          option_order?: Json | null;
        };
        Relationships: [];
      };
      paper_blueprints: {
        Row: {
          id: string;
          institution_id: string;
          created_by: string | null;
          name: string;
          subject_id: string;
          topic_ids: string[];
          blueprint: Json;
          set_count: number;
          shuffle_options: boolean;
          duration_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id?: string;
          created_by?: string | null;
          name: string;
          subject_id: string;
          topic_ids?: string[];
          blueprint?: Json;
          set_count?: number;
          shuffle_options?: boolean;
          duration_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          created_by?: string | null;
          name?: string;
          subject_id?: string;
          topic_ids?: string[];
          blueprint?: Json;
          set_count?: number;
          shuffle_options?: boolean;
          duration_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      auth_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      auth_institution_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
      is_super_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      same_institution: {
        Args: { p_institution_id: string };
        Returns: boolean;
      };
      can_manage_bank: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      can_access_paper: {
        Args: { p_paper_id: string };
        Returns: boolean;
      };
      subject_institution: {
        Args: { p_subject_id: string };
        Returns: string | null;
      };
      topic_institution: {
        Args: { p_topic_id: string };
        Returns: string | null;
      };
      paper_institution: {
        Args: { p_paper_id: string };
        Returns: string | null;
      };
    };
    Enums: {
      user_role: UserRole;
      question_type: QuestionType;
      medium_type: Medium;
      difficulty_level: Difficulty;
      text_direction: TextDirection;
    };
    CompositeTypes: Record<string, never>;
  };
}
