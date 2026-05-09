-- Migration 002: polls, webhook endpoints/deliveries, direct pay links

CREATE TABLE polls (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id        UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  creator_id       UUID NOT NULL REFERENCES users(id),
  question         TEXT NOT NULL,
  options          JSONB NOT NULL,
  status           TEXT NOT NULL DEFAULT 'active',
  duration_seconds INT  NOT NULL DEFAULT 60,
  ends_at          TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE poll_votes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES users(id),
  option_idx INT  NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

CREATE TABLE webhook_endpoints (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id),
  url        TEXT NOT NULL,
  secret     TEXT NOT NULL,
  events     JSONB NOT NULL DEFAULT '["stream.live","stream.ended","milestone.viewers","poll.ended"]',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id),
  event       TEXT NOT NULL,
  payload     JSONB NOT NULL,
  status_code INT,
  attempt     INT  NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE direct_pay_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES users(id),
  platform   TEXT NOT NULL,
  handle     TEXT NOT NULL,
  url        TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (creator_id, platform)
);

CREATE INDEX ON polls (stream_id);
CREATE INDEX ON poll_votes (poll_id);
CREATE INDEX ON webhook_endpoints (creator_id);
CREATE INDEX ON webhook_deliveries (endpoint_id);
CREATE INDEX ON direct_pay_links (creator_id);
