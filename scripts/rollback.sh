#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# LA Rent Finder - Rollback Script
# Run manually on the VPS to revert to the previous release.
#
# Usage: bash /var/www/la-rent-finder/current/scripts/rollback.sh
# ============================================================

APP_NAME="la-rent-finder"
APP_DIR="/var/www/${APP_NAME}"
RELEASES_DIR="${APP_DIR}/releases"
CURRENT_DIR="${APP_DIR}/current"
ENV_FILE="${APP_DIR}/.env.local"

echo "=== Rollback ${APP_NAME} ==="

# Find the previous release (second newest directory)
PREVIOUS=$(ls -dt "${RELEASES_DIR}"/*/ 2>/dev/null | sed -n '2p' | sed 's:/$::')

if [ -z "${PREVIOUS}" ]; then
  echo "ERROR: No previous release found to roll back to."
  echo "Available releases:"
  ls -dt "${RELEASES_DIR}"/*/ 2>/dev/null || echo "  (none)"
  exit 1
fi

echo "Current:      $(readlink -f "${CURRENT_DIR}" 2>/dev/null || echo 'not set')"
echo "Rolling back:  ${PREVIOUS}"
echo ""

# Swap symlink to previous release
ln -sfn "${PREVIOUS}" "${CURRENT_DIR}"

# Source env and reload PM2
set -a
[ -f "${ENV_FILE}" ] && source "${ENV_FILE}"
set +a

pm2 reload "${APP_NAME}" --update-env

echo ""
echo "=== Rollback complete ==="
echo "Active: ${CURRENT_DIR} -> ${PREVIOUS}"
pm2 list
