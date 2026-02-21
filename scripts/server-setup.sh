#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# LA Rent Finder - VPS Migration Script
# Migrates from the current source-based deployment to the
# standalone CI/CD deployment model.
#
# What's already on the server:
#   - Ubuntu 24.04, Node 22, PM2 6.x, Nginx 1.24
#   - la-rent-finder running via `npm start` at /var/www/la-rent-finder
#   - Nginx proxying to port 3001
#   - Other PM2 apps: recaster-website (port 3000), recaster-discord-bot
#
# What this script does:
#   1. Creates the releases/logs directories for atomic deploys
#   2. Updates nginx config with domain name + SSL-ready headers
#   3. Sets up SSL via certbot
#   4. Preserves the existing .env.local
#
# Usage:
#   ssh root@rent.digitalcrossroadsmusic.com 'bash -s' < scripts/server-setup.sh
# ============================================================

APP_NAME="la-rent-finder"
APP_DIR="/var/www/${APP_NAME}"
DOMAIN="rent.digitalcrossroadsmusic.com"

echo "=== LA Rent Finder - Migration to CI/CD ==="
echo "Domain: ${DOMAIN}"
echo ""

# --- 1. Create deployment directories ---
echo "[1/4] Creating deployment directories..."
mkdir -p "${APP_DIR}/current"
mkdir -p "${APP_DIR}/releases"
mkdir -p "${APP_DIR}/logs"
echo "  Created: current/, releases/, logs/"

# --- 2. Verify .env.local exists ---
echo "[2/4] Checking environment file..."
if [ -f "${APP_DIR}/.env.local" ]; then
  echo "  .env.local exists ($(wc -l < "${APP_DIR}/.env.local") lines)"
else
  echo "  WARNING: .env.local not found at ${APP_DIR}/.env.local"
  echo "  The deploy will need this file for runtime secrets."
fi

# --- 3. Update Nginx configuration ---
echo "[3/4] Updating Nginx configuration..."

# Back up current config
if [ -f "/etc/nginx/sites-available/${APP_NAME}" ]; then
  cp "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-available/${APP_NAME}.bak"
  echo "  Backed up existing config to ${APP_NAME}.bak"
fi

cat > /etc/nginx/sites-available/${APP_NAME} << 'NGINXEOF'
server {
    listen 80;
    server_name rent.digitalcrossroadsmusic.com;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;

        # Buffer sizes for Next.js
        proxy_buffering on;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Cache Next.js static assets (content-hashed, safe to cache forever)
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3001;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/xml+rss application/atom+xml image/svg+xml;
}
NGINXEOF

# Ensure symlink exists
ln -sf /etc/nginx/sites-available/${APP_NAME} /etc/nginx/sites-enabled/${APP_NAME}

# Test and reload
if nginx -t 2>&1; then
  systemctl reload nginx
  echo "  Nginx config updated and reloaded"
else
  echo "  ERROR: Nginx config test failed! Restoring backup..."
  if [ -f "/etc/nginx/sites-available/${APP_NAME}.bak" ]; then
    cp "/etc/nginx/sites-available/${APP_NAME}.bak" "/etc/nginx/sites-available/${APP_NAME}"
    systemctl reload nginx
  fi
  exit 1
fi

# --- 4. Set up SSL with certbot ---
echo "[4/4] Setting up SSL..."
if certbot certificates 2>/dev/null | grep -q "${DOMAIN}"; then
  echo "  SSL certificate already exists for ${DOMAIN}"
else
  echo "  Requesting SSL certificate for ${DOMAIN}..."
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --email admin@digitalcrossroadsmusic.com --redirect || {
    echo ""
    echo "  SSL setup failed. You can run it manually later:"
    echo "    sudo certbot --nginx -d ${DOMAIN}"
  }
fi

echo ""
echo "=== Migration Complete ==="
echo ""
echo "Server is ready for CI/CD deploys. What happens next:"
echo ""
echo "  1. GitHub Actions builds the standalone app"
echo "  2. Artifacts are rsync'd to ${APP_DIR}/staging/"
echo "  3. deploy.sh creates a release, swaps the symlink, reloads PM2"
echo ""
echo "  The first deploy will:"
echo "    - Stop the old 'npm start' PM2 process"
echo "    - Start the new standalone server.js in cluster mode"
echo "    - Use your existing .env.local for runtime secrets"
echo ""
echo "  To trigger: push to main branch on GitHub"
