# SwanyThree — Live Streaming Platform

A production-ready full-stack streaming platform with multi-platform fanout, Watch Party, real-time chat, WebRTC video conferencing, and Stripe monetization.

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Cache / Queue | Redis + BullMQ |
| Streaming | FFmpeg + Nginx RTMP |
| Video Conferencing | LiveKit WebRTC |
| Real-time Chat | Supabase (postgres_changes) |
| Payments | Stripe Connect (90/10 split) |
| AI | Anthropic Claude + HeyGen avatars |
| Guest Management | VDO.Ninja |
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Deployment | Docker Compose + Kubernetes + Hostinger VPS |

---

## Features

- **Multi-platform streaming** — Go live to YouTube, Twitch, Facebook, TikTok, and 4+ more simultaneously via FFmpeg fanout
- **Guest Destination Streaming** — Camera/mic preview with live audio meters and one-click go-live button
- **Watch Party** — 20-person video panel grid with synchronized YouTube playback and YouTube search
- **LiveKit WebRTC** — Real multi-user video + screen sharing with host moderation (kick/ban/mute)
- **Persistent Chat** — Supabase real-time chat with per-message translation (Google Translate) and Wisprflow transcription
- **Stripe 90/10 Monetization** — Tip jar with preset amounts, animated celebration on success, live leaderboard
- **AI Services** — Claude content moderation, HeyGen avatar generation, stream summary + description enhancement
- **VDO.Ninja Integration** — Director/guest/view URL generation for remote guest management
- **5-Step Onboarding** — Welcome → Streaming → Watch Party → Monetize → Stripe Connect
- **PWA** — Service worker, web app manifest, push notifications, offline support
- **Analytics Dashboard** — Real-time viewer counts, bitrate, FPS, platform breakdown via WebSocket

---

## Project Structure

```
├── backend/
│   ├── prisma/schema.prisma
│   └── src/
│       ├── config/logger.ts
│       ├── middleware/auth.ts
│       ├── routes/          # auth, streams, vdo, analytics, ai, livekit, payments, watchparty
│       ├── services/        # stream-manager, vdo-ninja, ai-orchestrator, livekit, stripe, supabase, translation
│       ├── server.ts
│       ├── websocket.ts
│       └── workers.ts
├── frontend/
│   ├── public/
│   │   ├── manifest.json
│   │   └── sw.js
│   └── src/
│       ├── components/      # Layout, ChatPanel, TipJar, TipLeaderboard, YouTubeSearch
│       ├── pages/           # Dashboard, GoLive, WatchParty, StreamManager, StreamView, Analytics, Settings, Onboarding, VdoGuests
│       ├── hooks/useWebSocket.ts
│       └── utils/           # api.ts, auth.ts (Zustand)
├── streaming/nginx-rtmp/    # RTMP ingest server
├── infrastructure/k8s/      # Kubernetes deployment + services
├── docker-compose.yml
└── deploy-vps.sh
```

---

## Quick Start

### Prerequisites

- Docker + Docker Compose
- Node.js 20+

### 1. Clone & configure

```bash
git clone https://github.com/SwanyThree23/111111.git
cd 111111
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Fill in your `.env` values — see [Environment Variables](#environment-variables).

### 2. Run with Docker Compose

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| RTMP Ingest | rtmp://localhost:1935/live |

### 3. Run database migrations

```bash
docker-compose exec backend npx prisma migrate deploy
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=postgresql://swanythree:password@postgres:5432/swanythree
REDIS_URL=redis://redis:6379
JWT_SECRET=your-jwt-secret
ANTHROPIC_API_KEY=your-anthropic-key
HEYGEN_API_KEY=your-heygen-key
LIVEKIT_API_KEY=your-livekit-key
LIVEKIT_API_SECRET=your-livekit-secret
LIVEKIT_URL=wss://your-livekit-server
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PLATFORM_ACCOUNT_ID=acct_...
SUPABASE_URL=https://rxlgywvfclyjdfyvfvyc.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
GOOGLE_TRANSLATE_API_KEY=your-google-key
WISPRFLOW_API_KEY=your-wisprflow-key
```

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:3001
VITE_LIVEKIT_URL=wss://your-livekit-server
VITE_SUPABASE_URL=https://rxlgywvfclyjdfyvfvyc.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
VITE_YOUTUBE_API_KEY=your-youtube-key
```

---

## OBS / Streaming Software Setup

Point your encoder to the RTMP ingest server:

```
Server:    rtmp://srv1587098.hstgr.cloud/live
Stream Key: <your-stream-key from the dashboard>
```

---

## VPS Deployment (Hostinger)

```bash
chmod +x deploy-vps.sh
./deploy-vps.sh
```

The script will:
1. Build frontend + backend Docker images
2. rsync files to `srv1587098.hstgr.cloud`
3. Install Docker, Docker Compose, Certbot, PM2, and configure UFW
4. Run `docker-compose up -d`
5. Run `prisma migrate deploy`

---

## Supabase Tables

Run in your Supabase SQL editor:

```sql
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id text, user_id text, username text,
  content text, created_at timestamptz default now()
);

create table watch_party_state (
  room_name text primary key,
  video_id text, is_playing boolean,
  current_time float, updated_at timestamptz default now()
);

create table tips (
  id uuid primary key default gen_random_uuid(),
  room_id text, user_id text, username text,
  amount integer, message text, created_at timestamptz default now()
);

create table mod_actions (
  id uuid primary key default gen_random_uuid(),
  room_id text, moderator_id text, target_user_id text,
  action text, reason text, created_at timestamptz default now()
);
```

---

## Kubernetes Deployment

```bash
kubectl apply -f infrastructure/k8s/deployment.yaml
kubectl apply -f infrastructure/k8s/services.yaml
```

---

## License

MIT
