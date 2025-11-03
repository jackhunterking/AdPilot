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
      campaign_states: {
        Row: {
          ad_copy_data: Json | null
          ad_preview_data: Json | null
          audience_data: Json | null
          budget_data: Json | null
          campaign_id: string | null
          generated_images: Json | null
          goal_data: Json | null
          id: string
          location_data: Json | null
          meta_connect_data: Json | null
          updated_at: string | null
        }
        Insert: {
          ad_copy_data?: Json | null
          ad_preview_data?: Json | null
          audience_data?: Json | null
          budget_data?: Json | null
          campaign_id?: string | null
          generated_images?: Json | null
          goal_data?: Json | null
          id?: string
          location_data?: Json | null
          meta_connect_data?: Json | null
          updated_at?: string | null
        }
        Update: {
          ad_copy_data?: Json | null
          ad_preview_data?: Json | null
          audience_data?: Json | null
          budget_data?: Json | null
          campaign_id?: string | null
          generated_images?: Json | null
          goal_data?: Json | null
          id?: string
          location_data?: Json | null
          meta_connect_data?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_states_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string | null
          current_step: number | null
          id: string
          metadata: Json | null
          name: string
          status: string | null
          total_steps: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_step?: number | null
          id?: string
          metadata?: Json | null
          name: string
          status?: string | null
          total_steps?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_step?: number | null
          id?: string
          metadata?: Json | null
          name?: string
          status?: string | null
          total_steps?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      campaign_meta_connections: {
        Row: {
          id: string
          campaign_id: string
          user_id: string
          fb_user_id: string | null
          long_lived_user_token: string | null
          token_expires_at: string | null
          user_app_token: string | null
          user_app_token_expires_at: string | null
          user_app_connected: boolean
          user_app_fb_user_id: string | null
          selected_business_id: string | null
          selected_business_name: string | null
          selected_page_id: string | null
          selected_page_name: string | null
          selected_page_access_token: string | null
          selected_ig_user_id: string | null
          selected_ig_username: string | null
          selected_ad_account_id: string | null
          selected_ad_account_name: string | null
          ad_account_payment_connected: boolean
          admin_connected: boolean
          admin_checked_at: string | null
          admin_business_role: string | null
          admin_ad_account_role: string | null
          admin_business_users_json: Json | null
          admin_ad_account_users_json: Json | null
          admin_business_raw_json: Json | null
          admin_ad_account_raw_json: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id: string
          fb_user_id?: string | null
          long_lived_user_token?: string | null
          token_expires_at?: string | null
          user_app_token?: string | null
          user_app_token_expires_at?: string | null
          user_app_connected?: boolean
          user_app_fb_user_id?: string | null
          selected_business_id?: string | null
          selected_business_name?: string | null
          selected_page_id?: string | null
          selected_page_name?: string | null
          selected_page_access_token?: string | null
          selected_ig_user_id?: string | null
          selected_ig_username?: string | null
          selected_ad_account_id?: string | null
          selected_ad_account_name?: string | null
          ad_account_payment_connected?: boolean
          admin_connected?: boolean
          admin_checked_at?: string | null
          admin_business_role?: string | null
          admin_ad_account_role?: string | null
          admin_business_users_json?: Json | null
          admin_ad_account_users_json?: Json | null
          admin_business_raw_json?: Json | null
          admin_ad_account_raw_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string
          fb_user_id?: string | null
          long_lived_user_token?: string | null
          token_expires_at?: string | null
          user_app_token?: string | null
          user_app_token_expires_at?: string | null
          user_app_connected?: boolean
          user_app_fb_user_id?: string | null
          selected_business_id?: string | null
          selected_business_name?: string | null
          selected_page_id?: string | null
          selected_page_name?: string | null
          selected_page_access_token?: string | null
          selected_ig_user_id?: string | null
          selected_ig_username?: string | null
          selected_ad_account_id?: string | null
          selected_ad_account_name?: string | null
          ad_account_payment_connected?: boolean
          admin_connected?: boolean
          admin_checked_at?: string | null
          admin_business_role?: string | null
          admin_ad_account_role?: string | null
          admin_business_users_json?: Json | null
          admin_ad_account_users_json?: Json | null
          admin_business_raw_json?: Json | null
          admin_ad_account_raw_json?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_meta_connections_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_meta_connections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ,
      meta_tokens: {
        Row: {
          app_id: string
          created_at: string
          expires_at: string | null
          id: string
          scopes: string[] | null
          token: string
          token_type: "system" | "user"
          updated_at: string
          user_id: string
        }
        Insert: {
          app_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          scopes?: string[] | null
          token: string
          token_type: "system" | "user"
          updated_at?: string
          user_id: string
        }
        Update: {
          app_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          scopes?: string[] | null
          token?: string
          token_type?: "system" | "user"
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ,
      meta_connections: {
        Row: {
          id: string
          user_id: string
          business_id: string
          business_name: string | null
          page_id: string | null
          page_name: string | null
          ad_account_id: string | null
          ad_account_name: string | null
          currency: string | null
          has_funding: boolean
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_id: string
          business_name?: string | null
          page_id?: string | null
          page_name?: string | null
          ad_account_id?: string | null
          ad_account_name?: string | null
          currency?: string | null
          has_funding?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_id?: string
          business_name?: string | null
          page_id?: string | null
          page_name?: string | null
          ad_account_id?: string | null
          ad_account_name?: string | null
          currency?: string | null
          has_funding?: boolean
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ,
      meta_asset_snapshots: {
        Row: {
          id: string
          user_id: string
          business_json: Json | null
          pages_json: Json | null
          ad_accounts_json: Json | null
          captured_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_json?: Json | null
          pages_json?: Json | null
          ad_accounts_json?: Json | null
          captured_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_json?: Json | null
          pages_json?: Json | null
          ad_accounts_json?: Json | null
          captured_at?: string
        }
        Relationships: []
      }
      creative_plans: {
        Row: {
          id: string
          campaign_id: string | null
          plan: Json
          status: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          campaign_id?: string | null
          plan: Json
          status?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string | null
          plan?: Json
          status?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_plans_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_plans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_lint_reports: {
        Row: {
          id: string
          plan_id: string | null
          variation_index: number
          report: Json
          passed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          plan_id?: string | null
          variation_index: number
          report: Json
          passed: boolean
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string | null
          variation_index?: number
          report?: Json
          passed?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_lint_reports_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "creative_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          message_count: number | null
          metadata: Json | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          message_count?: number | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          message_count?: number | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          metadata: Json | null
          parts: Json
          role: string
          seq: number
          tool_invocations: Json | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id: string
          metadata?: Json | null
          parts?: Json
          role: string
          seq?: never
          tool_invocations?: Json | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          parts?: Json
          role?: string
          seq?: never
          tool_invocations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          credits: number
          daily_credits: number
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credits?: number
          daily_credits?: number
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credits?: number
          daily_credits?: number
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      schema_migrations: {
        Row: {
          applied_at: string | null
          description: string | null
          version: number
        }
        Insert: {
          applied_at?: string | null
          description?: string | null
          version: number
        }
        Update: {
          applied_at?: string | null
          description?: string | null
          version?: number
        }
        Relationships: []
      }
      temp_prompts: {
        Row: {
          created_at: string
          expires_at: string
          goal_type: string | null
          id: string
          prompt_text: string
          used: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string
          goal_type?: string | null
          id?: string
          prompt_text: string
          used?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          goal_type?: string | null
          id?: string
          prompt_text?: string
          used?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_expired_temp_prompts: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_image_variations: {
        Args: { p_campaign_id: string; p_generation_batch_id: string }
        Returns: {
          created_at: string
          id: string
          public_url: string
          variation_index: number
          variation_type: string
        }[]
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
    Enums: {
      meta_token_type: ["system", "user"],
    },
  },
} as const
