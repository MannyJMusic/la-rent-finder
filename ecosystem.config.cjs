module.exports = {
  apps: [
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
  ],
};
