#!/usr/bin/env node
/**
 * PM2 cron script: sync listings from all API sources.
 * Runs on schedule defined in ecosystem.config.cjs (cron-sync-listings app).
 */

const BASE_URL = process.env.CRON_BASE_URL || 'http://localhost:3001';
const SECRET = process.env.CRON_SECRET;

if (!SECRET) {
  console.error('[cron-sync] CRON_SECRET is not set — aborting');
  process.exit(1);
}

const url = `${BASE_URL}/api/cron/sync-listings`;

console.log(`[cron-sync] Calling ${url}`);

fetch(url, {
  method: 'GET',
  headers: { Authorization: `Bearer ${SECRET}` },
  signal: AbortSignal.timeout(120_000), // 2 min timeout
})
  .then((res) => res.json())
  .then((data) => {
    console.log('[cron-sync] Result:', JSON.stringify(data));
    process.exit(0);
  })
  .catch((err) => {
    console.error('[cron-sync] Error:', err.message);
    process.exit(1);
  });
