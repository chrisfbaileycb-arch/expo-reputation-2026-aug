export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      customer_contacts: {
        Row: {
          created_at: string;
          dedup_hash: string;
          email: string | null;
          full_name: string | null;
          id: string;
          last_outreach_at: string | null;
          location_id: string | null;
          metadata: Json;
          organization_id: string;
          phone: string | null;
          source: string;
          transaction_at: string | null;
          unsubscribed_at: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          dedup_hash: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          last_outreach_at?: string | null;
          location_id?: string | null;
          metadata?: Json;
          organization_id: string;
          phone?: string | null;
          source?: string;
          transaction_at?: string | null;
          unsubscribed_at?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          dedup_hash?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          last_outreach_at?: string | null;
          location_id?: string | null;
          metadata?: Json;
          organization_id?: string;
          phone?: string | null;
          source?: string;
          transaction_at?: string | null;
          unsubscribed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "customer_contacts_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "customer_contacts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      feedback_submissions: {
        Row: {
          clicked_public_link: boolean;
          comment: string | null;
          contact_id: string | null;
          created_at: string;
          id: string;
          location_id: string | null;
          organization_id: string;
          outreach_message_id: string | null;
          rating: number;
          routed_to: string;
        };
        Insert: {
          clicked_public_link?: boolean;
          comment?: string | null;
          contact_id?: string | null;
          created_at?: string;
          id?: string;
          location_id?: string | null;
          organization_id: string;
          outreach_message_id?: string | null;
          rating: number;
          routed_to: string;
        };
        Update: {
          clicked_public_link?: boolean;
          comment?: string | null;
          contact_id?: string | null;
          created_at?: string;
          id?: string;
          location_id?: string | null;
          organization_id?: string;
          outreach_message_id?: string | null;
          rating?: number;
          routed_to?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feedback_submissions_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "customer_contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_submissions_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_submissions_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedback_submissions_outreach_message_id_fkey";
            columns: ["outreach_message_id"];
            isOneToOne: false;
            referencedRelation: "outreach_messages";
            referencedColumns: ["id"];
          },
        ];
      };
      gbp_connections: {
        Row: {
          access_token: string;
          connected_by: string | null;
          created_at: string;
          google_email: string;
          id: string;
          last_error: string | null;
          organization_id: string;
          refresh_token: string;
          scopes: string;
          status: string;
          token_expires_at: string;
          updated_at: string;
        };
        Insert: {
          access_token: string;
          connected_by?: string | null;
          created_at?: string;
          google_email: string;
          id?: string;
          last_error?: string | null;
          organization_id: string;
          refresh_token: string;
          scopes: string;
          status?: string;
          token_expires_at: string;
          updated_at?: string;
        };
        Update: {
          access_token?: string;
          connected_by?: string | null;
          created_at?: string;
          google_email?: string;
          id?: string;
          last_error?: string | null;
          organization_id?: string;
          refresh_token?: string;
          scopes?: string;
          status?: string;
          token_expires_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gbp_connections_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      gbp_oauth_states: {
        Row: {
          created_at: string;
          expires_at: string;
          organization_id: string;
          redirect_to: string | null;
          state: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          expires_at?: string;
          organization_id: string;
          redirect_to?: string | null;
          state: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          organization_id?: string;
          redirect_to?: string | null;
          state?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gbp_oauth_states_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          address: string | null;
          city: string | null;
          created_at: string;
          facebook_page_id: string | null;
          gbp_account_id: string | null;
          gbp_connection_id: string | null;
          gbp_location_id: string | null;
          google_place_id: string | null;
          id: string;
          industry: string | null;
          name: string;
          organization_id: string;
          phone: string | null;
          postal_code: string | null;
          region: string | null;
          timezone: string;
          updated_at: string;
          yelp_business_id: string | null;
          yelp_last_polled_at: string | null;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          created_at?: string;
          facebook_page_id?: string | null;
          gbp_account_id?: string | null;
          gbp_connection_id?: string | null;
          gbp_location_id?: string | null;
          google_place_id?: string | null;
          id?: string;
          industry?: string | null;
          name: string;
          organization_id: string;
          phone?: string | null;
          postal_code?: string | null;
          region?: string | null;
          timezone?: string;
          updated_at?: string;
          yelp_business_id?: string | null;
          yelp_last_polled_at?: string | null;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          created_at?: string;
          facebook_page_id?: string | null;
          gbp_account_id?: string | null;
          gbp_connection_id?: string | null;
          gbp_location_id?: string | null;
          google_place_id?: string | null;
          id?: string;
          industry?: string | null;
          name?: string;
          organization_id?: string;
          phone?: string | null;
          postal_code?: string | null;
          region?: string | null;
          timezone?: string;
          updated_at?: string;
          yelp_business_id?: string | null;
          yelp_last_polled_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "locations_gbp_connection_id_fkey";
            columns: ["gbp_connection_id"];
            isOneToOne: false;
            referencedRelation: "gbp_connections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "locations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      manager_action_items: {
        Row: {
          assigned_to: string | null;
          contact_id: string | null;
          created_at: string;
          due_at: string;
          feedback_id: string;
          id: string;
          location_id: string | null;
          organization_id: string;
          resolution_note: string | null;
          resolved_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          assigned_to?: string | null;
          contact_id?: string | null;
          created_at?: string;
          due_at: string;
          feedback_id: string;
          id?: string;
          location_id?: string | null;
          organization_id: string;
          resolution_note?: string | null;
          resolved_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          assigned_to?: string | null;
          contact_id?: string | null;
          created_at?: string;
          due_at?: string;
          feedback_id?: string;
          id?: string;
          location_id?: string | null;
          organization_id?: string;
          resolution_note?: string | null;
          resolved_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "manager_action_items_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "customer_contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "manager_action_items_feedback_id_fkey";
            columns: ["feedback_id"];
            isOneToOne: false;
            referencedRelation: "feedback_submissions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "manager_action_items_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "manager_action_items_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_rules: {
        Row: {
          channel: string;
          created_at: string;
          enabled: boolean;
          event_type: string;
          id: string;
          max_rating: number | null;
          min_rating: number | null;
          organization_id: string;
          recipient: string;
          updated_at: string;
        };
        Insert: {
          channel: string;
          created_at?: string;
          enabled?: boolean;
          event_type: string;
          id?: string;
          max_rating?: number | null;
          min_rating?: number | null;
          organization_id: string;
          recipient: string;
          updated_at?: string;
        };
        Update: {
          channel?: string;
          created_at?: string;
          enabled?: boolean;
          event_type?: string;
          id?: string;
          max_rating?: number | null;
          min_rating?: number | null;
          organization_id?: string;
          recipient?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_rules_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      organizations: {
        Row: {
          billing_status: string;
          contract_ends_at: string | null;
          contract_starts_at: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          plan: Database["public"]["Enums"]["plan_tier"];
          slug: string | null;
          updated_at: string;
        };
        Insert: {
          billing_status?: string;
          contract_ends_at?: string | null;
          contract_starts_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          plan?: Database["public"]["Enums"]["plan_tier"];
          slug?: string | null;
          updated_at?: string;
        };
        Update: {
          billing_status?: string;
          contract_ends_at?: string | null;
          contract_starts_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          plan?: Database["public"]["Enums"]["plan_tier"];
          slug?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      outreach_messages: {
        Row: {
          channel: string;
          contact_id: string;
          created_at: string;
          error: string | null;
          id: string;
          kind: string;
          location_id: string | null;
          organization_id: string;
          provider_message_id: string | null;
          scheduled_for: string;
          sent_at: string | null;
          status: string;
          token: string;
          updated_at: string;
        };
        Insert: {
          channel?: string;
          contact_id: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          kind?: string;
          location_id?: string | null;
          organization_id: string;
          provider_message_id?: string | null;
          scheduled_for?: string;
          sent_at?: string | null;
          status?: string;
          token: string;
          updated_at?: string;
        };
        Update: {
          channel?: string;
          contact_id?: string;
          created_at?: string;
          error?: string | null;
          id?: string;
          kind?: string;
          location_id?: string | null;
          organization_id?: string;
          provider_message_id?: string | null;
          scheduled_for?: string;
          sent_at?: string | null;
          status?: string;
          token?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "outreach_messages_contact_id_fkey";
            columns: ["contact_id"];
            isOneToOne: false;
            referencedRelation: "customer_contacts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outreach_messages_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "outreach_messages_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      policy_violations: {
        Row: {
          ai_rationale: string | null;
          confidence: number | null;
          detected_at: string;
          dismissed: boolean;
          dismissed_reason: string | null;
          id: string;
          organization_id: string;
          platform: Database["public"]["Enums"]["review_platform"];
          policy_code: string;
          policy_title: string;
          policy_url: string | null;
          review_id: string;
          severity: Database["public"]["Enums"]["violation_severity"];
        };
        Insert: {
          ai_rationale?: string | null;
          confidence?: number | null;
          detected_at?: string;
          dismissed?: boolean;
          dismissed_reason?: string | null;
          id?: string;
          organization_id: string;
          platform: Database["public"]["Enums"]["review_platform"];
          policy_code: string;
          policy_title: string;
          policy_url?: string | null;
          review_id: string;
          severity?: Database["public"]["Enums"]["violation_severity"];
        };
        Update: {
          ai_rationale?: string | null;
          confidence?: number | null;
          detected_at?: string;
          dismissed?: boolean;
          dismissed_reason?: string | null;
          id?: string;
          organization_id?: string;
          platform?: Database["public"]["Enums"]["review_platform"];
          policy_code?: string;
          policy_title?: string;
          policy_url?: string | null;
          review_id?: string;
          severity?: Database["public"]["Enums"]["violation_severity"];
        };
        Relationships: [
          {
            foreignKeyName: "policy_violations_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "policy_violations_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      posting_attempts: {
        Row: {
          attempt_number: number;
          created_at: string;
          draft_id: string | null;
          duration_ms: number | null;
          endpoint: string | null;
          error_message: string | null;
          http_status: number | null;
          id: string;
          location_id: string | null;
          organization_id: string;
          platform: string;
          platform_response_id: string | null;
          response_snippet: string | null;
          review_id: string | null;
          success: boolean;
        };
        Insert: {
          attempt_number?: number;
          created_at?: string;
          draft_id?: string | null;
          duration_ms?: number | null;
          endpoint?: string | null;
          error_message?: string | null;
          http_status?: number | null;
          id?: string;
          location_id?: string | null;
          organization_id: string;
          platform: string;
          platform_response_id?: string | null;
          response_snippet?: string | null;
          review_id?: string | null;
          success: boolean;
        };
        Update: {
          attempt_number?: number;
          created_at?: string;
          draft_id?: string | null;
          duration_ms?: number | null;
          endpoint?: string | null;
          error_message?: string | null;
          http_status?: number | null;
          id?: string;
          location_id?: string | null;
          organization_id?: string;
          platform?: string;
          platform_response_id?: string | null;
          response_snippet?: string | null;
          review_id?: string | null;
          success?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "posting_attempts_draft_id_fkey";
            columns: ["draft_id"];
            isOneToOne: false;
            referencedRelation: "response_drafts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posting_attempts_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posting_attempts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "posting_attempts_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      removal_requests: {
        Row: {
          appeal_body: string;
          created_at: string;
          id: string;
          organization_id: string;
          outcome_notes: string | null;
          platform: Database["public"]["Enums"]["review_platform"];
          responded_at: string | null;
          review_id: string;
          status: Database["public"]["Enums"]["removal_status"];
          submission_url: string | null;
          submitted_at: string | null;
          submitted_by: string | null;
          updated_at: string;
          violation_id: string | null;
        };
        Insert: {
          appeal_body: string;
          created_at?: string;
          id?: string;
          organization_id: string;
          outcome_notes?: string | null;
          platform: Database["public"]["Enums"]["review_platform"];
          responded_at?: string | null;
          review_id: string;
          status?: Database["public"]["Enums"]["removal_status"];
          submission_url?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          updated_at?: string;
          violation_id?: string | null;
        };
        Update: {
          appeal_body?: string;
          created_at?: string;
          id?: string;
          organization_id?: string;
          outcome_notes?: string | null;
          platform?: Database["public"]["Enums"]["review_platform"];
          responded_at?: string | null;
          review_id?: string;
          status?: Database["public"]["Enums"]["removal_status"];
          submission_url?: string | null;
          submitted_at?: string | null;
          submitted_by?: string | null;
          updated_at?: string;
          violation_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "removal_requests_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "removal_requests_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "removal_requests_violation_id_fkey";
            columns: ["violation_id"];
            isOneToOne: false;
            referencedRelation: "policy_violations";
            referencedColumns: ["id"];
          },
        ];
      };
      request_campaigns: {
        Row: {
          channel: string;
          clicked_count: number;
          created_at: string;
          created_by: string | null;
          id: string;
          location_id: string | null;
          message_template: string;
          name: string;
          organization_id: string;
          scheduled_at: string | null;
          sent_count: number;
          status: string;
          updated_at: string;
        };
        Insert: {
          channel?: string;
          clicked_count?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          location_id?: string | null;
          message_template: string;
          name: string;
          organization_id: string;
          scheduled_at?: string | null;
          sent_count?: number;
          status?: string;
          updated_at?: string;
        };
        Update: {
          channel?: string;
          clicked_count?: number;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          location_id?: string | null;
          message_template?: string;
          name?: string;
          organization_id?: string;
          scheduled_at?: string | null;
          sent_count?: number;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "request_campaigns_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "request_campaigns_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      response_drafts: {
        Row: {
          created_at: string;
          draft_body: string;
          id: string;
          last_post_attempt_at: string | null;
          model_used: string | null;
          organization_id: string;
          platform: string;
          platform_response_id: string | null;
          post_attempts: number;
          post_error: string | null;
          posted_at: string | null;
          posted_by: string | null;
          rejection_reason: string | null;
          review_id: string;
          scheduled_post_at: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          draft_body: string;
          id?: string;
          last_post_attempt_at?: string | null;
          model_used?: string | null;
          organization_id: string;
          platform: string;
          platform_response_id?: string | null;
          post_attempts?: number;
          post_error?: string | null;
          posted_at?: string | null;
          posted_by?: string | null;
          rejection_reason?: string | null;
          review_id: string;
          scheduled_post_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          draft_body?: string;
          id?: string;
          last_post_attempt_at?: string | null;
          model_used?: string | null;
          organization_id?: string;
          platform?: string;
          platform_response_id?: string | null;
          post_attempts?: number;
          post_error?: string | null;
          posted_at?: string | null;
          posted_by?: string | null;
          rejection_reason?: string | null;
          review_id?: string;
          scheduled_post_at?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "response_drafts_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "response_drafts_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      response_policies: {
        Row: {
          auto_post_delay_minutes: number;
          auto_post_min_rating: number;
          brand_voice: string;
          created_at: string;
          enabled: boolean;
          id: string;
          organization_id: string;
          require_approval_max_rating: number;
          signature: string | null;
          updated_at: string;
        };
        Insert: {
          auto_post_delay_minutes?: number;
          auto_post_min_rating?: number;
          brand_voice?: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          organization_id: string;
          require_approval_max_rating?: number;
          signature?: string | null;
          updated_at?: string;
        };
        Update: {
          auto_post_delay_minutes?: number;
          auto_post_min_rating?: number;
          brand_voice?: string;
          created_at?: string;
          enabled?: boolean;
          id?: string;
          organization_id?: string;
          require_approval_max_rating?: number;
          signature?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "response_policies_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      review_responses: {
        Row: {
          ai_generated: boolean;
          body: string;
          created_at: string;
          created_by: string | null;
          id: string;
          organization_id: string;
          published_at: string | null;
          review_id: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          ai_generated?: boolean;
          body: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization_id: string;
          published_at?: string | null;
          review_id: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          ai_generated?: boolean;
          body?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          organization_id?: string;
          published_at?: string | null;
          review_id?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_responses_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_responses_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: false;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          author_avatar_url: string | null;
          author_name: string | null;
          body: string | null;
          created_at: string;
          id: string;
          imported_at: string;
          language: string | null;
          location_id: string;
          organization_id: string;
          platform: Database["public"]["Enums"]["review_platform"];
          platform_review_id: string | null;
          posted_at: string | null;
          rating: number | null;
          source_review_id: string | null;
          source_url: string | null;
          status: Database["public"]["Enums"]["review_status"];
          updated_at: string;
        };
        Insert: {
          author_avatar_url?: string | null;
          author_name?: string | null;
          body?: string | null;
          created_at?: string;
          id?: string;
          imported_at?: string;
          language?: string | null;
          location_id: string;
          organization_id: string;
          platform: Database["public"]["Enums"]["review_platform"];
          platform_review_id?: string | null;
          posted_at?: string | null;
          rating?: number | null;
          source_review_id?: string | null;
          source_url?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
        };
        Update: {
          author_avatar_url?: string | null;
          author_name?: string | null;
          body?: string | null;
          created_at?: string;
          id?: string;
          imported_at?: string;
          language?: string | null;
          location_id?: string;
          organization_id?: string;
          platform?: Database["public"]["Enums"]["review_platform"];
          platform_review_id?: string | null;
          posted_at?: string | null;
          rating?: number | null;
          source_review_id?: string | null;
          source_url?: string | null;
          status?: Database["public"]["Enums"]["review_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_readiness: {
        Row: {
          created_at: string;
          eligibility_checked_at: string | null;
          eligibility_notes: string | null;
          eligibility_status: string;
          last_price_batch_at: string | null;
          last_price_batch_result: Json;
          llc_checklist: Json;
          organization_id: string;
          payments_enabled: boolean;
          payments_enabled_at: string | null;
          updated_at: string;
          webhook_enforcement_active: boolean;
          webhook_last_event_at: string | null;
          webhook_notes: string | null;
        };
        Insert: {
          created_at?: string;
          eligibility_checked_at?: string | null;
          eligibility_notes?: string | null;
          eligibility_status?: string;
          last_price_batch_at?: string | null;
          last_price_batch_result?: Json;
          llc_checklist?: Json;
          organization_id: string;
          payments_enabled?: boolean;
          payments_enabled_at?: string | null;
          updated_at?: string;
          webhook_enforcement_active?: boolean;
          webhook_last_event_at?: string | null;
          webhook_notes?: string | null;
        };
        Update: {
          created_at?: string;
          eligibility_checked_at?: string | null;
          eligibility_notes?: string | null;
          eligibility_status?: string;
          last_price_batch_at?: string | null;
          last_price_batch_result?: Json;
          llc_checklist?: Json;
          organization_id?: string;
          payments_enabled?: boolean;
          payments_enabled_at?: string | null;
          updated_at?: string;
          webhook_enforcement_active?: boolean;
          webhook_last_event_at?: string | null;
          webhook_notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stripe_readiness_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: true;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      stripe_webhook_events: {
        Row: {
          action: string;
          cancel_at_period_end: boolean | null;
          contract_ends_at: string | null;
          created_at: string;
          event_id: string | null;
          event_type: string;
          id: string;
          livemode: boolean | null;
          note: string | null;
          ok: boolean;
          organization_id: string;
          payload: Json | null;
          received_at: string;
          simulated: boolean;
          subscription_id: string | null;
        };
        Insert: {
          action: string;
          cancel_at_period_end?: boolean | null;
          contract_ends_at?: string | null;
          created_at?: string;
          event_id?: string | null;
          event_type: string;
          id?: string;
          livemode?: boolean | null;
          note?: string | null;
          ok: boolean;
          organization_id: string;
          payload?: Json | null;
          received_at?: string;
          simulated?: boolean;
          subscription_id?: string | null;
        };
        Update: {
          action?: string;
          cancel_at_period_end?: boolean | null;
          contract_ends_at?: string | null;
          created_at?: string;
          event_id?: string | null;
          event_type?: string;
          id?: string;
          livemode?: boolean | null;
          note?: string | null;
          ok?: boolean;
          organization_id?: string;
          payload?: Json | null;
          received_at?: string;
          simulated?: boolean;
          subscription_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "stripe_webhook_events_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          organization_id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          organization_id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_org_role: {
        Args: {
          _org_id: string;
          _roles: Database["public"]["Enums"]["app_role"][];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_org_member: {
        Args: { _org_id: string; _user_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "owner" | "admin" | "manager" | "viewer";
      plan_tier: "foundation" | "growth" | "authority";
      removal_status:
        "draft" | "submitted" | "under_review" | "removed" | "denied" | "appeal_pending";
      review_platform: "google" | "yelp" | "facebook" | "manual" | "other";
      review_status: "new" | "responded" | "ignored" | "escalated" | "resolved";
      violation_severity: "low" | "medium" | "high" | "critical";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["owner", "admin", "manager", "viewer"],
      plan_tier: ["foundation", "growth", "authority"],
      removal_status: ["draft", "submitted", "under_review", "removed", "denied", "appeal_pending"],
      review_platform: ["google", "yelp", "facebook", "manual", "other"],
      review_status: ["new", "responded", "ignored", "escalated", "resolved"],
      violation_severity: ["low", "medium", "high", "critical"],
    },
  },
} as const;
