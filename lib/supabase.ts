/**
 * Supabase Client Configuration
 *
 * This file sets up the Supabase client for the LA Rent Finder application.
 * It provides both client-side and server-side client instances.
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!supabaseUrl) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

/**
 * Client-side Supabase client
 * Use this in client components and pages
 *
 * This client uses the anon key which respects Row Level Security (RLS) policies
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

/**
 * Server-side Supabase client with service role key
 * Use this ONLY in server-side code (API routes, getServerSideProps)
 *
 * WARNING: This client bypasses Row Level Security!
 * Only use when you need admin access or when RLS doesn't apply
 */
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Database Types
 * These types represent the database schema
 * Update these when you change the database schema
 */

export interface User {
  id: string;
  email: string;
  password_hash: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  preferences?: {
    max_price?: number;
    min_bedrooms?: number;
    preferred_neighborhoods?: string[];
    pet_friendly?: boolean;
    parking_required?: boolean;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface Apartment {
  id: string;
  title: string;
  description?: string;
  address: string;
  location: string;
  price: number;
  latitude?: number;
  longitude?: number;
  bedrooms: number;
  bathrooms: number;
  square_feet?: number;
  amenities?: string[];
  photos?: string[];
  availability_score?: number;
  available_date?: string;
  lease_term?: string;
  pet_policy?: string;
  parking_available?: boolean;
  furnished?: boolean;
  listing_url?: string;
  contact_email?: string;
  contact_phone?: string;
  landlord_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Favorite {
  user_id: string;
  apartment_id: string;
  notes?: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  apartment_id: string;
  scheduled_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  reminder_sent?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  apartment_id?: string;
  subject?: string;
  content: string;
  read: boolean;
  created_at: string;
}

export interface Chat {
  id: string;
  user_id: string;
  agent_type: 'search' | 'recommendation' | 'support';
  title?: string;
  messages: ChatMessage[];
  metadata?: {
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/**
 * Database Helper Functions
 */

/**
 * Search properties by location with radius
 * @param latitude - Target latitude
 * @param longitude - Target longitude
 * @param radiusMiles - Search radius in miles (default: 5)
 * @returns Array of property IDs with distances
 */
export async function searchApartmentsNearby(
  latitude: number,
  longitude: number,
  radiusMiles: number = 5
) {
  const { data, error } = await supabase.rpc('search_apartments_nearby', {
    target_lat: latitude,
    target_lon: longitude,
    radius_miles: radiusMiles,
  });

  if (error) {
    console.error('Error searching properties:', error);
    throw error;
  }

  return data;
}

/**
 * Get user's favorite properties with full property details
 * @param userId - User ID
 * @returns Array of favorite properties
 */
export async function getUserFavorites(userId: string) {
  const { data, error } = await supabase
    .from('favorites')
    .select(`
      apartment_id,
      notes,
      created_at,
      properties:apartment_id (*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching favorites:', error);
    throw error;
  }

  return data;
}

/**
 * Get user's appointments with property details
 * @param userId - User ID
 * @returns Array of appointments
 */
export async function getUserAppointments(userId: string) {
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      scheduled_time,
      status,
      notes,
      created_at,
      properties:apartment_id (
        id,
        title,
        address,
        location,
        price
      )
    `)
    .eq('user_id', userId)
    .order('scheduled_time', { ascending: true });

  if (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }

  return data;
}

/**
 * Create a new appointment
 * @param userId - User ID
 * @param apartmentId - Apartment ID
 * @param scheduledTime - Appointment date/time
 * @param notes - Optional notes
 * @returns Created appointment
 */
export async function createAppointment(
  userId: string,
  apartmentId: string,
  scheduledTime: string,
  notes?: string
) {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      user_id: userId,
      apartment_id: apartmentId,
      scheduled_time: scheduledTime,
      notes,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }

  return data;
}

/**
 * Toggle favorite status for an apartment
 * @param userId - User ID
 * @param apartmentId - Apartment ID
 * @returns True if added, false if removed
 */
export async function toggleFavorite(userId: string, apartmentId: string) {
  // Check if already favorited
  const { data: existing } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .eq('apartment_id', apartmentId)
    .single();

  if (existing) {
    // Remove favorite
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('apartment_id', apartmentId);

    if (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
    return false;
  } else {
    // Add favorite
    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: userId,
        apartment_id: apartmentId,
      });

    if (error) {
      console.error('Error adding favorite:', error);
      throw error;
    }
    return true;
  }
}

/**
 * Get user's chat history
 * @param userId - User ID
 * @param agentType - Optional filter by agent type
 * @returns Array of chats
 */
export async function getUserChats(
  userId: string,
  agentType?: 'search' | 'recommendation' | 'support'
) {
  let query = supabase
    .from('chats')
    .select('*')
    .eq('user_id', userId);

  if (agentType) {
    query = query.eq('agent_type', agentType);
  }

  const { data, error } = await query.order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching chats:', error);
    throw error;
  }

  return data;
}

/**
 * Save or update a chat
 * @param userId - User ID
 * @param agentType - Agent type
 * @param messages - Array of chat messages
 * @param chatId - Optional chat ID to update existing chat
 * @param metadata - Optional metadata
 * @returns Saved chat
 */
export async function saveChat(
  userId: string,
  agentType: 'search' | 'recommendation' | 'support',
  messages: ChatMessage[],
  chatId?: string,
  metadata?: any
) {
  if (chatId) {
    // Update existing chat
    const { data, error } = await supabase
      .from('chats')
      .update({
        messages,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', chatId)
      .select()
      .single();

    if (error) {
      console.error('Error updating chat:', error);
      throw error;
    }
    return data;
  } else {
    // Create new chat
    const { data, error } = await supabase
      .from('chats')
      .insert({
        user_id: userId,
        agent_type: agentType,
        messages,
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
    return data;
  }
}
