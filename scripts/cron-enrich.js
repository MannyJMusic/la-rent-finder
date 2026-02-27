#!/usr/bin/env node
/**
 * PM2 cron script: enrich listings that are missing photos/descriptions.
 * Runs on schedule defined in ecosystem.config.cjs (cron-enrich-listings app).
 */

const BASE_URL = process.env.CRON_BASE_URL || 'http://localhost:3001';
const SECRET = process.env.CRON_SECRET;
const LIMIT = process.env.ENRICH_BATCH_SIZE || '40';

if (!SECRET) {
  console.error('[cron-enrich] CRON_SECRET is not set — aborting');
  process.exit(1);
}

const url = `${BASE_URL}/api/cron/enrich-listings?limit=${LIMIT}`;

console.log(`[cron-enrich] Calling ${url}`);

fetch(url, {
  method: 'GET',
  headers: { Authorization: `Bearer ${SECRET}` },
  signal: AbortSignal.timeout(300_000), // 5 min timeout — enrichment is rate-limited
})
  .then((res) => res.json())
  .then((data) => {
    console.log('[cron-enrich] Result:', JSON.stringify(data));
    process.exit(0);
  })
  .catch((err) => {
    console.error('[cron-enrich] Error:', err.message);
    process.exit(1);
  });
