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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      course_schedules: {
        Row: {
          course_id: string
          created_at: string
          day: string
          end_time: string
          id: string
          spots: number
          spots_left: number
          time: string
        }
        Insert: {
          course_id: string
          created_at?: string
          day: string
          end_time?: string
          id?: string
          spots?: number
          spots_left?: number
          time: string
        }
        Update: {
          course_id?: string
          created_at?: string
          day?: string
          end_time?: string
          id?: string
          spots?: number
          spots_left?: number
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_schedules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string
          created_at: string
          day: string
          days: string[]
          description: string
          duration: string
          end_time: string
          frequency: string
          id: string
          instructor: string
          instructor_id: string | null
          long_description: string
          name: string
          spots: number
          spots_left: number
          time: string
        }
        Insert: {
          category?: string
          created_at?: string
          day: string
          days?: string[]
          description?: string
          duration: string
          end_time?: string
          frequency?: string
          id?: string
          instructor?: string
          instructor_id?: string | null
          long_description?: string
          name: string
          spots?: number
          spots_left?: number
          time: string
        }
        Update: {
          category?: string
          created_at?: string
          day?: string
          days?: string[]
          description?: string
          duration?: string
          end_time?: string
          frequency?: string
          id?: string
          instructor?: string
          instructor_id?: string | null
          long_description?: string
          name?: string
          spots?: number
          spots_left?: number
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          active: boolean
          bio: string
          created_at: string
          email: string
          id: string
          name: string
          phone: string
          specialties: string[]
          urls: string[]
        }
        Insert: {
          active?: boolean
          bio?: string
          created_at?: string
          email?: string
          id?: string
          name: string
          phone?: string
          specialties?: string[]
          urls?: string[]
        }
        Update: {
          active?: boolean
          bio?: string
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string
          specialties?: string[]
          urls?: string[]
        }
        Relationships: []
      }
      planned_sessions: {
        Row: {
          course_id: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          notes: string
          time: string
          title: string
          workshop_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          date: string
          end_time?: string
          id?: string
          notes?: string
          time?: string
          title?: string
          workshop_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          notes?: string
          time?: string
          title?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planned_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_sessions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_cards: {
        Row: {
          created_at: string
          id: string
          name: string
          payment_info: string
          popular: boolean
          price: number
          sessions: number
          sort_order: number
          validity: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          payment_info?: string
          popular?: boolean
          price?: number
          sessions?: number
          sort_order?: number
          validity?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          payment_info?: string
          popular?: boolean
          price?: number
          sessions?: number
          sort_order?: number
          validity?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          activity_name: string
          activity_type: string
          client_name: string
          course_id: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          notes: string
          participants: number
          schedule_id: string | null
          status: string
          time: string
          workshop_id: string | null
        }
        Insert: {
          activity_name: string
          activity_type?: string
          client_name?: string
          course_id?: string | null
          created_at?: string
          date: string
          end_time?: string
          id?: string
          notes?: string
          participants?: number
          schedule_id?: string | null
          status?: string
          time: string
          workshop_id?: string | null
        }
        Update: {
          activity_name?: string
          activity_type?: string
          client_name?: string
          course_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          notes?: string
          participants?: number
          schedule_id?: string | null
          status?: string
          time?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "course_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      workshops: {
        Row: {
          category: string
          created_at: string
          date: string
          description: string
          duration: string
          end_time: string
          frequency: string
          id: string
          image: string
          instructor_id: string | null
          long_description: string
          name: string
          price: number
          spots: number
          spots_left: number
          time: string
        }
        Insert: {
          category?: string
          created_at?: string
          date: string
          description?: string
          duration?: string
          end_time?: string
          frequency?: string
          id?: string
          image?: string
          instructor_id?: string | null
          long_description?: string
          name: string
          price?: number
          spots?: number
          spots_left?: number
          time?: string
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          description?: string
          duration?: string
          end_time?: string
          frequency?: string
          id?: string
          image?: string
          instructor_id?: string | null
          long_description?: string
          name?: string
          price?: number
          spots?: number
          spots_left?: number
          time?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshops_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
