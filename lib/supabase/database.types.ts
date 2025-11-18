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
      ad_budgets: {
        Row: {
          ad_id: string
          created_at: string
          currency_code: string
          daily_budget_cents: number
          end_date: string | null
          id: string
          start_date: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          ad_id: string
          created_at?: string
          currency_code?: string
          daily_budget_cents: number
          end_date?: string | null
          id?: string
          start_date?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          ad_id?: string
          created_at?: string
          currency_code?: string
          daily_budget_cents?: number
          end_date?: string | null
          id?: string
          start_date?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_budgets_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: true
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_copy_variations: {
        Row: {
          ad_id: string
          created_at: string
          cta_text: string
          cta_type: string | null
          description: string | null
          generation_prompt: string | null
          headline: string
          id: string
          is_selected: boolean | null
          overlay_body: string | null
          overlay_density: string | null
          overlay_headline: string | null
          overlay_offer: string | null
          primary_text: string
          sort_order: number | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          cta_text: string
          cta_type?: string | null
          description?: string | null
          generation_prompt?: string | null
          headline: string
          id?: string
          is_selected?: boolean | null
          overlay_body?: string | null
          overlay_density?: string | null
          overlay_headline?: string | null
          overlay_offer?: string | null
          primary_text: string
          sort_order?: number | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          cta_text?: string
          cta_type?: string | null
          description?: string | null
          generation_prompt?: string | null
          headline?: string
          id?: string
          is_selected?: boolean | null
          overlay_body?: string | null
          overlay_density?: string | null
          overlay_headline?: string | null
          overlay_offer?: string | null
          primary_text?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_copy_variations_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_creatives: {
        Row: {
          ad_id: string
          created_at: string
          creative_format: string
          creative_style: string | null
          gradient_class: string | null
          id: string
          image_url: string
          is_base_image: boolean | null
          sort_order: number | null
          variation_label: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          creative_format: string
          creative_style?: string | null
          gradient_class?: string | null
          id?: string
          image_url: string
          is_base_image?: boolean | null
          sort_order?: number | null
          variation_label?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          creative_format?: string
          creative_style?: string | null
          gradient_class?: string | null
          id?: string
          image_url?: string
          is_base_image?: boolean | null
          sort_order?: number | null
          variation_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_creatives_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_destinations: {
        Row: {
          ad_id: string
          created_at: string
          destination_type: string
          display_link: string | null
          id: string
          instant_form_id: string | null
          phone_country_code: string | null
          phone_formatted: string | null
          phone_number: string | null
          updated_at: string
          utm_params: Json | null
          website_url: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          destination_type: string
          display_link?: string | null
          id?: string
          instant_form_id?: string | null
          phone_country_code?: string | null
          phone_formatted?: string | null
          phone_number?: string | null
          updated_at?: string
          utm_params?: Json | null
          website_url?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          destination_type?: string
          display_link?: string | null
          id?: string
          instant_form_id?: string | null
          phone_country_code?: string | null
          phone_formatted?: string | null
          phone_number?: string | null
          updated_at?: string
          utm_params?: Json | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_destinations_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: true
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_publishing_metadata: {
        Row: {
          ad_id: string
          created_at: string | null
          current_status: Database["public"]["Enums"]["ad_status_enum"] | null
          error_code: string | null
          error_details: Json | null
          error_message: string | null
          error_user_message: string | null
          id: string
          last_status_check: string | null
          max_retries: number | null
          meta_ad_id: string | null
          meta_review_feedback: Json | null
          previous_status: Database["public"]["Enums"]["ad_status_enum"] | null
          rejection_reasons: string[] | null
          retry_count: number | null
          status_changed_at: string | null
          status_history: Json | null
          submission_timestamp: string | null
          updated_at: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string | null
          current_status?: Database["public"]["Enums"]["ad_status_enum"] | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          error_user_message?: string | null
          id?: string
          last_status_check?: string | null
          max_retries?: number | null
          meta_ad_id?: string | null
          meta_review_feedback?: Json | null
          previous_status?: Database["public"]["Enums"]["ad_status_enum"] | null
          rejection_reasons?: string[] | null
          retry_count?: number | null
          status_changed_at?: string | null
          status_history?: Json | null
          submission_timestamp?: string | null
          updated_at?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string | null
          current_status?: Database["public"]["Enums"]["ad_status_enum"] | null
          error_code?: string | null
          error_details?: Json | null
          error_message?: string | null
          error_user_message?: string | null
          id?: string
          last_status_check?: string | null
          max_retries?: number | null
          meta_ad_id?: string | null
          meta_review_feedback?: Json | null
          previous_status?: Database["public"]["Enums"]["ad_status_enum"] | null
          rejection_reasons?: string[] | null
          retry_count?: number | null
          status_changed_at?: string | null
          status_history?: Json | null
          submission_timestamp?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_publishing_metadata_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: true
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_status_transitions: {
        Row: {
          ad_id: string
          from_status: Database["public"]["Enums"]["ad_status_enum"] | null
          id: string
          metadata: Json | null
          notes: string | null
          to_status: Database["public"]["Enums"]["ad_status_enum"]
          transitioned_at: string | null
          trigger_details: Json | null
          triggered_by: string | null
        }
        Insert: {
          ad_id: string
          from_status?: Database["public"]["Enums"]["ad_status_enum"] | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          to_status: Database["public"]["Enums"]["ad_status_enum"]
          transitioned_at?: string | null
          trigger_details?: Json | null
          triggered_by?: string | null
        }
        Update: {
          ad_id?: string
          from_status?: Database["public"]["Enums"]["ad_status_enum"] | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          to_status?: Database["public"]["Enums"]["ad_status_enum"]
          transitioned_at?: string | null
          trigger_details?: Json | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_status_transitions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_target_locations: {
        Row: {
          ad_id: string
          bbox: Json | null
          created_at: string
          geometry: Json | null
          id: string
          inclusion_mode: string
          latitude: number | null
          location_name: string
          location_type: string
          longitude: number | null
          meta_location_key: string | null
          radius_km: number | null
        }
        Insert: {
          ad_id: string
          bbox?: Json | null
          created_at?: string
          geometry?: Json | null
          id?: string
          inclusion_mode?: string
          latitude?: number | null
          location_name: string
          location_type: string
          longitude?: number | null
          meta_location_key?: string | null
          radius_km?: number | null
        }
        Update: {
          ad_id?: string
          bbox?: Json | null
          created_at?: string
          geometry?: Json | null
          id?: string
          inclusion_mode?: string
          latitude?: number | null
          location_name?: string
          location_type?: string
          longitude?: number | null
          meta_location_key?: string | null
          radius_km?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_target_locations_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          approved_at: string | null
          campaign_id: string
          completed_steps: Json | null
          created_at: string
          destination_type: string | null
          id: string
          last_error: Json | null
          meta_ad_id: string | null
          meta_review_status: string
          metrics_snapshot: Json | null
          name: string
          published_at: string | null
          rejected_at: string | null
          selected_copy_id: string | null
          selected_creative_id: string | null
          status: Database["public"]["Enums"]["ad_status_enum"]
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          campaign_id: string
          completed_steps?: Json | null
          created_at?: string
          destination_type?: string | null
          id?: string
          last_error?: Json | null
          meta_ad_id?: string | null
          meta_review_status?: string
          metrics_snapshot?: Json | null
          name: string
          published_at?: string | null
          rejected_at?: string | null
          selected_copy_id?: string | null
          selected_creative_id?: string | null
          status?: Database["public"]["Enums"]["ad_status_enum"]
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          campaign_id?: string
          completed_steps?: Json | null
          created_at?: string
          destination_type?: string | null
          id?: string
          last_error?: Json | null
          meta_ad_id?: string | null
          meta_review_status?: string
          metrics_snapshot?: Json | null
          name?: string
          published_at?: string | null
          rejected_at?: string | null
          selected_copy_id?: string | null
          selected_creative_id?: string | null
          status?: Database["public"]["Enums"]["ad_status_enum"]
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
          {
            foreignKeyName: "ads_selected_copy_id_fkey"
            columns: ["selected_copy_id"]
            isOneToOne: false
            referencedRelation: "ad_copy_variations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_selected_creative_id_fkey"
            columns: ["selected_creative_id"]
            isOneToOne: false
            referencedRelation: "ad_creatives"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_allocations: {
        Row: {
          actual_spend: number | null
          ad_id: string
          campaign_id: string
          confidence_score: number | null
          created_at: string
          id: string
          last_synced_at: string | null
          reason_code: string | null
          recommended_budget: number
          status: string | null
          updated_at: string
        }
        Insert: {
          actual_spend?: number | null
          ad_id: string
          campaign_id: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          reason_code?: string | null
          recommended_budget: number
          status?: string | null
          updated_at?: string
        }
        Update: {
          actual_spend?: number | null
          ad_id?: string
          campaign_id?: string
          confidence_score?: number | null
          created_at?: string
          id?: string
          last_synced_at?: string | null
          reason_code?: string | null
          recommended_budget?: number
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_allocations_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_allocations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_audit_log: {
        Row: {
          action: string
          campaign_id: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          campaign_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          campaign_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_audit_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          connection_status: string | null
          created_at: string
          fb_user_id: string | null
          id: string
          last_verified_at: string | null
          long_lived_user_token: string | null
          payment_status: string | null
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
          connection_status?: string | null
          created_at?: string
          fb_user_id?: string | null
          id?: string
          last_verified_at?: string | null
          long_lived_user_token?: string | null
          payment_status?: string | null
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
          connection_status?: string | null
          created_at?: string
          fb_user_id?: string | null
          id?: string
          last_verified_at?: string | null
          long_lived_user_token?: string | null
          payment_status?: string | null
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
      campaigns: {
        Row: {
          ai_conversation_id: string | null
          budget_status: string | null
          budget_strategy: string | null
          campaign_budget: number | null
          campaign_budget_cents: number | null
          created_at: string | null
          currency_code: string
          id: string
          initial_goal: string | null
          last_metrics_sync_at: string | null
          metadata: Json | null
          name: string
          published_status: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          ai_conversation_id?: string | null
          budget_status?: string | null
          budget_strategy?: string | null
          campaign_budget?: number | null
          campaign_budget_cents?: number | null
          created_at?: string | null
          currency_code?: string
          id?: string
          initial_goal?: string | null
          last_metrics_sync_at?: string | null
          metadata?: Json | null
          name: string
          published_status?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          ai_conversation_id?: string | null
          budget_status?: string | null
          budget_strategy?: string | null
          campaign_budget?: number | null
          campaign_budget_cents?: number | null
          created_at?: string | null
          currency_code?: string
          id?: string
          initial_goal?: string | null
          last_metrics_sync_at?: string | null
          metadata?: Json | null
          name?: string
          published_status?: string | null
          status?: string | null
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
      instant_form_fields: {
        Row: {
          created_at: string
          field_label: string
          field_type: string
          form_id: string
          id: string
          is_required: boolean | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          field_label: string
          field_type: string
          form_id: string
          id?: string
          is_required?: boolean | null
          sort_order: number
        }
        Update: {
          created_at?: string
          field_label?: string
          field_type?: string
          form_id?: string
          id?: string
          is_required?: boolean | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "instant_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "instant_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      instant_forms: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          intro_description: string | null
          intro_headline: string
          intro_image_url: string | null
          meta_form_id: string | null
          name: string
          privacy_link_text: string | null
          privacy_policy_url: string
          thank_you_button_text: string | null
          thank_you_button_url: string | null
          thank_you_message: string
          thank_you_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          intro_description?: string | null
          intro_headline: string
          intro_image_url?: string | null
          meta_form_id?: string | null
          name: string
          privacy_link_text?: string | null
          privacy_policy_url: string
          thank_you_button_text?: string | null
          thank_you_button_url?: string | null
          thank_you_message: string
          thank_you_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          intro_description?: string | null
          intro_headline?: string
          intro_image_url?: string | null
          meta_form_id?: string | null
          name?: string
          privacy_link_text?: string | null
          privacy_policy_url?: string
          thank_you_button_text?: string | null
          thank_you_button_url?: string | null
          thank_you_message?: string
          thank_you_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instant_forms_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instant_forms_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      meta_webhook_events: {
        Row: {
          ad_id: string | null
          campaign_id: string | null
          created_at: string | null
          event_id: string | null
          event_type: string
          id: string
          meta_ad_id: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          processing_error: string | null
          received_at: string | null
          retry_count: number | null
        }
        Insert: {
          ad_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          meta_ad_id?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string | null
          retry_count?: number | null
        }
        Update: {
          ad_id?: string | null
          campaign_id?: string | null
          created_at?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          meta_ad_id?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string | null
          retry_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_webhook_events_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_webhook_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
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
      batch_update_ad_statuses: {
        Args: { p_ad_ids: string[]; p_new_status: string; p_user_id: string }
        Returns: {
          failed_ids: string[]
          updated_count: number
        }[]
      }
      check_campaign_publishing_ready: {
        Args: { p_campaign_id: string; p_user_id: string }
        Returns: {
          is_ready: boolean
          missing_requirements: Json
        }[]
      }
      count_campaign_ads: {
        Args: { p_campaign_id: string; p_status_filter?: string }
        Returns: number
      }
      delete_expired_temp_prompts: { Args: never; Returns: undefined }
      export_campaign_data: {
        Args: { p_campaign_id: string; p_user_id: string }
        Returns: Json
      }
      get_ad_complete_data: {
        Args: { p_ad_id: string; p_user_id: string }
        Returns: {
          ad_data: Json
          campaign_data: Json
          publishing_data: Json
        }[]
      }
      get_campaign_ad_account_id: {
        Args: { p_campaign_id: string }
        Returns: string
      }
      get_campaign_ads_with_status: {
        Args: {
          p_campaign_id: string
          p_status_filter?: string
          p_user_id: string
        }
        Returns: {
          ad_data: Json
          error_message: string
          publishing_status: string
        }[]
      }
      get_campaign_lead_stats: {
        Args: { p_campaign_id: string; p_user_id: string }
        Returns: {
          exported_count: number
          latest_submission: string
          new_leads_24h: number
          total_leads: number
        }[]
      }
      get_campaign_metrics_summary: {
        Args: { p_campaign_id: string; p_range_key?: string; p_user_id: string }
        Returns: {
          last_sync_at: string
          metrics_data: Json
          publish_status: string
        }[]
      }
      get_campaign_token: {
        Args: { p_campaign_id: string; p_user_id: string }
        Returns: string
      }
      get_campaign_with_state: {
        Args: { p_campaign_id: string; p_user_id: string }
        Returns: {
          campaign_data: Json
          state_data: Json
        }[]
      }
      get_conversation_with_messages: {
        Args: {
          p_conversation_id: string
          p_message_limit?: number
          p_user_id: string
        }
        Returns: {
          conversation_data: Json
          messages_data: Json
        }[]
      }
      get_latest_metrics: {
        Args: { p_campaign_id: string; p_range_key: string }
        Returns: Json
      }
      get_meta_connection_status: {
        Args: { p_campaign_id: string; p_user_id: string }
        Returns: {
          ad_account_id: string
          admin_connected: boolean
          connection_status: string
          payment_connected: boolean
          user_app_connected: boolean
        }[]
      }
      get_user_campaigns_summary: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          ad_count: number
          campaign_data: Json
          state_data: Json
        }[]
      }
      record_ad_status_transition: {
        Args: {
          p_ad_id: string
          p_from_status: string
          p_metadata?: Json
          p_notes?: string
          p_to_status: string
          p_triggered_by: string
        }
        Returns: string
      }
      set_funding_status: {
        Args: { p_has_funding: boolean; p_status: string }
        Returns: undefined
      }
      update_ad_status: {
        Args: {
          p_ad_id: string
          p_new_status: string
          p_notes?: string
          p_triggered_by?: string
        }
        Returns: boolean
      }
      user_owns_campaign: {
        Args: { p_campaign_id: string; p_user_id: string }
        Returns: boolean
      }
      verify_campaign_ownership: {
        Args: { p_campaign_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      ad_status_enum:
        | "draft"
        | "pending_review"
        | "active"
        | "paused"
        | "rejected"
        | "failed"
        | "learning"
        | "archived"
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
      ad_status_enum: [
        "draft",
        "pending_review",
        "active",
        "paused",
        "rejected",
        "failed",
        "learning",
        "archived",
      ],
      meta_token_type: ["system", "user"],
    },
  },
} as const

