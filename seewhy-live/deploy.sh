#!/bin/bash
# ============================================================
# SeeWhy LIVE — VPS Deployment Script
# Target: Hostinger VPS — seewhylive.online (2.24.194.112)
# Usage:  chmod +x deploy.sh && ./deploy.sh
# ============================================================

set -euo pipefail

VPS_USER="${VPS_USER:-root}"
VPS_HOST="${VPS_HOST:-2.24.194.112}"
VPS_PORT="${VPS_PORT:-22}"
DOMAIN="${DOMAIN:-seewhylive.online}"
APP_DIR="/opt/seewhy-live"
SSH="ssh -p $VPS_PORT $VPS_USER@$VPS_HOST"
SCP="scp -P $VPS_PORT"

echo "=== SeeWhy LIVE — VPS Deployment ==="
echo "Target : $VPS_USER@$VPS_HOST"
echo "Domain : $DOMAIN"
echo "App dir: $APP_DIR"
echo ""

# ─── 1. Build images locally ────────────────────────────────────────────────

echo "[1/6] Building API image..."
docker build -f infra/docker/Dockerfile.api -t seewhy/api:latest .

echo "[1/6] Building Web image..."
docker build -f infra/docker/Dockerfile.web -t seewhy/web:latest .

# ─── 2. Push images to VPS via docker save/load ─────────────────────────────

echo "[2/6] Transferring images to VPS..."
docker save seewhy/api:latest | gzip | $SSH "docker load"
docker save seewhy/web:latest | gzip | $SSH "docker load"

# ─── 3. Upload configs ──────────────────────────────────────────────────────

echo "[3/6] Uploading config files..."
$SSH "mkdir -p $APP_DIR/infra/{nginx,docker,antigravity} $APP_DIR/infra/mediamtx"

rsync -avz --progress -e "ssh -p $VPS_PORT" \
  infra/ "$VPS_USER@$VPS_HOST:$APP_DIR/infra/"

$SCP infra/docker/docker-compose.prod.yml "$VPS_USER@$VPS_HOST:$APP_DIR/docker-compose.yml"

# ─── 4. VPS bootstrap ───────────────────────────────────────────────────────

echo "[4/6] Bootstrapping VPS..."
$SSH bash << 'REMOTE'
set -euo pipefail

# Docker
if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
fi

# Docker Compose plugin
if ! docker compose version &>/dev/null 2>&1; then
  apt-get update -q && apt-get install -y docker-compose-plugin
fi

# Certbot
if ! command -v certbot &>/dev/null; then
  apt-get update -q && apt-get install -y certbot python3-certbot-nginx
fi

# UFW
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 1935/tcp
ufw allow 40000:40100/udp
ufw allow 40000:40100/tcp
ufw --force enable

echo "Bootstrap complete"
REMOTE

# ─── 5. SSL (first-time only) ───────────────────────────────────────────────

echo "[5/6] Issuing SSL certificate..."
$SSH bash << REMOTE
set -euo pipefail
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  certbot certonly --standalone --non-interactive --agree-tos \
    -m admin@$DOMAIN \
    -d $DOMAIN -d www.$DOMAIN -d api.$DOMAIN \
    || echo "SSL: standalone failed (port 80 in use?). Run certbot manually after deploy."
else
  echo "SSL cert already exists, skipping"
fi
REMOTE

# ─── 6. Deploy ──────────────────────────────────────────────────────────────

echo "[6/6] Starting containers..."
$SSH bash << REMOTE
set -euo pipefail
cd $APP_DIR

if [ ! -f ".env" ]; then
  echo "ERROR: .env not found at $APP_DIR/.env"
  echo "Copy .env.example, fill in secrets, then re-run deploy."
  exit 1
fi

docker compose pull mediamtx 2>/dev/null || true
docker compose up -d --remove-orphans

# Wait for API health
echo "Waiting for API..."
for i in \$(seq 1 20); do
  if curl -sf http://localhost:4000/health >/dev/null 2>&1; then
    echo "API healthy"
    break
  fi
  sleep 3
done

docker compose ps
REMOTE

echo ""
echo "=== Deployment Complete ==="
echo "Web:  https://$DOMAIN"
echo "API:  https://api.$DOMAIN"
echo "RTMP: rtmp://$VPS_HOST:1935/live/<stream-key>"
echo ""
echo "First-time checklist:"
echo "  1. SSH in and create $APP_DIR/.env (copy from seewhy-live/.env.example)"
echo "  2. Fill in Supabase, Stripe, Anthropic, RS256 keys"
echo "  3. Run: cd $APP_DIR && docker compose restart api"
echo "  4. Visit https://$DOMAIN to verify"
