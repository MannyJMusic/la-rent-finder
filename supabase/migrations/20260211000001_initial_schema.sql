-- LA Rent Finder - Initial Database Schema Migration
-- Created: 2026-02-11
-- Description: Creates all core tables with relationships, indexes, and RLS policies

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable PostGIS extension for geospatial queries (latitude/longitude)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ==========================================
-- USERS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ==========================================
-- APARTMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS apartments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    address VARCHAR(500) NOT NULL,
    location VARCHAR(255) NOT NULL, -- City/Neighborhood
    price DECIMAL(10, 2) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    bedrooms INTEGER NOT NULL DEFAULT 0,
    bathrooms DECIMAL(3, 1) NOT NULL DEFAULT 0,
    square_feet INTEGER,
    amenities JSONB DEFAULT '[]',
    photos TEXT[] DEFAULT '{}',
    availability_score DECIMAL(3, 2) DEFAULT 0.0,
    available_date DATE,
    lease_term VARCHAR(50),
    pet_policy VARCHAR(100),
    parking_available BOOLEAN DEFAULT false,
    furnished BOOLEAN DEFAULT false,
    listing_url TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    landlord_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for frequently queried columns
CREATE INDEX idx_apartments_location ON apartments(location);
CREATE INDEX idx_apartments_price ON apartments(price);
CREATE INDEX idx_apartments_bedrooms ON apartments(bedrooms);
CREATE INDEX idx_apartments_bathrooms ON apartments(bathrooms);
CREATE INDEX idx_apartments_available_date ON apartments(available_date);
CREATE INDEX idx_apartments_created_at ON apartments(created_at);
CREATE INDEX idx_apartments_availability_score ON apartments(availability_score);

-- Create geospatial index for location-based queries
CREATE INDEX idx_apartments_coordinates ON apartments USING GIST (
    ST_MakePoint(longitude, latitude)::geography
) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ==========================================
-- FAVORITES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS favorites (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, apartment_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_favorites_apartment_id ON favorites(apartment_id);
CREATE INDEX idx_favorites_created_at ON favorites(created_at);

-- ==========================================
-- APPOINTMENTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, cancelled, completed
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for appointment queries
CREATE INDEX idx_appointments_user_id ON appointments(user_id);
CREATE INDEX idx_appointments_apartment_id ON appointments(apartment_id);
CREATE INDEX idx_appointments_scheduled_time ON appointments(scheduled_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_created_at ON appointments(created_at);

-- ==========================================
-- MESSAGES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    apartment_id UUID REFERENCES apartments(id) ON DELETE SET NULL,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for message queries
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_apartment_id ON messages(apartment_id);
CREATE INDEX idx_messages_read ON messages(read);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- ==========================================
-- CHATS TABLE (AI Agent Chat History)
-- ==========================================
CREATE TABLE IF NOT EXISTS chats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_type VARCHAR(50) NOT NULL, -- 'search', 'recommendation', 'support'
    title VARCHAR(255),
    messages JSONB DEFAULT '[]', -- Array of message objects with role, content, timestamp
    metadata JSONB DEFAULT '{}', -- Store search preferences, context, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for chat queries
CREATE INDEX idx_chats_user_id ON chats(user_id);
CREATE INDEX idx_chats_agent_type ON chats(agent_type);
CREATE INDEX idx_chats_created_at ON chats(created_at);
CREATE INDEX idx_chats_updated_at ON chats(updated_at);

-- ==========================================
-- UPDATED_AT TRIGGER FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apartments_updated_at
    BEFORE UPDATE ON apartments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at
    BEFORE UPDATE ON chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES
-- Users can read their own data
CREATE POLICY users_select_own
    ON users FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY users_update_own
    ON users FOR UPDATE
    USING (auth.uid() = id);

-- Users can insert their own data (for registration)
CREATE POLICY users_insert_own
    ON users FOR INSERT
    WITH CHECK (auth.uid() = id);

-- APARTMENTS TABLE POLICIES
-- Everyone can read apartments (public listings)
CREATE POLICY apartments_select_all
    ON apartments FOR SELECT
    TO authenticated
    USING (true);

-- Only authenticated users can insert apartments (landlords/admins)
CREATE POLICY apartments_insert_authenticated
    ON apartments FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users can update apartments they own (future feature)
CREATE POLICY apartments_update_own
    ON apartments FOR UPDATE
    TO authenticated
    USING (true);

-- FAVORITES TABLE POLICIES
-- Users can read their own favorites
CREATE POLICY favorites_select_own
    ON favorites FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own favorites
CREATE POLICY favorites_insert_own
    ON favorites FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own favorites
CREATE POLICY favorites_delete_own
    ON favorites FOR DELETE
    USING (auth.uid() = user_id);

-- APPOINTMENTS TABLE POLICIES
-- Users can read their own appointments
CREATE POLICY appointments_select_own
    ON appointments FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own appointments
CREATE POLICY appointments_insert_own
    ON appointments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own appointments
CREATE POLICY appointments_update_own
    ON appointments FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own appointments
CREATE POLICY appointments_delete_own
    ON appointments FOR DELETE
    USING (auth.uid() = user_id);

-- MESSAGES TABLE POLICIES
-- Users can read messages they sent or received
CREATE POLICY messages_select_own
    ON messages FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can insert messages where they are the sender
CREATE POLICY messages_insert_own
    ON messages FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (mark as read)
CREATE POLICY messages_update_received
    ON messages FOR UPDATE
    USING (auth.uid() = recipient_id);

-- CHATS TABLE POLICIES
-- Users can read their own chats
CREATE POLICY chats_select_own
    ON chats FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own chats
CREATE POLICY chats_insert_own
    ON chats FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own chats
CREATE POLICY chats_update_own
    ON chats FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own chats
CREATE POLICY chats_delete_own
    ON chats FOR DELETE
    USING (auth.uid() = user_id);

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Function to search apartments by location with radius (in miles)
CREATE OR REPLACE FUNCTION search_apartments_nearby(
    target_lat DECIMAL,
    target_lon DECIMAL,
    radius_miles DECIMAL DEFAULT 5
)
RETURNS TABLE (
    apartment_id UUID,
    distance_miles DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        id AS apartment_id,
        ROUND(
            ST_Distance(
                ST_MakePoint(longitude, latitude)::geography,
                ST_MakePoint(target_lon, target_lat)::geography
            ) / 1609.344, -- Convert meters to miles
            2
        ) AS distance_miles
    FROM apartments
    WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND ST_DWithin(
            ST_MakePoint(longitude, latitude)::geography,
            ST_MakePoint(target_lon, target_lat)::geography,
            radius_miles * 1609.344 -- Convert miles to meters
        )
    ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE users IS 'Stores user account information including preferences';
COMMENT ON TABLE apartments IS 'Stores apartment listings with location and amenities';
COMMENT ON TABLE favorites IS 'Tracks user favorite apartments';
COMMENT ON TABLE appointments IS 'Manages viewing appointments between users and apartments';
COMMENT ON TABLE messages IS 'Handles direct messages between users';
COMMENT ON TABLE chats IS 'Stores AI agent chat history and context';

COMMENT ON COLUMN apartments.availability_score IS 'AI-generated score (0-1) indicating likelihood of availability';
COMMENT ON COLUMN apartments.photos IS 'Array of photo URLs for the apartment';
COMMENT ON COLUMN apartments.amenities IS 'JSON array of amenity strings';
COMMENT ON COLUMN users.preferences IS 'JSON object storing user search preferences and filters';
COMMENT ON COLUMN chats.messages IS 'JSON array of chat messages with role, content, and timestamp';
