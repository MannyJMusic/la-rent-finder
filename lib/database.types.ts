/**
 * Database Type Definitions
 * Types for Supabase database schema based on migrations:
 *   - 20260211000001_initial_schema.sql
 *   - 20260211000002_add_missing_tables.sql
 *   - 20260212000001_add_communications_and_chat_messages.sql
 *
 * Last updated: 2026-02-20
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          preferences: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          password_hash: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          max_budget: number | null
          min_budget: number | null
          min_bedrooms: number
          max_bedrooms: number | null
          min_bathrooms: number
          max_bathrooms: number | null
          neighborhoods: string[]
          amenities: string[]
          pet_friendly: boolean | null
          parking_required: boolean | null
          furnished_preference: string | null
          lease_duration_months: number | null
          max_commute_minutes: number | null
          commute_address: string | null
          commute_lat: number | null
          commute_lon: number | null
          move_in_date: string | null
          property_types: string[]
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          max_budget?: number | null
          min_budget?: number | null
          min_bedrooms?: number
          max_bedrooms?: number | null
          min_bathrooms?: number
          max_bathrooms?: number | null
          neighborhoods?: string[]
          amenities?: string[]
          pet_friendly?: boolean | null
          parking_required?: boolean | null
          furnished_preference?: string | null
          lease_duration_months?: number | null
          max_commute_minutes?: number | null
          commute_address?: string | null
          commute_lat?: number | null
          commute_lon?: number | null
          move_in_date?: string | null
          property_types?: string[]
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          max_budget?: number | null
          min_budget?: number | null
          min_bedrooms?: number
          max_bedrooms?: number | null
          min_bathrooms?: number
          max_bathrooms?: number | null
          neighborhoods?: string[]
          amenities?: string[]
          pet_friendly?: boolean | null
          parking_required?: boolean | null
          furnished_preference?: string | null
          lease_duration_months?: number | null
          max_commute_minutes?: number | null
          commute_address?: string | null
          commute_lat?: number | null
          commute_lon?: number | null
          move_in_date?: string | null
          property_types?: string[]
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_preferences_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      properties: {
        Row: {
          id: string
          title: string
          description: string | null
          address: string
          location: string
          price: number
          latitude: number | null
          longitude: number | null
          bedrooms: number
          bathrooms: number
          square_feet: number | null
          amenities: Json | null
          photos: string[]
          availability_score: number | null
          available_date: string | null
          lease_term: string | null
          pet_policy: string | null
          parking_available: boolean
          furnished: boolean
          listing_url: string | null
          contact_email: string | null
          contact_phone: string | null
          landlord_name: string | null
          property_type: PropertyType
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          address: string
          location: string
          price: number
          latitude?: number | null
          longitude?: number | null
          bedrooms?: number
          bathrooms?: number
          square_feet?: number | null
          amenities?: Json | null
          photos?: string[]
          availability_score?: number | null
          available_date?: string | null
          lease_term?: string | null
          pet_policy?: string | null
          parking_available?: boolean
          furnished?: boolean
          listing_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          landlord_name?: string | null
          property_type?: PropertyType
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          address?: string
          location?: string
          price?: number
          latitude?: number | null
          longitude?: number | null
          bedrooms?: number
          bathrooms?: number
          square_feet?: number | null
          amenities?: Json | null
          photos?: string[]
          availability_score?: number | null
          available_date?: string | null
          lease_term?: string | null
          pet_policy?: string | null
          parking_available?: boolean
          furnished?: boolean
          listing_url?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          landlord_name?: string | null
          property_type?: PropertyType
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          user_id: string
          apartment_id: string
          notes: string | null
          created_at: string
        }
        Insert: {
          user_id: string
          apartment_id: string
          notes?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string
          apartment_id?: string
          notes?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'favorites_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'favorites_apartment_id_fkey'
            columns: ['apartment_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
      }
      appointments: {
        Row: {
          id: string
          user_id: string
          apartment_id: string
          scheduled_time: string
          status: string | null
          notes: string | null
          reminder_sent: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          apartment_id: string
          scheduled_time: string
          status?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          apartment_id?: string
          scheduled_time?: string
          status?: string | null
          notes?: string | null
          reminder_sent?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointments_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_apartment_id_fkey'
            columns: ['apartment_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          recipient_id: string
          apartment_id: string | null
          subject: string | null
          content: string
          read: boolean | null
          created_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          recipient_id: string
          apartment_id?: string | null
          subject?: string | null
          content: string
          read?: boolean | null
          created_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          recipient_id?: string
          apartment_id?: string | null
          subject?: string | null
          content?: string
          read?: boolean | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'messages_sender_id_fkey'
            columns: ['sender_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_recipient_id_fkey'
            columns: ['recipient_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'messages_apartment_id_fkey'
            columns: ['apartment_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
      }
      chats: {
        Row: {
          id: string
          user_id: string
          agent_type: string
          title: string | null
          messages: Json
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agent_type: string
          title?: string | null
          messages?: Json
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agent_type?: string
          title?: string | null
          messages?: Json
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chats_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      searches: {
        Row: {
          id: string
          user_id: string
          query_text: string
          filters: Json | null
          results_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          query_text: string
          filters?: Json | null
          results_count?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          query_text?: string
          filters?: Json | null
          results_count?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'searches_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
      listing_scores: {
        Row: {
          id: string
          listing_id: string
          user_id: string
          search_id: string | null
          overall_score: number | null
          price_score: number | null
          location_score: number | null
          size_score: number | null
          amenities_score: number | null
          commute_score: number | null
          availability_score: number | null
          reasoning: string | null
          pros: string[]
          cons: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          user_id: string
          search_id?: string | null
          overall_score?: number | null
          price_score?: number | null
          location_score?: number | null
          size_score?: number | null
          amenities_score?: number | null
          commute_score?: number | null
          availability_score?: number | null
          reasoning?: string | null
          pros?: string[]
          cons?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          user_id?: string
          search_id?: string | null
          overall_score?: number | null
          price_score?: number | null
          location_score?: number | null
          size_score?: number | null
          amenities_score?: number | null
          commute_score?: number | null
          availability_score?: number | null
          reasoning?: string | null
          pros?: string[]
          cons?: string[]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'listing_scores_listing_id_fkey'
            columns: ['listing_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'listing_scores_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'listing_scores_search_id_fkey'
            columns: ['search_id']
            isOneToOne: false
            referencedRelation: 'searches'
            referencedColumns: ['id']
          }
        ]
      }
      cost_estimates: {
        Row: {
          id: string
          user_id: string
          listing_id: string | null
          first_month_rent: number
          last_month_rent: number
          security_deposit: number
          pet_deposit: number
          application_fee: number
          broker_fee: number
          move_in_total: number
          monthly_rent: number
          utilities_estimate: number
          parking_fee: number
          pet_rent: number
          renters_insurance: number
          monthly_total: number
          moving_company_quote: number
          packing_materials: number
          storage_costs: number
          travel_costs: number
          moving_total: number
          estimate_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id?: string | null
          first_month_rent: number
          last_month_rent?: number
          security_deposit?: number
          pet_deposit?: number
          application_fee?: number
          broker_fee?: number
          move_in_total: number
          monthly_rent: number
          utilities_estimate?: number
          parking_fee?: number
          pet_rent?: number
          renters_insurance?: number
          monthly_total: number
          moving_company_quote?: number
          packing_materials?: number
          storage_costs?: number
          travel_costs?: number
          moving_total?: number
          estimate_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string | null
          first_month_rent?: number
          last_month_rent?: number
          security_deposit?: number
          pet_deposit?: number
          application_fee?: number
          broker_fee?: number
          move_in_total?: number
          monthly_rent?: number
          utilities_estimate?: number
          parking_fee?: number
          pet_rent?: number
          renters_insurance?: number
          monthly_total?: number
          moving_company_quote?: number
          packing_materials?: number
          storage_costs?: number
          travel_costs?: number
          moving_total?: number
          estimate_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'cost_estimates_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cost_estimates_listing_id_fkey'
            columns: ['listing_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
      }
      communications: {
        Row: {
          id: string
          user_id: string
          apartment_id: string
          type: string
          subject: string | null
          body: string
          recipient_email: string | null
          recipient_phone: string | null
          status: string
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          apartment_id: string
          type: string
          subject?: string | null
          body: string
          recipient_email?: string | null
          recipient_phone?: string | null
          status?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          apartment_id?: string
          type?: string
          subject?: string | null
          body?: string
          recipient_email?: string | null
          recipient_phone?: string | null
          status?: string
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'communications_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'communications_apartment_id_fkey'
            columns: ['apartment_id']
            isOneToOne: false
            referencedRelation: 'properties'
            referencedColumns: ['id']
          }
        ]
      }
      chat_messages: {
        Row: {
          id: string
          chat_id: string
          user_id: string
          role: string
          content: string
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          chat_id: string
          user_id: string
          role: string
          content: string
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          chat_id?: string
          user_id?: string
          role?: string
          content?: string
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_messages_chat_id_fkey'
            columns: ['chat_id']
            isOneToOne: false
            referencedRelation: 'chats'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_messages_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      search_properties_nearby: {
        Args: {
          target_lat: number
          target_lon: number
          radius_miles?: number
        }
        Returns: {
          apartment_id: string
          distance_miles: number
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

// Property type enum
export type PropertyType = 'apartment' | 'house' | 'condo' | 'townhouse' | 'room'
