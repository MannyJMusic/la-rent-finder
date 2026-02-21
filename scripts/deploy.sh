#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# LA Rent Finder - Deployment Script
# Runs on the VPS after GitHub Actions uploads build artifacts.
# Called automatically by the deploy workflow via SSH.
#
# Handles both:
#   - First deploy (migrates from old npm-start to standalone)
#   - Subsequent deploys (atomic symlink swap + PM2 reload)
# ============================================================

APP_NAME="la-rent-finder"
APP_DIR="/var/www/${APP_NAME}"
CURRENT_DIR="${APP_DIR}/current"
RELEASES_DIR="${APP_DIR}/releases"
ENV_FILE="${APP_DIR}/.env.local"
TIMESTAMP=$(date +%Y%m%d%H%M%S)
RELEASE_DIR="${RELEASES_DIR}/${TIMESTAMP}"
STAGING_DIR="${APP_DIR}/staging"

echo "=== Deploying ${APP_NAME} (release: ${TIMESTAMP}) ==="

# --- 1. Create release directory from staged artifacts ---
echo "[1/5] Setting up release directory..."
if [ ! -d "${STAGING_DIR}" ]; then
  echo "ERROR: Staging directory not found at ${STAGING_DIR}"
  exit 1
fi

mkdir -p "${RELEASE_DIR}"
cp -a "${STAGING_DIR}/." "${RELEASE_DIR}/"

# --- 2. Link the .env.local file ---
echo "[2/5] Linking environment file..."
if [ -f "${ENV_FILE}" ]; then
  ln -sf "${ENV_FILE}" "${RELEASE_DIR}/.env.local"
  echo "  Linked .env.local"
else
  echo "  WARNING: ${ENV_FILE} not found. Runtime secrets will be missing!"
fi

# --- 3. Swap the current symlink (atomic) ---
echo "[3/5] Activating new release..."
ln -sfn "${RELEASE_DIR}" "${CURRENT_DIR}"
echo "  current -> ${RELEASE_DIR}"

# --- 4. Restart PM2 ---
echo "[4/5] Restarting application..."

# Source env file for PM2
set -a
[ -f "${ENV_FILE}" ] && source "${ENV_FILE}"
set +a

if pm2 describe "${APP_NAME}" > /dev/null 2>&1; then
  # Check if the existing process is the old npm-start version
  CURRENT_SCRIPT=$(pm2 show "${APP_NAME}" 2>/dev/null | grep "script path" | awk '{print $NF}')

  if [ "${CURRENT_SCRIPT}" != "${CURRENT_DIR}/server.js" ]; then
    # Old process (npm start) — stop it and start fresh with standalone
    echo "  Migrating from old deployment to standalone..."
    pm2 delete "${APP_NAME}" 2>/dev/null || true

    if [ -f "${CURRENT_DIR}/ecosystem.config.cjs" ]; then
      pm2 start "${CURRENT_DIR}/ecosystem.config.cjs"
    else
      cd "${CURRENT_DIR}"
      PORT=3001 HOSTNAME=0.0.0.0 pm2 start server.js --name "${APP_NAME}" -i max
    fi
  else
    # Already running standalone — graceful reload (zero-downtime)
    pm2 reload "${APP_NAME}" --update-env
  fi
else
  # No process exists — first deploy
  echo "  Starting application for the first time..."
  if [ -f "${CURRENT_DIR}/ecosystem.config.cjs" ]; then
    pm2 start "${CURRENT_DIR}/ecosystem.config.cjs"
  else
    cd "${CURRENT_DIR}"
    PORT=3001 HOSTNAME=0.0.0.0 pm2 start server.js --name "${APP_NAME}" -i max
  fi
fi

pm2 save

# --- 5. Cleanup old releases (keep last 5) ---
echo "[5/5] Cleaning up old releases..."
cd "${RELEASES_DIR}"
ls -dt */ 2>/dev/null | tail -n +6 | xargs -r rm -rf
echo "  Kept last 5 releases"

# Clean up staging directory
rm -rf "${STAGING_DIR}"

echo ""
echo "=== Deploy complete ==="
echo "Release: ${TIMESTAMP}"
echo "Active:  ${CURRENT_DIR} -> ${RELEASE_DIR}"
pm2 list
