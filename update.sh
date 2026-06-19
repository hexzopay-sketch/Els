#!/bin/bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[-]${NC} $1"; exit 1; }

if [ $EUID -ne 0 ]; then err "Run as root (sudo)."; fi

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVICE_NAME="levl7-server"

log "Rebuilding Go server..."
cd "$REPO_DIR/cnc" && go build -o "$REPO_DIR/server" . && cd "$REPO_DIR"

log "Rebuilding frontend..."
npm run build

log "Copying to embed dir..."
rm -rf cnc/out && cp -r out cnc/out

log "Rebuilding Go server with updated frontend..."
cd "$REPO_DIR/cnc" && go build -o "$REPO_DIR/server" . && cd "$REPO_DIR"

log "Restarting service..."
systemctl restart "$SERVICE_NAME"

log "Update complete."
