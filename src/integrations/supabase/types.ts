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
      app_owner: {
        Row: {
          claimed_at: string
          email: string | null
          id: number
          owner_id: string | null
          quota_liters: number
          region: string | null
        }
        Insert: {
          claimed_at?: string
          email?: string | null
          id?: number
          owner_id?: string | null
          quota_liters?: number
          region?: string | null
        }
        Update: {
          claimed_at?: string
          email?: string | null
          id?: number
          owner_id?: string | null
          quota_liters?: number
          region?: string | null
        }
        Relationships: []
      }
      daily_entries: {
        Row: {
          date: string
          fuel_fees: number
          id: string
          income: number
          mileage_start: number
          mileage_stop: number
          other_fees: number
          owner_id: string | null
          trip_end: string | null
          trip_start: string | null
          trip_type: string
          updated_at: string
        }
        Insert: {
          date: string
          fuel_fees?: number
          id: string
          income?: number
          mileage_start?: number
          mileage_stop?: number
          other_fees?: number
          owner_id?: string | null
          trip_end?: string | null
          trip_start?: string | null
          trip_type?: string
          updated_at?: string
        }
        Update: {
          date?: string
          fuel_fees?: number
          id?: string
          income?: number
          mileage_start?: number
          mileage_stop?: number
          other_fees?: number
          owner_id?: string | null
          trip_end?: string | null
          trip_start?: string | null
          trip_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      fuel_fills: {
        Row: {
          cost: number
          created_at: string
          date: string
          id: string
          liters: number
          note: string
          owner_id: string | null
          region: string
          updated_at: string
        }
        Insert: {
          cost?: number
          created_at?: string
          date: string
          id: string
          liters?: number
          note?: string
          owner_id?: string | null
          region?: string
          updated_at?: string
        }
        Update: {
          cost?: number
          created_at?: string
          date?: string
          id?: string
          liters?: number
          note?: string
          owner_id?: string | null
          region?: string
          updated_at?: string
        }
        Relationships: []
      }
      fuel_history: {
        Row: {
          created_at: string
          date: string
          gasoline_92: number
          gasoline_95: number
          id: string
          owner_id: string | null
        }
        Insert: {
          created_at?: string
          date?: string
          gasoline_92?: number
          gasoline_95?: number
          id?: string
          owner_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          gasoline_92?: number
          gasoline_95?: number
          id?: string
          owner_id?: string | null
        }
        Relationships: []
      }
      fuel_prices: {
        Row: {
          id: number
          owner_id: string | null
          price_92: number
          price_95: number
          price_diesel: number
          updated_at: string
        }
        Insert: {
          id?: number
          owner_id?: string | null
          price_92?: number
          price_95?: number
          price_diesel?: number
          updated_at?: string
        }
        Update: {
          id?: number
          owner_id?: string | null
          price_92?: number
          price_95?: number
          price_diesel?: number
          updated_at?: string
        }
        Relationships: []
      }
      maintenance_parts: {
        Row: {
          key: string
          km_interval: number
          label: string
          last_service_date: string
          last_service_mileage: number
          months_interval: number | null
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          key: string
          km_interval?: number
          label: string
          last_service_date: string
          last_service_mileage?: number
          months_interval?: number | null
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          key?: string
          km_interval?: number
          label?: string
          last_service_date?: string
          last_service_mileage?: number
          months_interval?: number | null
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      monthly_inputs: {
        Row: {
          gc: number
          owner_id: string | null
          plastic_income: number
          plastic_outflow: number
          rental_outflow: number
          rental_present: number
          rental_represent: number
          updated_at: string
          ym: string
        }
        Insert: {
          gc?: number
          owner_id?: string | null
          plastic_income?: number
          plastic_outflow?: number
          rental_outflow?: number
          rental_present?: number
          rental_represent?: number
          updated_at?: string
          ym: string
        }
        Update: {
          gc?: number
          owner_id?: string | null
          plastic_income?: number
          plastic_outflow?: number
          rental_outflow?: number
          rental_present?: number
          rental_represent?: number
          updated_at?: string
          ym?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          category: string
          date: string
          id: string
          note: string
          owner_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          category: string
          date: string
          id: string
          note?: string
          owner_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          date?: string
          id?: string
          note?: string
          owner_id?: string | null
          updated_at?: string
        }
        Relationships: []
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
