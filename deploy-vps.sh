#!/bin/bash
# ============================================================
# SwanyThree VPS Deployment Script
# Target: Hostinger KVM — srv1587098.hstgr.cloud (2.24.198.112)
# Usage: chmod +x deploy-vps.sh && ./deploy-vps.sh
# ============================================================

set -e

VPS_USER="${VPS_USER:-root}"
VPS_HOST="${VPS_HOST:-srv1587098.hstgr.cloud}"
VPS_PORT="${VPS_PORT:-22}"
APP_DIR="/opt/swanythree"
DOMAIN="${DOMAIN:-srv1587098.hstgr.cloud}"

echo "=== SwanyThree VPS Deployment ==="
echo "Target: $VPS_USER@$VPS_HOST"
echo "App Dir: $APP_DIR"
echo ""

# ─── Local build ──────────────────────────────────────────────────────────────

echo "[1/6] Building frontend..."
cd frontend
npm ci
npm run build
cd ..

echo "[2/6] Building backend..."
cd backend
npm ci
npm run build
cd ..

# ─── Sync to VPS ──────────────────────────────────────────────────────────────

echo "[3/6] Uploading to VPS..."
ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" "mkdir -p $APP_DIR/{backend,frontend,nginx-rtmp}"

rsync -avz --progress -e "ssh -p $VPS_PORT" \
  --exclude node_modules --exclude .git --exclude .env \
  backend/ "$VPS_USER@$VPS_HOST:$APP_DIR/backend/"

rsync -avz --progress -e "ssh -p $VPS_PORT" \
  frontend/dist/ "$VPS_USER@$VPS_HOST:$APP_DIR/frontend/dist/"

rsync -avz --progress -e "ssh -p $VPS_PORT" \
  streaming/ "$VPS_USER@$VPS_HOST:$APP_DIR/nginx-rtmp/"

scp -P $VPS_PORT docker-compose.yml "$VPS_USER@$VPS_HOST:$APP_DIR/"

# ─── VPS Setup ────────────────────────────────────────────────────────────────

echo "[4/6] Configuring VPS..."
ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" << 'REMOTE'
set -e

# Install Docker if not present
if ! command -v docker &> /dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker $USER
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
  echo "Installing Docker Compose..."
  curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
  chmod +x /usr/local/bin/docker-compose
fi

# Install Certbot for SSL
if ! command -v certbot &> /dev/null; then
  apt-get update -q
  apt-get install -y certbot python3-certbot-nginx
fi

# Install PM2 for Node process management
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi

# UFW Firewall rules
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 1935/tcp  # RTMP
ufw allow 3000/tcp  # Frontend dev
ufw allow 3001/tcp  # Backend dev
ufw allow 7880/tcp  # LiveKit
ufw --force enable

echo "VPS configuration complete"
REMOTE

# ─── Deploy Application ───────────────────────────────────────────────────────

echo "[5/6] Deploying application..."
ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" << REMOTE
set -e
cd $APP_DIR

# Check for .env file
if [ ! -f ".env" ]; then
  echo "WARNING: .env file not found. Copy backend/.env.example to $APP_DIR/.env and fill in values"
  cp backend/.env.example .env
fi

# Pull and start containers
docker-compose pull 2>/dev/null || true
docker-compose up -d --build

# Run database migrations
docker-compose exec -T backend npx prisma migrate deploy

# Check status
docker-compose ps

echo "Deployment complete!"
REMOTE

# ─── SSL Setup ────────────────────────────────────────────────────────────────

echo "[6/6] Setting up SSL (optional)..."
if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "localhost" ]; then
  ssh -p $VPS_PORT "$VPS_USER@$VPS_HOST" << REMOTE
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN 2>/dev/null || \
      echo "SSL setup skipped (domain may not be pointed to VPS yet)"
REMOTE
fi

echo ""
echo "=== Deployment Complete ==="
echo "Frontend: http://$VPS_HOST:3000"
echo "Backend:  http://$VPS_HOST:3001"
echo "RTMP:     rtmp://$VPS_HOST:1935/live"
echo "n8n:      https://n8n.$VPS_HOST"
echo ""
echo "Next steps:"
echo "1. SSH into the server and edit /opt/swanythree/.env"
echo "2. Add your API keys (Stripe, LiveKit, Anthropic, YouTube)"
echo "3. Run: cd /opt/swanythree && docker-compose restart backend"
echo "4. Visit http://$VPS_HOST:3000 to verify deployment"
