#!/bin/bash
# ============================================================
# SeeWhy LIVE — VPS Server Setup (no Docker)
# Target: 2.24.194.112 / seewhylive.online
# Run as root on a fresh Hostinger VPS (Ubuntu 22.04)
# Usage: bash server-setup.sh
# ============================================================

set -euo pipefail

DOMAIN="seewhylive.online"
EMAIL="swanythree23@gmail.com"
APP_DIR="/opt/seewhy-live/app"
CERTBOT_WEBROOT="/var/www/certbot"

echo "=== SeeWhy LIVE Server Setup ==="
echo "Domain : $DOMAIN"
echo "App dir: $APP_DIR"
echo ""

# ─── Step 1: System packages ────────────────────────────────────────────────

echo "[1/8] Installing system packages..."
apt-get update -q
apt-get install -y curl git nginx certbot python3-certbot-nginx ufw

# Node 20 via NodeSource
if ! command -v node &>/dev/null || [[ "$(node -v)" != v20* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

# PM2
npm install -g pm2

echo "Node $(node -v) | npm $(npm -v) | pm2 $(pm2 --version)"

# ─── Step 2: Firewall ───────────────────────────────────────────────────────

echo "[2/8] Configuring UFW..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 1935/tcp          # RTMP
ufw allow 40000:40100/udp   # MediaSoup RTC
ufw allow 40000:40100/tcp
ufw --force enable
ufw status

# ─── Step 3: App directory + .env.local ─────────────────────────────────────

echo "[3/8] Preparing app directory..."
mkdir -p "$APP_DIR" "$CERTBOT_WEBROOT"

if [ ! -f "$APP_DIR/.env.local" ]; then
  echo "Creating .env.local..."
  cat > "$APP_DIR/.env.local" << 'ENVEOF'
NEXT_PUBLIC_APP_URL=https://seewhylive.online
NEXT_PUBLIC_WS_URL=wss://seewhylive.online
NEXT_PUBLIC_API_URL=https://api.seewhylive.online
NEXT_PUBLIC_SUPABASE_URL=https://rxlgywvfclyjdfyvfvyc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_CtHMhtj7hLmg8jejBnUrfA_BsWb0Lpb
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_51Svbvv2N0KWn00Qu7HDAR92cb2M446cd6pEDs8CwmswhMowxtfOKRhljIlFOyRrJfddB6GUQrTSYg0WEe4SYmBA900a7dliDK
NODE_ENV=production
PORT=3000
ENVEOF
  echo ".env.local created"
else
  echo ".env.local already exists, skipping"
fi

# ─── Step 4: Nginx — HTTP only (for certbot challenge) ──────────────────────

echo "[4/8] Setting up nginx (HTTP, pre-SSL)..."
rm -f /etc/nginx/sites-enabled/*
cat > /etc/nginx/sites-available/seewhy << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN api.$DOMAIN;

    location /.well-known/acme-challenge/ {
        root $CERTBOT_WEBROOT;
        try_files \$uri =404;
    }

    location / {
        return 200 "SeeWhy LIVE — SSL pending";
        add_header Content-Type text/plain;
    }
}
NGINXEOF
ln -sf /etc/nginx/sites-available/seewhy /etc/nginx/sites-enabled/seewhy
nginx -t && systemctl reload nginx

# Verify HTTP
echo "Checking HTTP..."
sleep 2
HTTP_STATUS=$(curl -so /dev/null -w "%{http_code}" "http://$DOMAIN/" || echo "000")
echo "HTTP status: $HTTP_STATUS"

# ─── Step 5: SSL Certificate ────────────────────────────────────────────────

echo "[5/8] Issuing SSL certificate..."
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  echo "Certificate already exists, renewing if needed..."
  certbot renew --quiet
else
  certbot certonly \
    --webroot \
    --webroot-path "$CERTBOT_WEBROOT" \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"
  echo "SSL certificate issued"
fi

# ─── Step 6: Nginx — HTTPS config ───────────────────────────────────────────

echo "[6/8] Writing HTTPS nginx config..."
cat > /etc/nginx/sites-available/seewhy << NGINXEOF
# HTTP → HTTPS redirect
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN api.$DOMAIN;
    location /.well-known/acme-challenge/ { root $CERTBOT_WEBROOT; }
    location / { return 301 https://\$host\$request_uri; }
}

# seewhylive.online — Next.js frontend
server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}

# api.seewhylive.online — Express API + Socket.io
server {
    listen 443 ssl http2;
    server_name api.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location /socket.io {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINXEOF
nginx -t && systemctl reload nginx

# ─── Step 7: Build + start Next.js ──────────────────────────────────────────

echo "[7/8] Building Next.js app..."
cd "$APP_DIR"

# Ensure package.json exists
if [ ! -f "package.json" ]; then
  echo "ERROR: $APP_DIR/package.json not found."
  echo "Upload the seewhy-live/apps/web directory first:"
  echo "  scp -r seewhy-live/apps/web/* root@$DOMAIN:/opt/seewhy-live/app/"
  exit 1
fi

npm install
npm run build

# Copy standalone server + static files
cp -r .next/standalone/. /opt/seewhy-live/server/
cp -r .next/static /opt/seewhy-live/server/.next/static
[ -d public ] && cp -r public /opt/seewhy-live/server/public

echo "[7/8] Starting with PM2..."
pm2 delete seewhy-web 2>/dev/null || true
pm2 start /opt/seewhy-live/server/server.js \
  --name seewhy-web \
  --env production \
  -- --port 3000

pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash || true

# ─── Step 8: Verify ─────────────────────────────────────────────────────────

echo "[8/8] Verifying..."
sleep 3
HTTPS_STATUS=$(curl -so /dev/null -w "%{http_code}" "https://$DOMAIN/" || echo "000")
echo "HTTPS status: $HTTPS_STATUS"
pm2 status

echo ""
echo "=== Setup Complete ==="
echo "Web:  https://$DOMAIN"
echo "API:  https://api.$DOMAIN  (start your API separately)"
echo "RTMP: rtmp://2.24.194.112:1935/live/<stream-key>"
echo ""
echo "Next steps:"
echo "  1. Set STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY in .env.local"
echo "  2. Deploy the API: cd /opt/seewhy-live && node api/dist/index.js (or PM2)"
echo "  3. Add certbot cron: echo '0 0,12 * * * root certbot renew --quiet && systemctl reload nginx' >> /etc/cron.d/certbot"
