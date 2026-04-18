# SwanyThree × SeeWhy LIVE — Full-Stack Streaming Platform

A production-ready, creator-first live streaming platform built for **Domino Entertainment / Cali Bones × SwanyThree**. Hosted at `srv1587098.hstgr.cloud`.

---

## Two Platform Layers

| Layer | Location | Purpose |
|---|---|---|
| **SwanyThree** | `backend/` + `frontend/` | Original platform — multi-platform streaming, VDO.Ninja guests, LiveKit, Supabase chat, PWA |
| **SeeWhy LIVE** | `seewhy-live/` | Full production upgrade — Next.js 14, MediaSoup SFU, RS256 JWT, Guardian AI, Spotlight Battles, VST Bridge |

---

## SeeWhy LIVE — Platform Constants (Immutable)

```
CREATOR_SHARE = 0.90   enforced at: DB trigger + server route + Stripe application_fee_amount + webhook validator
PLATFORM_FEE  = 0.10
MAX_GUESTS    = 20     enforced at: DB trigger + MediaSoup router
PREVIEW_SECS  = 120    enforced server-side from stream.startedAt
Math.floor()  ONLY     — never round(), never ceil() on any monetary value
```

---

## SeeWhy LIVE Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript strict |
| Mobile | React Native Expo SDK 52 |
| Styling | Tailwind CSS + Framer Motion |
| State | Zustand + React Query |
| Realtime | Supabase Realtime (postgres_changes + Presence) |
| Video SFU | MediaSoup (self-hosted, CPU-count worker pool) |
| Guest Ingest | VDO.Ninja WebRTC |
| Streaming | MediaMTX RTMP/SRT → FFmpeg fan-out (9 platforms) |
| Auth | RS256 asymmetric JWT + refresh token family rotation + theft detection |
| Database | PostgreSQL 16 via Supabase (rxlgywvfclyjdfyvfvyc) |
| ORM | Prisma 5 |
| Payments | Stripe Connect (destination charges, application_fee_amount) |
| Cache | Redis (rate limiting, token revocation, AI dedup) |
| AI | Anthropic Claude Sonnet (Aura Co-Host) + Claude Haiku (Guardian moderation) |
| Encryption | AES-256-GCM stream key vault (VaultPro) |
| Deploy | Vercel (web) + Railway (API) + Antigravity blue-green |

---

## SwanyThree Stack (Original)

| Layer | Tech |
|---|---|
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma ORM |
| Cache / Queue | Redis + BullMQ |
| Streaming | FFmpeg + Nginx RTMP |
| Video | LiveKit WebRTC + VDO.Ninja |
| Realtime Chat | Supabase (postgres_changes) |
| Payments | Stripe Connect (90/10 split) |
| AI | Anthropic Claude + HeyGen avatars |
| Frontend | React 18 + Vite + Tailwind CSS + Zustand |
| Deploy | Docker Compose + Kubernetes + Hostinger VPS |

---

## SeeWhy LIVE Features

- **Multi-platform fanout** — Go live to YouTube, Twitch, Facebook, TikTok, Instagram, Twitter, Kick, Rumble, Custom via FFmpeg
- **Guardian AI** — Claude Haiku moderates every chat message (0.50 warn / 0.75 hide / 0.95 ban), fail-open, SHA-256 dedup
- **Aura AI Co-Host** — Claude Sonnet with 8 modes: hype, analysis, trivia, domino_expert, creator_support, viewer_engagement, play_by_play, recap
- **120-second free preview** — server-authoritative countdown from `stream.startedAt`, Golden Paywall (Bronze $1 / Silver $5 / Gold $15)
- **Spotlight Battles** — real-time score bars via Supabase Realtime, boost payments via Stripe Checkout
- **20-person guest panel** — MediaSoup SFU with simulcast, host kick/mute/spotlight controls
- **VST Bridge** — Route DAW audio through VDO.Ninja WebRTC into your stream
- **VaultPro** — AES-256-GCM stream key encryption at rest, key rotation
- **AI VOD Repurpose** — TikTok hook, Instagram caption, hashtags, best posting time, best platform
- **AI Overlay Generator** — Claude generates standalone HTML alert overlays for OBS browser sources (5 themes × 8 events)
- **Watch Party** — Supabase Presence for participant sync
- **Stripe 90/10** — `Math.floor()` enforced at 4 layers simultaneously
- **RS256 JWT** — asymmetric, 15-min access tokens, 7-day refresh with family rotation + reuse theft detection
- **PWA** — service worker, manifest, push notifications (SwanyThree layer)

---

## SeeWhy LIVE — Project Structure

```
seewhy-live/
├── apps/
│   ├── api/                      # Node.js + Express + MediaSoup (Railway)
│   │   └── src/
│   │       ├── routes/           # auth, streams, payments, guests, chat, fanout, vods, overlays, vst, battles, analytics
│   │       ├── middleware/       # auth (RS256), rateLimit (Redis), splitGuard (90/10)
│   │       └── services/        # mediasoup, stripe, guardian, aura, vaultpro, vdo, ffmpeg, auth, redis, db, logger
│   ├── web/                      # Next.js 14 App Router (Vercel)
│   │   └── src/app/
│   │       ├── /                 # Home — live stream grid, featured hero, creator strip
│   │       ├── /watch/[id]       # Player — 120s preview, Golden Paywall, TipJar, DirectPay, Guardian chat
│   │       ├── /studio           # Go Live — stream key, browser broadcast, fanout destinations
│   │       ├── /panel/[id]       # Guest panel — 20-person MediaSoup grid, host controls
│   │       ├── /dashboard        # Earnings — 90/10 donut chart, transaction history, Stripe Connect
│   │       ├── /vault            # VODs — AI Repurpose jobs, download
│   │       ├── /spotlight/[id]   # Battle — real-time score bars, boost payments
│   │       ├── /party/[id]       # Watch Party — Supabase Presence sync
│   │       ├── /onboarding       # 5-step creator onboarding
│   │       └── /tools/           # sdk, overlays, recorder, vst, extension
│   └── mobile/                   # React Native Expo SDK 52
│       └── src/screens/          # HomeScreen, WatchScreen, DashboardScreen
├── packages/
│   ├── core/src/                 # Shared constants (CREATOR_SHARE, PLATFORM_FEE, MAX_GUESTS, PREVIEW_SECS) + types
│   └── db/prisma/                # schema.prisma (19 tables) + migration SQL
└── infra/
    ├── nginx/nginx.conf          # RTMP ingest + HLS output
    ├── mediamtx/mediamtx.yml     # Low-latency RTMP/SRT/HLS/WebRTC
    ├── docker/                   # Dockerfile.api + Dockerfile.web
    └── antigravity/deploy.sh     # Blue-green deploy script
```

---

## SwanyThree — Project Structure

```
├── backend/
│   ├── prisma/schema.prisma
│   └── src/
│       ├── config/logger.ts
│       ├── middleware/auth.ts
│       ├── routes/           # auth, streams, vdo, analytics, ai, livekit, payments, watchparty
│       ├── services/         # stream-manager, vdo-ninja, ai-orchestrator, livekit, stripe, supabase, translation
│       ├── server.ts
│       ├── websocket.ts
│       └── workers.ts
├── frontend/
│   ├── public/               # manifest.json, sw.js (PWA)
│   └── src/
│       ├── components/       # Layout, ChatPanel, TipJar, TipLeaderboard, YouTubeSearch
│       ├── pages/            # Dashboard, GoLive, WatchParty, StreamManager, StreamView, Analytics, Settings, Onboarding, VdoGuests
│       ├── hooks/useWebSocket.ts
│       └── utils/            # api.ts, auth.ts (Zustand)
├── streaming/nginx-rtmp/     # RTMP ingest server
├── infrastructure/k8s/       # Kubernetes deployment + services
├── docker-compose.yml
└── deploy-vps.sh
```

---

## Database — 19 Tables (SeeWhy LIVE)

| Table | Purpose |
|---|---|
| `users` | Profiles, Stripe account, role |
| `streams` | Stream metadata, creator_share=0.900 CHECK constraint |
| `transactions` | Splits computed via `create_transaction_with_split()` SQL function |
| `subscriptions` | Bronze/Silver/Gold tiers ($1/$5/$15) |
| `stream_guests` | Up to 20 active guests (DB trigger enforced) |
| `chat_messages` | Persistent chat with moderation_score |
| `stream_categories` | Gaming, Music, Sports, IRL, Talk Shows, Education, Art, Domino, Tech, Fitness |
| `vods` | Recordings with AES-256-GCM encryption_key_id |
| `ai_repurpose_jobs` | Claude VOD repurpose queue |
| `stream_alerts` | Alert events with Claude-generated overlay_html |
| `spotlight_battles` | Creator vs. creator with real-time score accumulation |
| `battle_boosts` | Tip-powered battle boosts |
| `watch_parties` | Supabase Presence sync |
| `fanout_destinations` | 9-platform RTMP destinations (stream keys encrypted at rest) |
| `vst_tracks` | DAW audio routing via VDO.Ninja |
| `guardian_events` | AI moderation audit log |
| `split_alerts` | Fee mismatch detection (automatic reconciliation) |
| `stream_recordings` | MediaMTX recording metadata |
| `creator_onboarding` | 5-step progress tracker |

**DB Triggers:** `immutable_fee_check` · `enforce_creator_share` · `update_stream_tip_total` · `enforce_max_guests`

---

## Quick Start — SeeWhy LIVE

### Prerequisites
- Node.js 20+, Docker, `openssl`

### 1. Clone & configure

```bash
git clone https://github.com/SwanyThree23/111111.git
cd 111111/seewhy-live
cp .env.example .env
# Fill in all values (see Environment Variables below)
```

### 2. Generate RS256 keys

```bash
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem
# Paste contents into JWT_PRIVATE_KEY and JWT_PUBLIC_KEY in .env
```

### 3. Run the API

```bash
cd apps/api && npm install && npm run dev
```

### 4. Run the web app

```bash
cd apps/web && npm install && npm run dev
```

### 5. Run database migrations

```bash
# Apply migration SQL in Supabase SQL editor:
# seewhy-live/packages/db/prisma/migrations/001_initial.sql
```

---

## Quick Start — SwanyThree (Original)

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker-compose up --build
docker-compose exec backend npx prisma migrate deploy
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| RTMP Ingest | rtmp://localhost:1935/live |

---

## Environment Variables — SeeWhy LIVE

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://rxlgywvfclyjdfyvfvyc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.rxlgywvfclyjdfyvfvyc.supabase.co:5432/postgres

# RS256 JWT Auth
JWT_PRIVATE_KEY=<PEM private key>
JWT_PUBLIC_KEY=<PEM public key>

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# AI
ANTHROPIC_API_KEY=<claude api key>

# Redis
REDIS_URL=redis://localhost:6379

# MediaSoup
MEDIASOUP_ANNOUNCED_IP=<server public IP>

# VaultPro (AES-256-GCM)
VAULTPRO_MASTER_KEY=<32-byte hex — openssl rand -hex 32>

# App
NEXT_PUBLIC_API_URL=http://localhost:4000
APP_URL=https://seewhylive.com
PORT=4000
```

## Environment Variables — SwanyThree

```env
DATABASE_URL=postgresql://swanythree:password@postgres:5432/swanythree
REDIS_URL=redis://redis:6379
JWT_SECRET=your-jwt-secret
ANTHROPIC_API_KEY=your-anthropic-key
LIVEKIT_API_KEY=your-livekit-key
LIVEKIT_API_SECRET=your-livekit-secret
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_URL=https://rxlgywvfclyjdfyvfvyc.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

---

## OBS / Streaming Software Setup

```
Server:     rtmp://srv1587098.hstgr.cloud/live
Stream Key: <from dashboard — encrypted at rest with AES-256-GCM>
```

---

## VPS Deployment (Hostinger — SwanyThree)

```bash
chmod +x deploy-vps.sh
./deploy-vps.sh
```

Script: builds images → rsyncs to `srv1587098.hstgr.cloud` → installs Docker/Certbot/PM2/UFW → `docker-compose up -d` → `prisma migrate deploy`

## Production Deploy — SeeWhy LIVE

```bash
# Blue-green deploy (API)
cd seewhy-live && ./infra/antigravity/deploy.sh api seewhy/api:latest

# Web → Vercel
cd seewhy-live/apps/web && vercel --prod
```

---

## Supabase Tables — SeeWhy LIVE

Run `seewhy-live/packages/db/prisma/migrations/001_initial.sql` in your Supabase SQL editor. This creates all 19 tables, triggers, RLS policies, indexes, and seeds categories.

## Supabase Tables — SwanyThree

```sql
create table chat_messages (id uuid primary key default gen_random_uuid(), room_id text, user_id text, username text, content text, created_at timestamptz default now());
create table watch_party_state (room_name text primary key, video_id text, is_playing boolean, current_time float, updated_at timestamptz default now());
create table tips (id uuid primary key default gen_random_uuid(), room_id text, user_id text, username text, amount integer, message text, created_at timestamptz default now());
create table mod_actions (id uuid primary key default gen_random_uuid(), room_id text, moderator_id text, target_user_id text, action text, reason text, created_at timestamptz default now());
```

---

## Kubernetes Deployment (SwanyThree)

```bash
kubectl apply -f infrastructure/k8s/deployment.yaml
kubectl apply -f infrastructure/k8s/services.yaml
```

---

## License

MIT
