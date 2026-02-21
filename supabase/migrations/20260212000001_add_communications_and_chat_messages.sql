-- LA Rent Finder - Communications & Chat Messages Migration
-- Created: 2026-02-12
-- Description: Adds communications table for email/sms/call tracking and
--              chat_messages table for individual chat message storage

-- ==========================================
-- COMMUNICATIONS TABLE
-- ==========================================
-- Track all outbound communications (email, SMS, phone calls) to listing contacts
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    apartment_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('email', 'sms', 'call')),
    subject VARCHAR(255),
    body TEXT NOT NULL,
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(20),
    status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for communications
CREATE INDEX idx_communications_user_id ON communications(user_id);
CREATE INDEX idx_communications_apartment_id ON communications(apartment_id);
CREATE INDEX idx_communications_type ON communications(type);
CREATE INDEX idx_communications_status ON communications(status);
CREATE INDEX idx_communications_created_at ON communications(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_communications_updated_at
    BEFORE UPDATE ON communications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- CHAT MESSAGES TABLE
-- ==========================================
-- Individual message records for chat sessions (supplements the existing chats table)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for chat_messages
CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_role ON chat_messages(role);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- COMMUNICATIONS POLICIES
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY communications_select_own
    ON communications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY communications_insert_own
    ON communications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY communications_update_own
    ON communications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY communications_delete_own
    ON communications FOR DELETE
    USING (auth.uid() = user_id);

-- CHAT MESSAGES POLICIES
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY chat_messages_select_own
    ON chat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY chat_messages_insert_own
    ON chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY chat_messages_update_own
    ON chat_messages FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY chat_messages_delete_own
    ON chat_messages FOR DELETE
    USING (auth.uid() = user_id);

-- ==========================================
-- ADDITIONAL PERFORMANCE INDEXES
-- ==========================================

-- Composite index for common communications query pattern
CREATE INDEX idx_communications_user_apartment ON communications(user_id, apartment_id);

-- Composite index for fetching chat messages in order
CREATE INDEX idx_chat_messages_chat_created ON chat_messages(chat_id, created_at);

-- Add GIN index on apartments.amenities for JSONB containment queries
CREATE INDEX IF NOT EXISTS idx_apartments_amenities ON apartments USING GIN(amenities);

-- Add composite index for favorites lookup pattern
CREATE INDEX IF NOT EXISTS idx_favorites_user_apartment ON favorites(user_id, apartment_id);

-- Add composite index for cost_estimates common lookup
CREATE INDEX IF NOT EXISTS idx_cost_estimates_user_listing ON cost_estimates(user_id, listing_id);

-- Add composite index for listing_scores lookup
CREATE INDEX IF NOT EXISTS idx_listing_scores_user_listing ON listing_scores(user_id, listing_id);

-- ==========================================
-- COMMENTS
-- ==========================================
COMMENT ON TABLE communications IS 'Tracks outbound communications (email, SMS, calls) to listing contacts';
COMMENT ON TABLE chat_messages IS 'Individual messages within chat sessions, stored relationally for querying';

COMMENT ON COLUMN communications.type IS 'Communication channel: email, sms, or call';
COMMENT ON COLUMN communications.status IS 'Delivery status: queued, sent, delivered, or failed';
COMMENT ON COLUMN communications.metadata IS 'Extra data like delivery receipts, error details, call duration, etc.';
COMMENT ON COLUMN chat_messages.role IS 'Message sender role: user, assistant, or system';
COMMENT ON COLUMN chat_messages.metadata IS 'Extra data like agent name, tool calls, search results, etc.';
