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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: UserRole;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          class_name: string;
          subject_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          class_name: string;
          subject_name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
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
          created_at: string;
          updated_at: string;
          class_name: string;
          subject_id: string | null;
          instructions: string | null;
          duration_minutes: number;
          exam_session: string | null;
          seed: number;
          status: string;
        };
        Insert: {
          id?: string;
          title: string;
          total_marks?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          class_name?: string;
          subject_id?: string | null;
          instructions?: string | null;
          duration_minutes?: number;
          exam_session?: string | null;
          seed?: number;
          status?: string;
        };
        Update: {
          id?: string;
          title?: string;
          total_marks?: number;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          class_name?: string;
          subject_id?: string | null;
          instructions?: string | null;
          duration_minutes?: number;
          exam_session?: string | null;
          seed?: number;
          status?: string;
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
      institution_settings: {
        Row: {
          id: boolean;
          name: string;
          tagline: string | null;
          address: string | null;
          logo_url: string | null;
          exam_session: string | null;
          footer_note: string | null;
          updated_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: boolean;
          name: string;
          tagline?: string | null;
          address?: string | null;
          logo_url?: string | null;
          exam_session?: string | null;
          footer_note?: string | null;
          updated_by?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: boolean;
          name?: string;
          tagline?: string | null;
          address?: string | null;
          logo_url?: string | null;
          exam_session?: string | null;
          footer_note?: string | null;
          updated_by?: string | null;
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
      can_manage_bank: {
        Args: Record<string, never>;
        Returns: boolean;
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
