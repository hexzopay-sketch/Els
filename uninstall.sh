#!/bin/bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[-]${NC} $1"; exit 1; }

if [ $EUID -ne 0 ]; then err "Run as root (sudo)."; fi

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="levl7-server"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

log "Stopping services..."
systemctl stop "$SERVICE_NAME" 2>/dev/null || true
systemctl disable "$SERVICE_NAME" 2>/dev/null || true

log "Removing systemd service..."
rm -f "$SERVICE_FILE"
systemctl daemon-reload

log "Removing nginx configs..."
for f in /etc/nginx/sites-enabled/*; do
  if grep -q "$REPO_DIR/server" "$f" 2>/dev/null || grep -q "proxy_pass http://127.0.0.1:" "$f" 2>/dev/null; then
    domain=$(basename "$f")
    rm -f "/etc/nginx/sites-available/$domain" "/etc/nginx/sites-enabled/$domain"
    log "Removed nginx config: $domain"
  fi
done
rm -f /etc/nginx/snippets/levl7*

log "Removing SSL certificates (if any)..."
certbot delete --non-interactive 2>/dev/null || true

log "Removing Mosquitto MQTT config..."
rm -f /etc/mosquitto/conf.d/levl7.conf
rm -f /etc/mosquitto/levl7.passwd

log "Reloading services..."
systemctl reload nginx 2>/dev/null || true
systemctl restart mosquitto 2>/dev/null || true

log "Removing compiled binary..."
rm -f "$REPO_DIR/server"

log "--- Uninstall complete ---"
log "The repo at $REPO_DIR is untouched."
log "To also remove dependencies (nginx, certbot, mosquitto, go, node):"
log "  apt-get purge nginx certbot mosquitto && apt-get autoremove"
