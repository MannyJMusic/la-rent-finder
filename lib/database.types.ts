/**
 * Database Type Definitions
 * Types for Supabase database schema based on migrations:
 *   - 20260211000001_initial_schema.sql
 *   - 20260211000002_add_missing_tables.sql
 *   - 20260212000001_add_communications_and_chat_messages.sql
 *   - add_crawl_pipeline_schema
 *
 * Last updated: 2026-02-21
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      appointments: {
        Row: {
          apartment_id: string
          created_at: string | null
          id: string
          notes: string | null
          reminder_sent: boolean | null
          scheduled_time: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          apartment_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_time: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          apartment_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          reminder_sent?: boolean | null
          scheduled_time?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          created_at: string | null
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          chat_id: string
          content: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          chat_id?: string
          content?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          agent_type: string
          created_at: string | null
          id: string
          messages: Json | null
          metadata: Json | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          agent_type: string
          created_at?: string | null
          id?: string
          messages?: Json | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          agent_type?: string
          created_at?: string | null
          id?: string
          messages?: Json | null
          metadata?: Json | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          apartment_id: string
          body: string
          created_at: string | null
          id: string
          metadata: Json | null
          recipient_email: string | null
          recipient_phone: string | null
          status: string
          subject: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          apartment_id: string
          body: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string | null
          recipient_phone?: string | null
          status?: string
          subject?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          apartment_id?: string
          body?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          recipient_email?: string | null
          recipient_phone?: string | null
          status?: string
          subject?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cost_estimates: {
        Row: {
          application_fee: number | null
          broker_fee: number | null
          created_at: string | null
          estimate_notes: string | null
          first_month_rent: number
          id: string
          last_month_rent: number | null
          listing_id: string | null
          monthly_rent: number
          monthly_total: number
          move_in_total: number
          moving_company_quote: number | null
          moving_total: number | null
          packing_materials: number | null
          parking_fee: number | null
          pet_deposit: number | null
          pet_rent: number | null
          renters_insurance: number | null
          security_deposit: number | null
          storage_costs: number | null
          travel_costs: number | null
          updated_at: string | null
          user_id: string
          utilities_estimate: number | null
        }
        Insert: {
          application_fee?: number | null
          broker_fee?: number | null
          created_at?: string | null
          estimate_notes?: string | null
          first_month_rent: number
          id?: string
          last_month_rent?: number | null
          listing_id?: string | null
          monthly_rent: number
          monthly_total: number
          move_in_total: number
          moving_company_quote?: number | null
          moving_total?: number | null
          packing_materials?: number | null
          parking_fee?: number | null
          pet_deposit?: number | null
          pet_rent?: number | null
          renters_insurance?: number | null
          security_deposit?: number | null
          storage_costs?: number | null
          travel_costs?: number | null
          updated_at?: string | null
          user_id: string
          utilities_estimate?: number | null
        }
        Update: {
          application_fee?: number | null
          broker_fee?: number | null
          created_at?: string | null
          estimate_notes?: string | null
          first_month_rent?: number
          id?: string
          last_month_rent?: number | null
          listing_id?: string | null
          monthly_rent?: number
          monthly_total?: number
          move_in_total?: number
          moving_company_quote?: number | null
          moving_total?: number | null
          packing_materials?: number | null
          parking_fee?: number | null
          pet_deposit?: number | null
          pet_rent?: number | null
          renters_insurance?: number | null
          security_deposit?: number | null
          storage_costs?: number | null
          travel_costs?: number | null
          updated_at?: string | null
          user_id?: string
          utilities_estimate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_estimates_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_estimates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      crawl_runs: {
        Row: {
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          listings_deactivated: number | null
          listings_found: number | null
          listings_new: number | null
          listings_updated: number | null
          search_params: Json
          source_name: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          listings_deactivated?: number | null
          listings_found?: number | null
          listings_new?: number | null
          listings_updated?: number | null
          search_params: Json
          source_name: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          listings_deactivated?: number | null
          listings_found?: number | null
          listings_new?: number | null
          listings_updated?: number | null
          search_params?: Json
          source_name?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      crawl_sources: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          price_at_source: number | null
          property_id: string
          source_id: string | null
          source_name: string
          source_url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          price_at_source?: number | null
          property_id: string
          source_id?: string | null
          source_name: string
          source_url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          price_at_source?: number | null
          property_id?: string
          source_id?: string | null
          source_name?: string
          source_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "crawl_sources_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          apartment_id: string
          created_at: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          apartment_id: string
          created_at?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          apartment_id?: string
          created_at?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_scores: {
        Row: {
          amenities_score: number | null
          availability_score: number | null
          commute_score: number | null
          cons: string[] | null
          created_at: string | null
          id: string
          listing_id: string
          location_score: number | null
          overall_score: number | null
          price_score: number | null
          pros: string[] | null
          reasoning: string | null
          search_id: string | null
          size_score: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amenities_score?: number | null
          availability_score?: number | null
          commute_score?: number | null
          cons?: string[] | null
          created_at?: string | null
          id?: string
          listing_id: string
          location_score?: number | null
          overall_score?: number | null
          price_score?: number | null
          pros?: string[] | null
          reasoning?: string | null
          search_id?: string | null
          size_score?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amenities_score?: number | null
          availability_score?: number | null
          commute_score?: number | null
          cons?: string[] | null
          created_at?: string | null
          id?: string
          listing_id?: string
          location_score?: number | null
          overall_score?: number | null
          price_score?: number | null
          pros?: string[] | null
          reasoning?: string | null
          search_id?: string | null
          size_score?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_scores_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_scores_search_id_fkey"
            columns: ["search_id"]
            isOneToOne: false
            referencedRelation: "searches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          apartment_id: string | null
          content: string
          created_at: string | null
          id: string
          read: boolean | null
          recipient_id: string
          sender_id: string
          subject: string | null
        }
        Insert: {
          apartment_id?: string | null
          content: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id: string
          sender_id: string
          subject?: string | null
        }
        Update: {
          apartment_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
          read?: boolean | null
          recipient_id?: string
          sender_id?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          amenities: Json | null
          availability_score: number | null
          available_date: string | null
          bathrooms: number
          bedrooms: number
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          description: string | null
          furnished: boolean | null
          id: string
          is_active: boolean | null
          landlord_name: string | null
          last_crawled_at: string | null
          last_verified_at: string | null
          latitude: number | null
          lease_term: string | null
          listing_url: string | null
          location: string
          longitude: number | null
          parking_available: boolean | null
          pet_policy: string | null
          photos: string[] | null
          price: number
          property_type: string
          raw_data: Json | null
          source_id: string | null
          source_name: string | null
          source_url: string | null
          source_urls: string[] | null
          square_feet: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          address: string
          amenities?: Json | null
          availability_score?: number | null
          available_date?: string | null
          bathrooms?: number
          bedrooms?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          furnished?: boolean | null
          id?: string
          is_active?: boolean | null
          landlord_name?: string | null
          last_crawled_at?: string | null
          last_verified_at?: string | null
          latitude?: number | null
          lease_term?: string | null
          listing_url?: string | null
          location: string
          longitude?: number | null
          parking_available?: boolean | null
          pet_policy?: string | null
          photos?: string[] | null
          price: number
          property_type?: string
          raw_data?: Json | null
          source_id?: string | null
          source_name?: string | null
          source_url?: string | null
          source_urls?: string[] | null
          square_feet?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          address?: string
          amenities?: Json | null
          availability_score?: number | null
          available_date?: string | null
          bathrooms?: number
          bedrooms?: number
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          description?: string | null
          furnished?: boolean | null
          id?: string
          is_active?: boolean | null
          landlord_name?: string | null
          last_crawled_at?: string | null
          last_verified_at?: string | null
          latitude?: number | null
          lease_term?: string | null
          listing_url?: string | null
          location?: string
          longitude?: number | null
          parking_available?: boolean | null
          pet_policy?: string | null
          photos?: string[] | null
          price?: number
          property_type?: string
          raw_data?: Json | null
          source_id?: string | null
          source_name?: string | null
          source_url?: string | null
          source_urls?: string[] | null
          square_feet?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      searches: {
        Row: {
          created_at: string | null
          filters: Json | null
          id: string
          query_text: string
          results_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          query_text: string
          results_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          filters?: Json | null
          id?: string
          query_text?: string
          results_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          amenities: string[] | null
          commute_address: string | null
          commute_lat: number | null
          commute_lon: number | null
          created_at: string | null
          furnished_preference: string | null
          id: string
          lease_duration_months: number | null
          max_bathrooms: number | null
          max_bedrooms: number | null
          max_budget: number | null
          max_commute_minutes: number | null
          min_bathrooms: number | null
          min_bedrooms: number | null
          min_budget: number | null
          move_in_date: string | null
          neighborhoods: string[] | null
          onboarding_completed: boolean | null
          parking_required: boolean | null
          pet_friendly: boolean | null
          property_types: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amenities?: string[] | null
          commute_address?: string | null
          commute_lat?: number | null
          commute_lon?: number | null
          created_at?: string | null
          furnished_preference?: string | null
          id?: string
          lease_duration_months?: number | null
          max_bathrooms?: number | null
          max_bedrooms?: number | null
          max_budget?: number | null
          max_commute_minutes?: number | null
          min_bathrooms?: number | null
          min_bedrooms?: number | null
          min_budget?: number | null
          move_in_date?: string | null
          neighborhoods?: string[] | null
          onboarding_completed?: boolean | null
          parking_required?: boolean | null
          pet_friendly?: boolean | null
          property_types?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amenities?: string[] | null
          commute_address?: string | null
          commute_lat?: number | null
          commute_lon?: number | null
          created_at?: string | null
          furnished_preference?: string | null
          id?: string
          lease_duration_months?: number | null
          max_bathrooms?: number | null
          max_bedrooms?: number | null
          max_budget?: number | null
          max_commute_minutes?: number | null
          min_bathrooms?: number | null
          min_bedrooms?: number | null
          min_budget?: number | null
          move_in_date?: string | null
          neighborhoods?: string[] | null
          onboarding_completed?: boolean | null
          parking_required?: boolean | null
          pet_friendly?: boolean | null
          property_types?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          password_hash: string | null
          phone: string | null
          preferences: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          password_hash?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          password_hash?: string | null
          phone?: string | null
          preferences?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Generic type helpers
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

// Specific type exports for convenience
export type User = Tables<'users'>
export type UserPreferences = Tables<'user_preferences'>
export type Property = Tables<'properties'>
export type Favorite = Tables<'favorites'>
export type Appointment = Tables<'appointments'>
export type Message = Tables<'messages'>
export type Chat = Tables<'chats'>
export type Search = Tables<'searches'>
export type ListingScore = Tables<'listing_scores'>
export type CostEstimate = Tables<'cost_estimates'>
export type Communication = Tables<'communications'>
export type ChatMessage = Tables<'chat_messages'>
export type CrawlRun = Tables<'crawl_runs'>
export type CrawlSource = Tables<'crawl_sources'>

// Insert type exports
export type UserInsert = Inserts<'users'>
export type UserPreferencesInsert = Inserts<'user_preferences'>
export type PropertyInsert = Inserts<'properties'>
export type FavoriteInsert = Inserts<'favorites'>
export type AppointmentInsert = Inserts<'appointments'>
export type MessageInsert = Inserts<'messages'>
export type ChatInsert = Inserts<'chats'>
export type SearchInsert = Inserts<'searches'>
export type ListingScoreInsert = Inserts<'listing_scores'>
export type CostEstimateInsert = Inserts<'cost_estimates'>
export type CommunicationInsert = Inserts<'communications'>
export type ChatMessageInsert = Inserts<'chat_messages'>
export type CrawlRunInsert = Inserts<'crawl_runs'>
export type CrawlSourceInsert = Inserts<'crawl_sources'>

// Update type exports
export type UserUpdate = Updates<'users'>
export type UserPreferencesUpdate = Updates<'user_preferences'>
export type PropertyUpdate = Updates<'properties'>
export type FavoriteUpdate = Updates<'favorites'>
export type AppointmentUpdate = Updates<'appointments'>
export type MessageUpdate = Updates<'messages'>
export type ChatUpdate = Updates<'chats'>
export type SearchUpdate = Updates<'searches'>
export type ListingScoreUpdate = Updates<'listing_scores'>
export type CostEstimateUpdate = Updates<'cost_estimates'>
export type CommunicationUpdate = Updates<'communications'>
export type ChatMessageUpdate = Updates<'chat_messages'>
export type CrawlRunUpdate = Updates<'crawl_runs'>
export type CrawlSourceUpdate = Updates<'crawl_sources'>

// Property type enum
export type PropertyType = 'apartment' | 'house' | 'condo' | 'townhouse' | 'room'
