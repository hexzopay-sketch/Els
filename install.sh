#!/bin/bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[-]${NC} $1"; exit 1; }

for arg in "$@"; do
  [ "$arg" = "--help" ] || [ "$arg" = "-h" ] && { echo "Usage: $0 [domain] [--cc] [--nosys]"; echo "  --cc     Codespace mode (auto URL, no nginx/certbot, port prompt)"; echo "  --nosys  Skip systemd service setup"; exit 0; }
done
[ $EUID -ne 0 ] && err "Run as root (sudo)."

NOSYS=false; CC=false
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --cc) CC=true; NOSYS=true; shift ;;
    --nosys) NOSYS=true; shift ;;
    -*) err "Unknown flag: $1" ;;
    *) POSITIONAL+=("$1"); shift ;;
  esac
done

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_PORT=8080
SERVER_BIN="$REPO_DIR/server"
SERVER_LOG="$REPO_DIR/server.log"

if $CC; then
  CODESPACE_NAME="${CODESPACE_NAME:-}"
  if [ -z "$CODESPACE_NAME" ]; then
    read -r -p "Enter your codespace name (from 'gh codespace list'): " CODESPACE_NAME
    [ -z "$CODESPACE_NAME" ] && err "Codespace name required."
  fi
  DOMAIN="${CODESPACE_NAME}-${SERVER_PORT}.app.github.dev"
  log "Codespace: $CODESPACE_NAME — URL: https://$DOMAIN"
else
  DOMAIN="${POSITIONAL[0]:-}"
  if [ -z "$DOMAIN" ]; then
    read -r -p "Enter domain (e.g. panel.yoursite.com): " DOMAIN
    [ -z "$DOMAIN" ] && err "Domain required."
  fi
  log "Installing for domain: $DOMAIN"
fi

log "Repo dir: $REPO_DIR"

# -- Dependencies ---------------------------------------------------------
log "Installing system packages..."
apt-get update -qq
PKGS="curl gnupg software-properties-common mosquitto mosquitto-clients"
if ! $CC; then
  PKGS="$PKGS nginx certbot python3-certbot-nginx"
fi
apt-get install -y -qq $PKGS

if ! command -v go &>/dev/null; then
  log "Installing Go..."
  wget -q https://go.dev/dl/go1.22.5.linux-amd64.tar.gz -O /tmp/go.tar.gz
  rm -rf /usr/local/go && tar -C /usr/local -xzf /tmp/go.tar.gz
  echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile.d/go.sh
  export PATH=$PATH:/usr/local/go/bin
fi

if ! command -v node &>/dev/null; then
  log "Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

# -- Build Go Server ------------------------------------------------------
log "Building Go server..."
cd "$REPO_DIR"
cd cnc && go build -buildvcs=false -o "$REPO_DIR/server" . && cd "$REPO_DIR"

# -- Build Frontend -------------------------------------------------------
log "Building frontend..."
npm ci --omit=optional
npm run build
log "Copying frontend to embed dir..."
rm -rf cnc/out && cp -r out cnc/out

# -- Rebuild with embedded frontend ---------------------------------------
log "Rebuilding Go server with embedded frontend..."
cd cnc && go build -buildvcs=false -o "$REPO_DIR/server" . && cd "$REPO_DIR"

# -- MQTT Setup (skip -- container compat) ---------------------------------
MQTT_PASS=""
warn "MQTT setup skipped (run 'mosquitto_passwd' manually if needed)"

# -- Systemd Service ------------------------------------------------------
if ! $CC && ! $NOSYS; then
  SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
  log "Creating systemd service..."
  cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=LEVL7 C2 Server
After=network.target mosquitto.service
Wants=mosquitto.service

[Service]
Type=simple
User=root
WorkingDirectory=$REPO_DIR
ExecStart=$REPO_DIR/server -web $SERVER_PORT
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
  systemctl daemon-reload || warn "systemd not available"
  systemctl enable "$SERVICE_NAME" || warn "Could not enable service via systemd"
fi

# -- Nginx -----------------------------------------------------------------
if ! $CC; then
  NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
  NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

  log "Configuring nginx..."
  mkdir -p /etc/nginx/snippets
  cat > "$NGINX_CONF" <<'NGINXEOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:SERVER_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location /ws {
        proxy_pass http://127.0.0.1:SERVER_PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
NGINXEOF
  sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g; s/SERVER_PORT_PLACEHOLDER/$SERVER_PORT/g" "$NGINX_CONF"
  ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
  rm -f /etc/nginx/sites-enabled/default
  nginx -t || err "Nginx config test failed."

  if command -v systemctl &>/dev/null && systemctl is-system-running &>/dev/null 2>&1; then
    systemctl restart nginx 2>/dev/null || systemctl start nginx 2>/dev/null || true
  else
    nginx 2>/dev/null || true
  fi
fi

# -- Start Go Server --------------------------------------------------------
log "Starting Go server..."
cd "$REPO_DIR"
nohup "$SERVER_BIN" -web "$SERVER_PORT" > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
sleep 1

SERVER_UP=false
if kill -0 "$SERVER_PID" 2>/dev/null; then
  if command -v ss &>/dev/null; then
    ss -tlnp 2>/dev/null | grep -q ":$SERVER_PORT " && SERVER_UP=true || true
  else
    SERVER_UP=true
  fi
fi

if $SERVER_UP; then
  log "Server running (PID $SERVER_PID) on port $SERVER_PORT"
else
  warn "Server failed to start. Error log:"
  tail -30 "$SERVER_LOG" 2>/dev/null | while IFS= read -r line; do warn "  $line"; done || true
  warn "Try manually: cd $REPO_DIR && ./server -web $SERVER_PORT"
fi

# -- Codespace: auto port visibility -------------------------------------
if $CC; then
  if command -v gh &>/dev/null && [ -n "$CODESPACE_NAME" ]; then
    log "Making port $SERVER_PORT public..."
    gh codespace ports visibility "$SERVER_PORT":public -c "$CODESPACE_NAME" 2>/dev/null && \
      log "Port $SERVER_PORT is now public" || \
      warn "Could not auto-set port visibility. Try: VS Code Ports tab → right-click $SERVER_PORT → Port Visibility → Public"
  else
    warn "Set port $SERVER_PORT to Public in VS Code: Ports tab → right-click → Port Visibility → Public"
  fi
  log "Your panel is at: https://$DOMAIN"
else
  # -- SSL via Certbot (non-codespace) ---------------------------------------
  log "Obtaining SSL certificate..."
  certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}" --redirect || \
    warn "Certbot failed. You may need to run: certbot --nginx -d $DOMAIN"
fi

log "--- Installation complete ---"
log "Domain: https://$DOMAIN"
log "MQTT password: $MQTT_PASS"
