#!/bin/bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[-]${NC} $1"; exit 1; }

if [ $EUID -ne 0 ]; then err "Run as root (sudo)."; fi

# -- Config ----------------------------------------------------------------
DOMAIN="${1:-}"
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

# -- MQTT Setup -----------------------------------------------------------
log "Configuring Mosquitto MQTT..."
MQTT_PASS=$(tr -dc 'a-zA-Z0-9' < /dev/urandom | fold -w 24 | head -1)

cat > /etc/mosquitto/conf.d/levl7.conf <<EOF
listener 1883 127.0.0.1
allow_anonymous false
password_file /etc/mosquitto/levl7.passwd
EOF

mosquitto_passwd -b /etc/mosquitto/levl7.passwd levl7c2 "$MQTT_PASS"

# Update MQTT password in Go source
sed -i "s|Password: \".*\"|Password: \"${MQTT_PASS}\"|" "$REPO_DIR/cnc/mqtt.go"

log "Rebuilding server with MQTT credentials..."
cd cnc && go build -o "$REPO_DIR/server" . && cd "$REPO_DIR"

systemctl enable mosquitto
systemctl restart mosquitto

# -- Systemd Service ------------------------------------------------------
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

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

# -- Nginx -----------------------------------------------------------------
log "Configuring nginx..."
mkdir -p /etc/nginx/snippets

cat > "$NGINX_CONF" <<EOF
server {
    listen 80;
    server_name $DOMAIN;
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:$SERVER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }

    location /ws {
        proxy_pass http://127.0.0.1:$SERVER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }
}
EOF

ln -sf "$NGINX_CONF" "$NGINX_ENABLED"
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t || err "Nginx config test failed."

# -- SSL via Certbot -------------------------------------------------------
log "Obtaining SSL certificate..."
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email "admin@${DOMAIN}" --redirect || \
  warn "Certbot failed. You may need to run: certbot --nginx -d $DOMAIN"

systemctl reload nginx

# -- Start ----------------------------------------------------------------
log "Starting $SERVICE_NAME..."
systemctl restart "$SERVICE_NAME"

log "--- Installation complete ---"
log "Domain: https://$DOMAIN"
log "MQTT password: $MQTT_PASS"
log ""
log "Save the MQTT password above. Update your bots to connect to this server."
