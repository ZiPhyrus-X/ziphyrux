/**
-- Database Types for Ziphyrus X Supabase Schemas
-- Logical Schemas: identity, master, academic, student, trainer, learning,
-- coding, assessment, placement, intelligence, operations, communication, audit, system.
*/

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  identity: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          login_id: string;
          email: string;
          name: string;
          college_id: string | null;
          status: "active" | "inactive" | "pending" | "archived";
          is_protected: boolean;
          last_active: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["identity"]["Tables"]["users"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["identity"]["Tables"]["users"]["Insert"]>;
      };
      roles: {
        Row: {
          id: string;
          name: string;
          display_name: string;
          description: string | null;
          created_at: string;
        };
      };
      permissions: {
        Row: {
          id: string;
          code: string;
          scope: string;
          description: string | null;
          created_at: string;
        };
      };
      user_roles: {
        Row: {
          user_id: string;
          role_id: string;
          assigned_at: string;
        };
      };
    };
  };
  master: {
    Tables: {
      colleges: {
        Row: {
          id: string;
          name: string;
          code: string;
          status: "active" | "inactive" | "pending" | "archived";
          campuses: number;
          students: number;
          trainers: number;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["master"]["Tables"]["colleges"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["master"]["Tables"]["colleges"]["Insert"]>;
      };
      campuses: {
        Row: {
          id: string;
          college_id: string;
          name: string;
          code: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      reference_data: {
        Row: {
          id: string;
          entity: string;
          records: number;
          status: "active" | "inactive" | "archived";
          updated_at: string;
        };
      };
    };
  };
  coding: {
    Tables: {
      problems: {
        Row: {
          id: string;
          code: string;
          title: string;
          difficulty: "Easy" | "Medium" | "Hard";
          topic: string;
          version: string;
          status: "published" | "draft" | "archived";
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["coding"]["Tables"]["problems"]["Row"], "id" | "created_at" | "updated_at">;
      };
      judge_drafts: {
        Row: {
          id: string;
          student_id: string;
          problem_id: string;
          language: string;
          code: string;
          updated_at: string;
        };
        Insert: Omit<Database["coding"]["Tables"]["judge_drafts"]["Row"], "id" | "updated_at">;
      };
      judge_submissions: {
        Row: {
          id: string;
          problem_id: string;
          problem_title: string;
          student_id: string;
          student_name: string;
          college_id: string;
          college_code: string;
          language: string;
          source_code: string;
          status: string;
          score: number;
          execution_time_ms: number;
          memory_used_mb: number;
          test_cases_passed: number;
          total_test_cases: number;
          submitted_at: string;
          github_synced: boolean;
          github_commit_sha: string | null;
          github_repo_name: string | null;
        };
        Insert: Omit<Database["coding"]["Tables"]["judge_submissions"]["Row"], "id" | "submitted_at">;
      };
      github_sync_jobs: {
        Row: {
          id: string;
          student_id: string;
          submission_id: string;
          repo_name: string;
          status: string;
          commit_sha: string | null;
          file_path: string;
          commit_message: string | null;
          retry_count: number;
          error_message: string | null;
          synced_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["coding"]["Tables"]["github_sync_jobs"]["Row"], "id" | "created_at">;
      };
    };
  };
  operations: {
    Tables: {
      services: {
        Row: {
          id: string;
          name: string;
          status: "healthy" | "degraded" | "down";
          latency: string;
          checked_at: string;
        };
      };
      integrations: {
        Row: {
          id: string;
          name: string;
          status: "active" | "inactive" | "degraded";
          capabilities: string;
          last_sync: string | null;
          last_error: string | null;
          created_at: string;
        };
      };
      background_jobs: {
        Row: {
          id: string;
          type: string;
          status: "succeeded" | "running" | "queued" | "failed";
          duration: string | null;
          attempts: number;
          started_at: string;
          completed_at: string | null;
          payload: Json;
          error_message: string | null;
        };
      };
    };
  };
  audit: {
    Tables: {
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          actor_login: string;
          action: string;
          target: string;
          severity: "info" | "warning" | "critical";
          metadata: Json;
          ip_address: string | null;
          created_at: string;
        };
      };
    };
  };
  system: {
    Tables: {
      feature_flags: {
        Row: {
          id: string;
          key: string;
          name: string;
          description: string | null;
          is_enabled: boolean;
          controlled_by_role: string;
          last_modified_by: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      visible_value_overrides: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          field_name: string;
          actual_value: string;
          visible_value: string;
          mandatory_reason: string;
          overridden_by: string;
          created_at: string;
        };
      };
    };
  };
  assessment: {
    Tables: {
      questions: {
        Row: {
          id: string;
          code: string;
          stem: string;
          domain: "Technical" | "Verbal" | "Aptitude" | "Soft Skills";
          type: "MCQ" | "Long Answer" | "Short Answer";
          difficulty: "Easy" | "Medium" | "Hard";
          options: Json | null;
          correct_answer: string | null;
          status: "published" | "draft" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["assessment"]["Tables"]["questions"]["Row"], "id" | "created_at" | "updated_at">;
      };
      question_modules: {
        Row: {
          id: string;
          name: string;
          normalized_name: string;
          description: string | null;
          module_kind: "assessment" | "coding";
          visibility_status: "visible" | "hidden";
          status: "active" | "archived";
          blueprint_code: string | null;
          target_difficulty: "Beginner" | "Intermediate" | "Advanced" | null;
          domain: "Technical" | "Aptitude" | "Verbal" | "Soft Skills" | "Coding" | "Core Engineering" | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: Omit<Database["assessment"]["Tables"]["question_modules"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["assessment"]["Tables"]["question_modules"]["Insert"]>;
      };
      module_college_access: {
        Row: {
          id: string;
          module_id: string;
          college_id: string;
          college_code: string | null;
          granted_by: string;
          granted_at: string;
          revoked_at: string | null;
          revoked_by: string | null;
        };
        Insert: Omit<Database["assessment"]["Tables"]["module_college_access"]["Row"], "id" | "granted_at">;
        Update: Partial<Database["assessment"]["Tables"]["module_college_access"]["Insert"]>;
      };
      assessment_modules: {
        Row: {
          id: string;
          name: string;
          normalized_name: string;
          domain: "Technical" | "Aptitude" | "Verbal" | "Soft Skills" | "Coding" | "Core Engineering";
          description: string | null;
          visibility_status: "visible" | "hidden";
          status: "active" | "archived";
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["assessment"]["Tables"]["assessment_modules"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["assessment"]["Tables"]["assessment_modules"]["Insert"]>;
      };
      assessment_module_college_access: {
        Row: {
          id: string;
          module_id: string;
          college_id: string;
          college_code: string | null;
          granted_by: string;
          granted_at: string;
          revoked_at: string | null;
          revoked_by: string | null;
        };
        Insert: Omit<Database["assessment"]["Tables"]["assessment_module_college_access"]["Row"], "id" | "granted_at">;
        Update: Partial<Database["assessment"]["Tables"]["assessment_module_college_access"]["Insert"]>;
      };
      assessments: {
        Row: {
          id: string;
          code: string;
          module_id: string;
          title: string;
          description: string | null;
          domain: "Technical" | "Aptitude" | "Verbal" | "Soft Skills" | "Coding" | "Core Engineering";
          difficulty: "Beginner" | "Intermediate" | "Advanced";
          duration_minutes: number;
          total_marks: number;
          passing_marks: number;
          questions_count: number;
          status: "draft" | "in_review" | "published" | "archived";
          current_version: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["assessment"]["Tables"]["assessments"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["assessment"]["Tables"]["assessments"]["Insert"]>;
      };
      assessment_sections: {
        Row: {
          id: string;
          assessment_id: string;
          title: string;
          description: string | null;
          section_order: number;
          duration_minutes: number | null;
          created_at: string;
        };
        Insert: Omit<Database["assessment"]["Tables"]["assessment_sections"]["Row"], "created_at">;
        Update: Partial<Database["assessment"]["Tables"]["assessment_sections"]["Insert"]>;
      };
      assessment_items: {
        Row: {
          id: string;
          assessment_id: string;
          section_id: string | null;
          question_id: string | null;
          item_type: "question" | "coding_problem" | "custom";
          marks: number;
          item_order: number;
          created_at: string;
        };
        Insert: Omit<Database["assessment"]["Tables"]["assessment_items"]["Row"], "created_at">;
        Update: Partial<Database["assessment"]["Tables"]["assessment_items"]["Insert"]>;
      };
      assessment_attempts: {
        Row: {
          id: string;
          assessment_id: string;
          student_id: string;
          college_id: string;
          status: string;
          started_at: string;
          submitted_at: string | null;
          duration_seconds: number;
          time_remaining_seconds: number;
          score: number;
          total_marks: number;
          percentage: number;
          questions_count: number;
          answered_count: number;
        };
        Insert: Omit<Database["assessment"]["Tables"]["assessment_attempts"]["Row"], "id" | "started_at">;
      };
      assessment_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          selected_option: string | null;
          answer_text: string | null;
          is_saved: boolean;
          saved_at: string;
        };
        Insert: Omit<Database["assessment"]["Tables"]["assessment_answers"]["Row"], "id" | "saved_at">;
      };
    };
  };
  communication: {
    Tables: {
      notifications: {
        Row: {
          id: string;
          title: string;
          message: string;
          target_role: string;
          college_scope: string | null;
          status: "draft" | "sent" | "scheduled" | "archived";
          duration_days: number;
          expires_at: string;
          sent_at: string;
          created_at: string;
          created_by: string | null;
        };
        Insert: Omit<Database["communication"]["Tables"]["notifications"]["Row"], "created_at" | "sent_at">;
        Update: Partial<Database["communication"]["Tables"]["notifications"]["Insert"]>;
      };
    };
  };
  academic: {
    Tables: {
      classes: {
        Row: {
          id: string;
          college_id: string;
          academic_year: string;
          branch: string;
          semester: string;
          section: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["academic"]["Tables"]["classes"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["academic"]["Tables"]["classes"]["Insert"]>;
      };
      batches: {
        Row: {
          id: string;
          college_id: string;
          name: string;
          department: string;
          year: string;
          section: string;
          status: "active" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["academic"]["Tables"]["batches"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["academic"]["Tables"]["batches"]["Insert"]>;
      };
      trainer_allocations: {
        Row: {
          id: string;
          college_id: string;
          trainer_id: string;
          batch_id: string | null;
          department: string;
          year: string;
          semester: string;
          section: string;
          skill: string;
          course_name: string;
          start_date: string;
          end_date: string;
          status: "active" | "completed" | "cancelled";
          created_at: string;
        };
        Insert: Omit<Database["academic"]["Tables"]["trainer_allocations"]["Row"], "created_at">;
        Update: Partial<Database["academic"]["Tables"]["trainer_allocations"]["Insert"]>;
      };
      action_plans: {
        Row: {
          id: string;
          college_id: string;
          student_id: string;
          student_name: string;
          trainer_id: string | null;
          trainer_name: string;
          description: string;
          deadline: string;
          status: "Not Started" | "In Progress" | "Blocked" | "Completed";
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["academic"]["Tables"]["action_plans"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["academic"]["Tables"]["action_plans"]["Insert"]>;
      };
    };
  };
  placement: {
    Tables: {
      requirements: {
        Row: {
          id: string;
          college_id: string;
          company_name: string;
          role_title: string;
          min_cgpa: number;
          eligible_branches: string[];
          required_skills: string[];
          deadline: string;
          status: "open" | "closed";
          created_at: string;
        };
        Insert: Omit<Database["placement"]["Tables"]["requirements"]["Row"], "created_at">;
        Update: Partial<Database["placement"]["Tables"]["requirements"]["Insert"]>;
      };
    };
  };
  student: {
    Tables: {
      activity_events: {
        Row: {
          id: string;
          student_id: string;
          college_id: string;
          activity_type: string;
          title: string;
          description: string | null;
          reference_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: Omit<Database["student"]["Tables"]["activity_events"]["Row"], "id" | "created_at">;
      };
    };
  };
}
