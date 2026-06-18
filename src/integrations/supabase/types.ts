export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string
          id: string
          password_hash: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          password_hash: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          password_hash?: string
          updated_at?: string
        }
        Relationships: []
      }
      announcements: {
        Row: {
          created_at: string
          end_at: string | null
          id: string
          is_active: boolean
          message: string
          start_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_at?: string | null
          id?: string
          is_active?: boolean
          message: string
          start_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_at?: string | null
          id?: string
          is_active?: boolean
          message?: string
          start_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      application_job_events: {
        Row: {
          id: string
          job_id: string
          level: string
          message: string
          screenshot_url: string
          step: string
          ts: string
          url: string
          user_id: string
        }
        Insert: {
          id?: string
          job_id: string
          level?: string
          message?: string
          screenshot_url?: string
          step?: string
          ts?: string
          url?: string
          user_id: string
        }
        Update: {
          id?: string
          job_id?: string
          level?: string
          message?: string
          screenshot_url?: string
          step?: string
          ts?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_job_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "application_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      application_jobs: {
        Row: {
          agent_run_id: string
          application_id: string
          attempts: number
          created_at: string
          current_step: string
          error: Json | null
          finished_at: string | null
          id: string
          job_source: string
          job_url: string
          payload: Json
          pending_question: Json | null
          resume_pdf_path: string
          resume_version: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_run_id?: string
          application_id: string
          attempts?: number
          created_at?: string
          current_step?: string
          error?: Json | null
          finished_at?: string | null
          id?: string
          job_source?: string
          job_url?: string
          payload?: Json
          pending_question?: Json | null
          resume_pdf_path?: string
          resume_version?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_run_id?: string
          application_id?: string
          attempts?: number
          created_at?: string
          current_step?: string
          error?: Json | null
          finished_at?: string | null
          id?: string
          job_source?: string
          job_url?: string
          payload?: Json
          pending_question?: Json | null
          resume_pdf_path?: string
          resume_version?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          category: string
          created_at: string
          id: string
          message: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          message: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          message?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      maintenance_mode: {
        Row: {
          expected_return: string | null
          id: number
          is_enabled: boolean
          message: string
          updated_at: string
        }
        Insert: {
          expected_return?: string | null
          id?: number
          is_enabled?: boolean
          message?: string
          updated_at?: string
        }
        Update: {
          expected_return?: string | null
          id?: number
          is_enabled?: boolean
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          achievements: Json
          certifications: Json
          created_at: string
          education: Json
          email: string
          experience: Json
          github_intel: Json
          github_url: string
          headline: string
          id: string
          languages: Json
          linkedin_intel: Json
          linkedin_url: string
          location: string
          name: string
          onboarded: boolean
          phone: string
          portfolio_url: string
          profile_intel: Json
          projects: Json
          salary_expectation: Json
          seniority: string
          skills: Json
          summary: string
          target_locations: Json
          target_role: string
          updated_at: string
          work_mode: string
        }
        Insert: {
          achievements?: Json
          certifications?: Json
          created_at?: string
          education?: Json
          email?: string
          experience?: Json
          github_intel?: Json
          github_url?: string
          headline?: string
          id: string
          languages?: Json
          linkedin_intel?: Json
          linkedin_url?: string
          location?: string
          name?: string
          onboarded?: boolean
          phone?: string
          portfolio_url?: string
          profile_intel?: Json
          projects?: Json
          salary_expectation?: Json
          seniority?: string
          skills?: Json
          summary?: string
          target_locations?: Json
          target_role?: string
          updated_at?: string
          work_mode?: string
        }
        Update: {
          achievements?: Json
          certifications?: Json
          created_at?: string
          education?: Json
          email?: string
          experience?: Json
          github_intel?: Json
          github_url?: string
          headline?: string
          id?: string
          languages?: Json
          linkedin_intel?: Json
          linkedin_url?: string
          location?: string
          name?: string
          onboarded?: boolean
          phone?: string
          portfolio_url?: string
          profile_intel?: Json
          projects?: Json
          salary_expectation?: Json
          seniority?: string
          skills?: Json
          summary?: string
          target_locations?: Json
          target_role?: string
          updated_at?: string
          work_mode?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          created_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      verify_admin_password: {
        Args: { _email: string; _password: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
