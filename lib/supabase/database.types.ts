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
      ads: {
        Row: {
          campaign_id: string
          copy_data: Json | null
          created_at: string
          creative_data: Json | null
          id: string
          meta_ad_id: string | null
          metrics_snapshot: Json | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          copy_data?: Json | null
          created_at?: string
          creative_data?: Json | null
          id?: string
          meta_ad_id?: string | null
          metrics_snapshot?: Json | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          copy_data?: Json | null
          created_at?: string
          creative_data?: Json | null
          id?: string
          meta_ad_id?: string | null
          metrics_snapshot?: Json | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      audience_sets: {
        Row: {
          ai_targeting_enabled: boolean
          campaign_id: string
          config_json: Json
          created_at: string
          id: string
          is_test: boolean
        }
        Insert: {
          ai_targeting_enabled?: boolean
          campaign_id: string
          config_json?: Json
          created_at?: string
          id?: string
          is_test?: boolean
        }
        Update: {
          ai_targeting_enabled?: boolean
          campaign_id?: string
          config_json?: Json
          created_at?: string
          id?: string
          is_test?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "audience_sets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_meta_connections: {
        Row: {
          ad_account_currency_code: string | null
          ad_account_payment_connected: boolean
          admin_ad_account_raw_json: Json | null
          admin_ad_account_role: string | null
          admin_ad_account_users_json: Json | null
          admin_business_raw_json: Json | null
          admin_business_role: string | null
          admin_business_users_json: Json | null
          admin_checked_at: string | null
          admin_connected: boolean
          campaign_id: string
          created_at: string
          fb_user_id: string | null
          id: string
          long_lived_user_token: string | null
          selected_ad_account_id: string | null
          selected_ad_account_name: string | null
          selected_business_id: string | null
          selected_business_name: string | null
          selected_ig_user_id: string | null
          selected_ig_username: string | null
          selected_page_access_token: string | null
          selected_page_id: string | null
          selected_page_name: string | null
          token_expires_at: string | null
          updated_at: string
          user_app_connected: boolean
          user_app_fb_user_id: string | null
          user_app_token: string | null
          user_app_token_expires_at: string | null
          user_id: string
        }
        Insert: {
          ad_account_currency_code?: string | null
          ad_account_payment_connected?: boolean
          admin_ad_account_raw_json?: Json | null
          admin_ad_account_role?: string | null
          admin_ad_account_users_json?: Json | null
          admin_business_raw_json?: Json | null
          admin_business_role?: string | null
          admin_business_users_json?: Json | null
          admin_checked_at?: string | null
          admin_connected?: boolean
          campaign_id: string
          created_at?: string
          fb_user_id?: string | null
          id?: string
          long_lived_user_token?: string | null
          selected_ad_account_id?: string | null
          selected_ad_account_name?: string | null
          selected_business_id?: string | null
          selected_business_name?: string | null
          selected_ig_user_id?: string | null
          selected_ig_username?: string | null
          selected_page_access_token?: string | null
          selected_page_id?: string | null
          selected_page_name?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_app_connected?: boolean
          user_app_fb_user_id?: string | null
          user_app_token?: string | null
          user_app_token_expires_at?: string | null
          user_id: string
        }
        Update: {
          ad_account_currency_code?: string | null
          ad_account_payment_connected?: boolean
          admin_ad_account_raw_json?: Json | null
          admin_ad_account_role?: string | null
          admin_ad_account_users_json?: Json | null
          admin_business_raw_json?: Json | null
          admin_business_role?: string | null
          admin_business_users_json?: Json | null
          admin_checked_at?: string | null
          admin_connected?: boolean
          campaign_id?: string
          created_at?: string
          fb_user_id?: string | null
          id?: string
          long_lived_user_token?: string | null
          selected_ad_account_id?: string | null
          selected_ad_account_name?: string | null
          selected_business_id?: string | null
          selected_business_name?: string | null
          selected_ig_user_id?: string | null
          selected_ig_username?: string | null
          selected_page_access_token?: string | null
          selected_page_id?: string | null
          selected_page_name?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_app_connected?: boolean
          user_app_fb_user_id?: string | null
          user_app_token?: string | null
          user_app_token_expires_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_meta_connections_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
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
      campaign_meta_links: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          meta_account_id: string
          payment_connected: boolean
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          meta_account_id: string
          payment_connected?: boolean
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          meta_account_id?: string
          payment_connected?: boolean
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_meta_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_meta_links_meta_account_id_fkey"
            columns: ["meta_account_id"]
            isOneToOne: false
            referencedRelation: "meta_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_meta_links_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics_cache: {
        Row: {
          cached_at: string
          campaign_id: string
          clicks: number | null
          cost_per_result: number | null
          cpc: number | null
          cpm: number | null
          created_at: string
          ctr: number | null
          date_end: string
          date_start: string
          id: string
          impressions: number | null
          range_key: string
          reach: number | null
          results: number | null
          spend: number | null
        }
        Insert: {
          cached_at?: string
          campaign_id: string
          clicks?: number | null
          cost_per_result?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date_end: string
          date_start: string
          id?: string
          impressions?: number | null
          range_key?: string
          reach?: number | null
          results?: number | null
          spend?: number | null
        }
        Update: {
          cached_at?: string
          campaign_id?: string
          clicks?: number | null
          cost_per_result?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string
          ctr?: number | null
          date_end?: string
          date_start?: string
          id?: string
          impressions?: number | null
          range_key?: string
          reach?: number | null
          results?: number | null
          spend?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_cache_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
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
          publish_data: Json | null
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
          publish_data?: Json | null
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
          publish_data?: Json | null
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
          initial_goal: string | null
          last_metrics_sync_at: string | null
          metadata: Json | null
          name: string
          published_status: string | null
          status: string | null
          total_steps: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_step?: number | null
          id?: string
          initial_goal?: string | null
          last_metrics_sync_at?: string | null
          metadata?: Json | null
          name: string
          published_status?: string | null
          status?: string | null
          total_steps?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_step?: number | null
          id?: string
          initial_goal?: string | null
          last_metrics_sync_at?: string | null
          metadata?: Json | null
          name?: string
          published_status?: string | null
          status?: string | null
          total_steps?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      copy_variants: {
        Row: {
          campaign_id: string
          created_at: string
          cta: string | null
          headline: string | null
          id: string
          is_primary: boolean
          primary_text: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          cta?: string | null
          headline?: string | null
          id?: string
          is_primary?: boolean
          primary_text?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          cta?: string | null
          headline?: string | null
          id?: string
          is_primary?: boolean
          primary_text?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "copy_variants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_variants: {
        Row: {
          asset_id: string | null
          campaign_id: string
          created_at: string
          id: string
          is_primary: boolean
          status: string
          url: string | null
        }
        Insert: {
          asset_id?: string | null
          campaign_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          status?: string
          url?: string | null
        }
        Update: {
          asset_id?: string | null
          campaign_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          status?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_variants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_webhooks: {
        Row: {
          active: boolean
          campaign_id: string
          created_at: string
          events: string[]
          id: string
          last_error_message: string | null
          last_status_code: number | null
          last_triggered_at: string | null
          secret_key: string | null
          updated_at: string
          webhook_url: string
        }
        Insert: {
          active?: boolean
          campaign_id: string
          created_at?: string
          events?: string[]
          id?: string
          last_error_message?: string | null
          last_status_code?: number | null
          last_triggered_at?: string | null
          secret_key?: string | null
          updated_at?: string
          webhook_url: string
        }
        Update: {
          active?: boolean
          campaign_id?: string
          created_at?: string
          events?: string[]
          id?: string
          last_error_message?: string | null
          last_status_code?: number | null
          last_triggered_at?: string | null
          secret_key?: string | null
          updated_at?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhooks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      experiment_variants: {
        Row: {
          created_at: string
          experiment_id: string
          id: string
          label: string
          meta_ad_id: string | null
          meta_adset_id: string | null
          payload_json: Json
          status: string
          type: string
        }
        Insert: {
          created_at?: string
          experiment_id: string
          id?: string
          label: string
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          payload_json?: Json
          status?: string
          type: string
        }
        Update: {
          created_at?: string
          experiment_id?: string
          id?: string
          label?: string
          meta_ad_id?: string | null
          meta_adset_id?: string | null
          payload_json?: Json
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiment_variants_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
        ]
      }
      experiments: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          meta_business_id: string | null
          meta_study_id: string | null
          status: string
          type: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          meta_business_id?: string | null
          meta_study_id?: string | null
          status?: string
          type: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          meta_business_id?: string | null
          meta_study_id?: string | null
          status?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      insights_snapshots: {
        Row: {
          campaign_id: string
          experiment_id: string | null
          id: string
          metrics_json: Json
          range_end: string
          range_start: string
          source: string
          variant_id: string | null
        }
        Insert: {
          campaign_id: string
          experiment_id?: string | null
          id?: string
          metrics_json?: Json
          range_end: string
          range_start: string
          source?: string
          variant_id?: string | null
        }
        Update: {
          campaign_id?: string
          experiment_id?: string | null
          id?: string
          metrics_json?: Json
          range_end?: string
          range_start?: string
          source?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insights_snapshots_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_snapshots_experiment_id_fkey"
            columns: ["experiment_id"]
            isOneToOne: false
            referencedRelation: "experiments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insights_snapshots_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "experiment_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_form_submissions: {
        Row: {
          campaign_id: string
          created_at: string
          exported_at: string | null
          form_data: Json
          id: string
          meta_form_id: string
          meta_lead_id: string
          submitted_at: string
          webhook_sent: boolean
          webhook_sent_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          exported_at?: string | null
          form_data?: Json
          id?: string
          meta_form_id: string
          meta_lead_id: string
          submitted_at: string
          webhook_sent?: boolean
          webhook_sent_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          exported_at?: string | null
          form_data?: Json
          id?: string
          meta_form_id?: string
          meta_lead_id?: string
          submitted_at?: string
          webhook_sent?: boolean
          webhook_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_form_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign_id: string
          form_id: string | null
          id: string
          payload_json: Json
          submitted_at: string
          variant_id: string | null
        }
        Insert: {
          campaign_id: string
          form_id?: string | null
          id?: string
          payload_json?: Json
          submitted_at?: string
          variant_id?: string | null
        }
        Update: {
          campaign_id?: string
          form_id?: string | null
          id?: string
          payload_json?: Json
          submitted_at?: string
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "experiment_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      location_sets: {
        Row: {
          campaign_id: string
          created_at: string
          geojson: Json
          id: string
          is_test: boolean
          name: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          geojson?: Json
          id?: string
          is_test?: boolean
          name?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          geojson?: Json
          id?: string
          is_test?: boolean
          name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "location_sets_campaign_id_fkey"
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
      messages_backup_invalid_parts: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string | null
          parts: Json | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          parts?: Json | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string | null
          parts?: Json | null
        }
        Relationships: []
      }
      meta_accounts: {
        Row: {
          ad_account_id: string
          ad_account_name: string | null
          admin_ad_account_role: string | null
          admin_business_role: string | null
          business_id: string | null
          business_name: string | null
          created_at: string
          currency: string | null
          fb_user_id: string | null
          funding_last_checked_at: string | null
          id: string
          ig_user_id: string | null
          ig_username: string | null
          page_id: string | null
          page_name: string | null
          payment_connected: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          ad_account_id: string
          ad_account_name?: string | null
          admin_ad_account_role?: string | null
          admin_business_role?: string | null
          business_id?: string | null
          business_name?: string | null
          created_at?: string
          currency?: string | null
          fb_user_id?: string | null
          funding_last_checked_at?: string | null
          id?: string
          ig_user_id?: string | null
          ig_username?: string | null
          page_id?: string | null
          page_name?: string | null
          payment_connected?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          ad_account_id?: string
          ad_account_name?: string | null
          admin_ad_account_role?: string | null
          admin_business_role?: string | null
          business_id?: string | null
          business_name?: string | null
          created_at?: string
          currency?: string | null
          fb_user_id?: string | null
          funding_last_checked_at?: string | null
          id?: string
          ig_user_id?: string | null
          ig_username?: string | null
          page_id?: string | null
          page_name?: string | null
          payment_connected?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_published_campaigns: {
        Row: {
          campaign_id: string
          created_at: string
          error_message: string | null
          id: string
          meta_ad_ids: string[]
          meta_adset_id: string
          meta_campaign_id: string
          paused_at: string | null
          publish_status: string
          published_at: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          meta_ad_ids?: string[]
          meta_adset_id: string
          meta_campaign_id: string
          paused_at?: string | null
          publish_status?: string
          published_at?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          meta_ad_ids?: string[]
          meta_adset_id?: string
          meta_campaign_id?: string
          paused_at?: string | null
          publish_status?: string
          published_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_published_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_tokens: {
        Row: {
          app_id: string
          created_at: string
          expires_at: string | null
          id: string
          scopes: string[] | null
          token: string
          token_type: Database["public"]["Enums"]["meta_token_type"]
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
          token_type: Database["public"]["Enums"]["meta_token_type"]
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
          token_type?: Database["public"]["Enums"]["meta_token_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      view_meta_connection_summary: {
        Row: {
          ad_account_payment_connected: boolean | null
          admin_ad_account_role: string | null
          admin_business_role: string | null
          campaign_id: string | null
          currency: string | null
          selected_ad_account_id: string | null
          selected_ad_account_name: string | null
          selected_business_id: string | null
          selected_business_name: string | null
          selected_ig_user_id: string | null
          selected_ig_username: string | null
          selected_page_id: string | null
          selected_page_name: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_meta_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      delete_expired_temp_prompts: { Args: never; Returns: undefined }
      set_funding_status: {
        Args: { p_has_funding: boolean; p_status: string }
        Returns: undefined
      }
    }
    Enums: {
      meta_token_type: "system" | "user"
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

