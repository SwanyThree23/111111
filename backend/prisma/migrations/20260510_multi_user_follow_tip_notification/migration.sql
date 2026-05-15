-- AlterTable: User — add bio, stripeAccountId, isPublic
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "bio"              TEXT,
  ADD COLUMN IF NOT EXISTS "stripeAccountId" TEXT,
  ADD COLUMN IF NOT EXISTS "isPublic"        BOOLEAN NOT NULL DEFAULT true;

-- AlterTable: Stream — add multi-user fields
ALTER TABLE "Stream"
  ADD COLUMN IF NOT EXISTS "isPublic"              BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "paywallEnabled"         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "paywallPreviewSeconds"  INTEGER NOT NULL DEFAULT 300,
  ADD COLUMN IF NOT EXISTS "currentViewers"         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "category"               TEXT,
  ADD COLUMN IF NOT EXISTS "thumbnailUrl"           TEXT;

-- CreateTable: Follow
CREATE TABLE IF NOT EXISTS "Follow" (
  "id"          TEXT NOT NULL,
  "followerId"  TEXT NOT NULL,
  "followingId" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Follow_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Follow_followerId_followingId_key" UNIQUE ("followerId", "followingId"),
  CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId")  REFERENCES "User"("id") ON DELETE CASCADE,
  CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- CreateTable: Tip
CREATE TABLE IF NOT EXISTS "Tip" (
  "id"         TEXT NOT NULL,
  "streamId"   TEXT,
  "fromUserId" TEXT,
  "toUserId"   TEXT NOT NULL,
  "username"   TEXT NOT NULL,
  "amount"     INTEGER NOT NULL,
  "message"    TEXT,
  "platform"   TEXT NOT NULL DEFAULT 'internal',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Tip_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Tip_streamId_fkey"   FOREIGN KEY ("streamId")   REFERENCES "Stream"("id") ON DELETE SET NULL,
  CONSTRAINT "Tip_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id")   ON DELETE SET NULL,
  CONSTRAINT "Tip_toUserId_fkey"   FOREIGN KEY ("toUserId")   REFERENCES "User"("id")   ON DELETE CASCADE
);

-- CreateTable: Notification
CREATE TABLE IF NOT EXISTS "Notification" (
  "id"        TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "data"      JSONB,
  "isRead"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS "Follow_followerId_idx"      ON "Follow"("followerId");
CREATE INDEX IF NOT EXISTS "Follow_followingId_idx"     ON "Follow"("followingId");
CREATE INDEX IF NOT EXISTS "Tip_streamId_idx"           ON "Tip"("streamId");
CREATE INDEX IF NOT EXISTS "Tip_toUserId_idx"           ON "Tip"("toUserId");
CREATE INDEX IF NOT EXISTS "Tip_createdAt_idx"          ON "Tip"("createdAt");
CREATE INDEX IF NOT EXISTS "Notification_userId_idx"    ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_isRead_idx"    ON "Notification"("isRead");
CREATE INDEX IF NOT EXISTS "Stream_isPublic_isLive_idx" ON "Stream"("isPublic", "isLive");
CREATE INDEX IF NOT EXISTS "Stream_userId_idx"          ON "Stream"("userId");
