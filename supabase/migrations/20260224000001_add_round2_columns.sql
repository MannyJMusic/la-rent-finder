-- Round 2 feature columns for the apartments/properties table
-- Adds: year_built, laundry, noise scores, ISP speeds, inactive reporting, listed_date

-- New columns for Round 2 features
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS year_built INTEGER;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS laundry_category VARCHAR(50);
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS noise_score INTEGER;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS noise_traffic INTEGER;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS noise_airports INTEGER;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS noise_local INTEGER;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS noise_text VARCHAR(50);
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS isp_download_mbps NUMERIC(8,2);
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS isp_upload_mbps NUMERIC(8,2);
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS reported_as_inactive BOOLEAN DEFAULT false;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS reported_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE apartments ADD COLUMN IF NOT EXISTS listed_date TIMESTAMP WITH TIME ZONE;

-- Indexes for new filterable columns
CREATE INDEX IF NOT EXISTS idx_apartments_year_built ON apartments (year_built);
CREATE INDEX IF NOT EXISTS idx_apartments_laundry ON apartments (laundry_category);
CREATE INDEX IF NOT EXISTS idx_apartments_noise_score ON apartments (noise_score);
CREATE INDEX IF NOT EXISTS idx_apartments_isp_download ON apartments (isp_download_mbps);
CREATE INDEX IF NOT EXISTS idx_apartments_listed_date ON apartments (listed_date);
CREATE INDEX IF NOT EXISTS idx_apartments_reported ON apartments (reported_as_inactive) WHERE reported_as_inactive = true;
