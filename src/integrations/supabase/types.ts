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
      client_cards: {
        Row: {
          card_name: string
          client_name: string
          created_at: string
          expires_at: string
          id: string
          total_sessions: number
          used_sessions: number
        }
        Insert: {
          card_name: string
          client_name: string
          created_at?: string
          expires_at: string
          id?: string
          total_sessions?: number
          used_sessions?: number
        }
        Update: {
          card_name?: string
          client_name?: string
          created_at?: string
          expires_at?: string
          id?: string
          total_sessions?: number
          used_sessions?: number
        }
        Relationships: []
      }
      conditions: {
        Row: {
          active: boolean
          applies_to: string[]
          content: string
          created_at: string
          id: string
          sort_order: number
          title: string
          type: string
        }
        Insert: {
          active?: boolean
          applies_to?: string[]
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          type?: string
        }
        Update: {
          active?: boolean
          applies_to?: string[]
          content?: string
          created_at?: string
          id?: string
          sort_order?: number
          title?: string
          type?: string
        }
        Relationships: []
      }
      course_schedules: {
        Row: {
          card_yoga_count: number
          course_id: string
          created_at: string
          day: string
          end_time: string
          id: string
          inclusions: string
          price: number
          spots: number
          spots_left: number
          time: string
        }
        Insert: {
          card_yoga_count?: number
          course_id: string
          created_at?: string
          day: string
          end_time?: string
          id?: string
          inclusions?: string
          price?: number
          spots?: number
          spots_left?: number
          time: string
        }
        Update: {
          card_yoga_count?: number
          course_id?: string
          created_at?: string
          day?: string
          end_time?: string
          id?: string
          inclusions?: string
          price?: number
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
          image: string
          instructor: string
          instructor_id: string | null
          intensity: string
          long_description: string
          modalities: string
          name: string
          reminder_template: string
          reminder_timing: string
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
          image?: string
          instructor?: string
          instructor_id?: string | null
          intensity?: string
          long_description?: string
          modalities?: string
          name: string
          reminder_template?: string
          reminder_timing?: string
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
          image?: string
          instructor?: string
          instructor_id?: string | null
          intensity?: string
          long_description?: string
          modalities?: string
          name?: string
          reminder_template?: string
          reminder_timing?: string
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
      feature_examples: {
        Row: {
          created_at: string
          description: string
          id: string
          impact: string
          target: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          impact?: string
          target?: string
          title?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          impact?: string
          target?: string
          title?: string
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          created_at: string
          description: string
          id: string
          impact: string
          status: string
          target: string
          ticket_group: string | null
          title: string
          urgency: number
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          impact?: string
          status?: string
          target?: string
          ticket_group?: string | null
          title?: string
          urgency?: number
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          impact?: string
          status?: string
          target?: string
          ticket_group?: string | null
          title?: string
          urgency?: number
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          author_name: string
          created_at: string
          id: string
          message: string
          rating: number
        }
        Insert: {
          author_name?: string
          created_at?: string
          id?: string
          message?: string
          rating?: number
        }
        Update: {
          author_name?: string
          created_at?: string
          id?: string
          message?: string
          rating?: number
        }
        Relationships: []
      }
      forum_posts: {
        Row: {
          author_name: string
          category: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_name: string
          category?: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_name?: string
          category?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      gift_vouchers: {
        Row: {
          amount: number
          beneficiary_name: string
          buyer_name: string
          card_name: string
          code: string
          created_at: string
          expires_at: string
          id: string
          message: string
          sessions: number
          type: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          amount?: number
          beneficiary_name?: string
          buyer_name?: string
          card_name?: string
          code: string
          created_at?: string
          expires_at: string
          id?: string
          message?: string
          sessions?: number
          type?: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          amount?: number
          beneficiary_name?: string
          buyer_name?: string
          card_name?: string
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          message?: string
          sessions?: number
          type?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: []
      }
      instructors: {
        Row: {
          active: boolean
          bio: string
          created_at: string
          email: string
          id: string
          last_name: string
          name: string
          phone: string
          photo_url: string
          specialties: string[]
          urls: string[]
        }
        Insert: {
          active?: boolean
          bio?: string
          created_at?: string
          email?: string
          id?: string
          last_name?: string
          name: string
          phone?: string
          photo_url?: string
          specialties?: string[]
          urls?: string[]
        }
        Update: {
          active?: boolean
          bio?: string
          created_at?: string
          email?: string
          id?: string
          last_name?: string
          name?: string
          phone?: string
          photo_url?: string
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
      profiles: {
        Row: {
          address: string
          avatar_url: string
          bio: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string
          reminder_email: boolean
          reminder_sms: boolean
          show_in_community: boolean
          user_name: string
        }
        Insert: {
          address?: string
          avatar_url?: string
          bio?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          reminder_email?: boolean
          reminder_sms?: boolean
          show_in_community?: boolean
          user_name: string
        }
        Update: {
          address?: string
          avatar_url?: string
          bio?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string
          reminder_email?: boolean
          reminder_sms?: boolean
          show_in_community?: boolean
          user_name?: string
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
          card_yoga_count: number
          category: string
          created_at: string
          date: string
          description: string
          duration: string
          end_time: string
          frequency: string
          id: string
          image: string
          inclusions: string
          instructor_id: string | null
          intensity: string
          long_description: string
          modalities: string
          name: string
          price: number
          reminder_template: string
          reminder_timing: string
          spots: number
          spots_left: number
          time: string
        }
        Insert: {
          card_yoga_count?: number
          category?: string
          created_at?: string
          date: string
          description?: string
          duration?: string
          end_time?: string
          frequency?: string
          id?: string
          image?: string
          inclusions?: string
          instructor_id?: string | null
          intensity?: string
          long_description?: string
          modalities?: string
          name: string
          price?: number
          reminder_template?: string
          reminder_timing?: string
          spots?: number
          spots_left?: number
          time?: string
        }
        Update: {
          card_yoga_count?: number
          category?: string
          created_at?: string
          date?: string
          description?: string
          duration?: string
          end_time?: string
          frequency?: string
          id?: string
          image?: string
          inclusions?: string
          instructor_id?: string | null
          intensity?: string
          long_description?: string
          modalities?: string
          name?: string
          price?: number
          reminder_template?: string
          reminder_timing?: string
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
