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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bookings: {
        Row: {
          advance_paid: number
          bed_number: number | null
          booking_date: string
          created_at: string
          deposit_paid: number
          hostel_id: string
          id: string
          move_in_date: string
          notes: string | null
          rent_per_bed: number
          room_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advance_paid?: number
          bed_number?: number | null
          booking_date?: string
          created_at?: string
          deposit_paid?: number
          hostel_id: string
          id?: string
          move_in_date: string
          notes?: string | null
          rent_per_bed: number
          room_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advance_paid?: number
          bed_number?: number | null
          booking_date?: string
          created_at?: string
          deposit_paid?: number
          hostel_id?: string
          id?: string
          move_in_date?: string
          notes?: string | null
          rent_per_bed?: number
          room_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_facilities: {
        Row: {
          created_at: string | null
          facility: string
          hostel_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          facility: string
          hostel_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          facility?: string
          hostel_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hostel_facilities_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      hostel_images: {
        Row: {
          created_at: string | null
          hostel_id: string
          id: string
          image_url: string
          is_primary: boolean | null
        }
        Insert: {
          created_at?: string | null
          hostel_id: string
          id?: string
          image_url: string
          is_primary?: boolean | null
        }
        Update: {
          created_at?: string | null
          hostel_id?: string
          id?: string
          image_url?: string
          is_primary?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "hostel_images_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      hostels: {
        Row: {
          address: string
          approved: boolean | null
          available_rooms: number | null
          city: string
          created_at: string | null
          description: string | null
          hostel_type: Database["public"]["Enums"]["hostel_type"]
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          owner_id: string
          price_per_month: number
          rating: number | null
          updated_at: string | null
        }
        Insert: {
          address: string
          approved?: boolean | null
          available_rooms?: number | null
          city: string
          created_at?: string | null
          description?: string | null
          hostel_type: Database["public"]["Enums"]["hostel_type"]
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          owner_id: string
          price_per_month: number
          rating?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          approved?: boolean | null
          available_rooms?: number | null
          city?: string
          created_at?: string | null
          description?: string | null
          hostel_type?: Database["public"]["Enums"]["hostel_type"]
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          owner_id?: string
          price_per_month?: number
          rating?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      owners: {
        Row: {
          created_at: string | null
          due_day: number | null
          id: string
          mess_name: string | null
          name: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          due_day?: number | null
          id?: string
          mess_name?: string | null
          name?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          due_day?: number | null
          id?: string
          mess_name?: string | null
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          base_amount: number | null
          deduction_amount: number | null
          final_amount: number | null
          id: string
          month: string | null
          payment_date: string | null
          status: string | null
          student_id: string | null
          vacation_days: number | null
        }
        Insert: {
          base_amount?: number | null
          deduction_amount?: number | null
          final_amount?: number | null
          id?: string
          month?: string | null
          payment_date?: string | null
          status?: string | null
          student_id?: string | null
          vacation_days?: number | null
        }
        Update: {
          base_amount?: number | null
          deduction_amount?: number | null
          final_amount?: number | null
          id?: string
          month?: string | null
          payment_date?: string | null
          status?: string | null
          student_id?: string | null
          vacation_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string
          gender: string | null
          id: string
          phone: string | null
          suspended: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name: string
          gender?: string | null
          id: string
          phone?: string | null
          suspended?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          phone?: string | null
          suspended?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          approved: boolean | null
          comment: string | null
          created_at: string
          hostel_id: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          approved?: boolean | null
          comment?: string | null
          created_at?: string
          hostel_id: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          approved?: boolean | null
          comment?: string | null
          created_at?: string
          hostel_id?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          advance_months: number
          attached_bath: boolean
          balcony: boolean
          beds_available: number
          beds_total: number
          created_at: string
          deposit_amount: number
          description: string | null
          floor: number
          hostel_id: string
          id: string
          occupied_bed_numbers: number[]
          rent_per_bed: number
          room_no: string
          sharing_type: string
          updated_at: string
        }
        Insert: {
          advance_months?: number
          attached_bath?: boolean
          balcony?: boolean
          beds_available: number
          beds_total: number
          created_at?: string
          deposit_amount?: number
          description?: string | null
          floor: number
          hostel_id: string
          id?: string
          occupied_bed_numbers?: number[]
          rent_per_bed: number
          room_no: string
          sharing_type: string
          updated_at?: string
        }
        Update: {
          advance_months?: number
          attached_bath?: boolean
          balcony?: boolean
          beds_available?: number
          beds_total?: number
          created_at?: string
          deposit_amount?: number
          description?: string | null
          floor?: number
          hostel_id?: string
          id?: string
          occupied_bed_numbers?: number[]
          rent_per_bed?: number
          room_no?: string
          sharing_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rooms_hostel_id_fkey"
            columns: ["hostel_id"]
            isOneToOne: false
            referencedRelation: "hostels"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          joining_date: string | null
          monthly_fee: number | null
          name: string | null
          owner_id: string | null
          per_day_cost: number | null
          phone: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          joining_date?: string | null
          monthly_fee?: number | null
          name?: string | null
          owner_id?: string | null
          per_day_cost?: number | null
          phone?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          joining_date?: string | null
          monthly_fee?: number | null
          name?: string | null
          owner_id?: string | null
          per_day_cost?: number | null
          phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacations: {
        Row: {
          end_date: string | null
          id: string
          month: string | null
          start_date: string | null
          student_id: string | null
          total_days: number | null
        }
        Insert: {
          end_date?: string | null
          id?: string
          month?: string | null
          start_date?: string | null
          student_id?: string | null
          total_days?: number | null
        }
        Update: {
          end_date?: string | null
          id?: string
          month?: string | null
          start_date?: string | null
          student_id?: string | null
          total_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vacations_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_and_book_bed: {
        Args: {
          _bed_number: number
          _hostel_id: string
          _move_in_date: string
          _notes?: string
          _rent_per_bed: number
          _room_id: string
          _user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "student" | "owner" | "admin"
      hostel_type: "boys" | "girls" | "co-ed"
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
    Enums: {
      app_role: ["student", "owner", "admin"],
      hostel_type: ["boys", "girls", "co-ed"],
    },
  },
} as const
