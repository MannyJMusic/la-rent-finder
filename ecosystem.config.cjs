module.exports = {
  apps: [
    // ─── Main App ────────────────────────────────────────────────
    {
      name: 'la-rent-finder',
      script: './server.js',
      cwd: '/var/www/la-rent-finder/current',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        HOSTNAME: '0.0.0.0',
      },
      // Runtime secrets loaded from .env.local on the VPS
      env_file: '/var/www/la-rent-finder/.env.local',
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/www/la-rent-finder/logs/error.log',
      out_file: '/var/www/la-rent-finder/logs/output.log',
      merge_logs: true,
      kill_timeout: 5000,
      listen_timeout: 10000,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 1000,
    },

    // ─── Cron: Sync Listings (daily at 3am) ──────────────────────
    {
      name: 'cron-sync-listings',
      script: './scripts/cron-sync.js',
      cwd: '/var/www/la-rent-finder/current',
      cron_restart: '0 3 * * *',
      autorestart: false,
      watch: false,
      env_file: '/var/www/la-rent-finder/.env.local',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/www/la-rent-finder/logs/cron-sync-error.log',
      out_file: '/var/www/la-rent-finder/logs/cron-sync-output.log',
      merge_logs: true,
    },

    // ─── Cron: Enrich Listings (every 2 hours) ───────────────────
    // Backfills photos/descriptions for RentCast listings via cross-source lookup.
    // 40 listings/run × 6s rate-limit delay ≈ 4 min per run.
    // Once backfill is complete this becomes a no-op (query returns 0 rows).
    {
      name: 'cron-enrich-listings',
      script: './scripts/cron-enrich.js',
      cwd: '/var/www/la-rent-finder/current',
      cron_restart: '0 */2 * * *',
      autorestart: false,
      watch: false,
      env_file: '/var/www/la-rent-finder/.env.local',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/var/www/la-rent-finder/logs/cron-enrich-error.log',
      out_file: '/var/www/la-rent-finder/logs/cron-enrich-output.log',
      merge_logs: true,
    },
  ],
};
