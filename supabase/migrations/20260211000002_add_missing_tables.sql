-- LA Rent Finder - Additional Tables Migration
-- Created: 2026-02-11
-- Description: Adds missing tables for user_preferences, searches, listing_scores, and cost_estimates

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==========================================
-- USER PREFERENCES TABLE
-- ==========================================
-- Separate table for structured user preferences
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_budget NUMERIC,
    min_budget NUMERIC,
    min_bedrooms INTEGER DEFAULT 0,
    max_bedrooms INTEGER,
    min_bathrooms NUMERIC DEFAULT 0,
    max_bathrooms NUMERIC,
    neighborhoods TEXT[] DEFAULT '{}',
    amenities TEXT[] DEFAULT '{}',
    pet_friendly BOOLEAN,
    parking_required BOOLEAN,
    furnished_preference VARCHAR(50), -- 'furnished', 'unfurnished', 'no_preference'
    lease_duration_months INTEGER,
    max_commute_minutes INTEGER,
    commute_address TEXT,
    commute_lat DECIMAL(10, 8),
    commute_lon DECIMAL(11, 8),
    move_in_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- One preference per user
CREATE UNIQUE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_max_budget ON user_preferences(max_budget);
CREATE INDEX idx_user_preferences_neighborhoods ON user_preferences USING GIN(neighborhoods);

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SEARCHES TABLE
-- ==========================================
-- Track user search queries and parameters
CREATE TABLE IF NOT EXISTS searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    filters JSONB DEFAULT '{}',
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_searches_user_id ON searches(user_id);
CREATE INDEX idx_searches_created_at ON searches(created_at);
CREATE INDEX idx_searches_query_text ON searches USING GIN(to_tsvector('english', query_text));

-- ==========================================
-- LISTING SCORES TABLE
-- ==========================================
-- Store detailed scoring for each listing per user
CREATE TABLE IF NOT EXISTS listing_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES apartments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_id UUID REFERENCES searches(id) ON DELETE SET NULL,
    overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
    price_score INTEGER CHECK (price_score BETWEEN 0 AND 100),
    location_score INTEGER CHECK (location_score BETWEEN 0 AND 100),
    size_score INTEGER CHECK (size_score BETWEEN 0 AND 100),
    amenities_score INTEGER CHECK (amenities_score BETWEEN 0 AND 100),
    commute_score INTEGER CHECK (commute_score BETWEEN 0 AND 100),
    availability_score INTEGER CHECK (availability_score BETWEEN 0 AND 100),
    reasoning TEXT,
    pros TEXT[] DEFAULT '{}',
    cons TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_listing_scores_listing_id ON listing_scores(listing_id);
CREATE INDEX idx_listing_scores_user_id ON listing_scores(user_id);
CREATE INDEX idx_listing_scores_search_id ON listing_scores(search_id);
CREATE INDEX idx_listing_scores_overall_score ON listing_scores(overall_score DESC);
CREATE INDEX idx_listing_scores_created_at ON listing_scores(created_at);

-- Unique constraint: one score per listing per user per search
CREATE UNIQUE INDEX idx_listing_scores_unique ON listing_scores(listing_id, user_id, search_id);

-- Trigger for updated_at
CREATE TRIGGER update_listing_scores_updated_at
    BEFORE UPDATE ON listing_scores
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- COST ESTIMATES TABLE
-- ==========================================
-- Store detailed cost breakdowns for moving
CREATE TABLE IF NOT EXISTS cost_estimates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES apartments(id) ON DELETE SET NULL,

    -- Move-in costs
    first_month_rent NUMERIC NOT NULL,
    last_month_rent NUMERIC DEFAULT 0,
    security_deposit NUMERIC DEFAULT 0,
    pet_deposit NUMERIC DEFAULT 0,
    application_fee NUMERIC DEFAULT 0,
    broker_fee NUMERIC DEFAULT 0,
    move_in_total NUMERIC NOT NULL,

    -- Monthly recurring costs
    monthly_rent NUMERIC NOT NULL,
    utilities_estimate NUMERIC DEFAULT 0,
    parking_fee NUMERIC DEFAULT 0,
    pet_rent NUMERIC DEFAULT 0,
    renters_insurance NUMERIC DEFAULT 0,
    monthly_total NUMERIC NOT NULL,

    -- Moving costs
    moving_company_quote NUMERIC DEFAULT 0,
    packing_materials NUMERIC DEFAULT 0,
    storage_costs NUMERIC DEFAULT 0,
    travel_costs NUMERIC DEFAULT 0,
    moving_total NUMERIC DEFAULT 0,

    -- Metadata
    estimate_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_cost_estimates_user_id ON cost_estimates(user_id);
CREATE INDEX idx_cost_estimates_listing_id ON cost_estimates(listing_id);
CREATE INDEX idx_cost_estimates_monthly_total ON cost_estimates(monthly_total);
CREATE INDEX idx_cost_estimates_created_at ON cost_estimates(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_cost_estimates_updated_at
    BEFORE UPDATE ON cost_estimates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- USER PREFERENCES POLICIES
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_preferences_select_own
    ON user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY user_preferences_insert_own
    ON user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY user_preferences_update_own
    ON user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY user_preferences_delete_own
    ON user_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- SEARCHES POLICIES
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY searches_select_own
    ON searches FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY searches_insert_own
    ON searches FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY searches_delete_own
    ON searches FOR DELETE
    USING (auth.uid() = user_id);

-- LISTING SCORES POLICIES
ALTER TABLE listing_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY listing_scores_select_own
    ON listing_scores FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY listing_scores_insert_own
    ON listing_scores FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY listing_scores_update_own
    ON listing_scores FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY listing_scores_delete_own
    ON listing_scores FOR DELETE
    USING (auth.uid() = user_id);

-- COST ESTIMATES POLICIES
ALTER TABLE cost_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY cost_estimates_select_own
    ON cost_estimates FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY cost_estimates_insert_own
    ON cost_estimates FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY cost_estimates_update_own
    ON cost_estimates FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY cost_estimates_delete_own
    ON cost_estimates FOR DELETE
    USING (auth.uid() = user_id);

-- ==========================================
-- COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON TABLE user_preferences IS 'Structured user preferences for rental searches';
COMMENT ON TABLE searches IS 'Search query history and parameters';
COMMENT ON TABLE listing_scores IS 'AI-generated scores for listings based on user preferences';
COMMENT ON TABLE cost_estimates IS 'Detailed cost breakdowns for move-in, monthly, and moving expenses';

COMMENT ON COLUMN user_preferences.commute_address IS 'Address for commute time calculations';
COMMENT ON COLUMN listing_scores.overall_score IS 'Overall match score (0-100) for the listing';
COMMENT ON COLUMN listing_scores.reasoning IS 'AI-generated explanation of the score';
COMMENT ON COLUMN cost_estimates.move_in_total IS 'Total upfront costs to move in';
COMMENT ON COLUMN cost_estimates.monthly_total IS 'Total monthly recurring costs';
