-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enforce immutable fee check trigger
CREATE OR REPLACE FUNCTION immutable_fee_check()
RETURNS TRIGGER AS $$
BEGIN
  IF ABS((NEW.creator_amount + NEW.platform_amount) - NEW.gross_amount) > 0.01 THEN
    RAISE EXCEPTION 'Fee split mismatch: creator_amount + platform_amount must equal gross_amount';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER immutable_fee_check
  BEFORE INSERT OR UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION immutable_fee_check();

-- Enforce creator share trigger
CREATE OR REPLACE FUNCTION enforce_creator_share()
RETURNS TRIGGER AS $$
BEGIN
  IF ABS(NEW.creator_amount - FLOOR(NEW.gross_amount * 0.90 * 100) / 100) > 0.01 THEN
    RAISE EXCEPTION 'Creator share must be exactly 90%% (Math.floor). Expected: %, Got: %',
      FLOOR(NEW.gross_amount * 0.90 * 100) / 100, NEW.creator_amount;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_creator_share
  BEFORE INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION enforce_creator_share();

-- Update stream tip total trigger
CREATE OR REPLACE FUNCTION update_stream_tip_total()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'succeeded' AND NEW.stream_id IS NOT NULL THEN
    UPDATE streams SET tip_total = tip_total + NEW.gross_amount WHERE id = NEW.stream_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stream_tip_total
  AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_stream_tip_total();

-- Enforce max guests trigger
CREATE OR REPLACE FUNCTION enforce_max_guests()
RETURNS TRIGGER AS $$
DECLARE
  active_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO active_count
  FROM stream_guests
  WHERE stream_id = NEW.stream_id AND left_at IS NULL;

  IF active_count >= 20 THEN
    RAISE EXCEPTION 'Maximum guests (20) reached for stream %', NEW.stream_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_max_guests
  BEFORE INSERT ON stream_guests
  FOR EACH ROW EXECUTE FUNCTION enforce_max_guests();

-- Atomic transaction with split validation function
CREATE OR REPLACE FUNCTION create_transaction_with_split(
  p_stream_id UUID,
  p_payer_id UUID,
  p_creator_id UUID,
  p_type TEXT,
  p_gross_amount NUMERIC,
  p_stripe_payment_intent_id TEXT
) RETURNS UUID AS $$
DECLARE
  v_creator_amount NUMERIC;
  v_platform_amount NUMERIC;
  v_transaction_id UUID;
BEGIN
  v_creator_amount := FLOOR(p_gross_amount * 0.90 * 100) / 100;
  v_platform_amount := FLOOR(p_gross_amount * 0.10 * 100) / 100;

  INSERT INTO transactions (
    stream_id, payer_id, creator_id, type,
    gross_amount, creator_amount, platform_amount,
    stripe_payment_intent_id, status
  ) VALUES (
    p_stream_id, p_payer_id, p_creator_id, p_type,
    p_gross_amount, v_creator_amount, v_platform_amount,
    p_stripe_payment_intent_id, 'pending'
  ) RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- CHECK constraints
ALTER TABLE streams ADD CONSTRAINT streams_creator_share_check CHECK (creator_share = 0.900);
ALTER TABLE streams ADD CONSTRAINT streams_platform_fee_check CHECK (platform_fee = 0.100);
ALTER TABLE streams ADD CONSTRAINT streams_status_check CHECK (status IN ('idle','live','ended','archived'));
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check CHECK (type IN ('subscription','superchat','tip','paywall','direct_pay'));
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check CHECK (status IN ('pending','succeeded','failed','refunded'));
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_tier_check CHECK (tier IN ('bronze','silver','gold'));
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_amount_check CHECK (amount IN (1.00, 5.00, 15.00));
ALTER TABLE stream_guests ADD CONSTRAINT stream_guests_max CHECK (
  (SELECT COUNT(*) FROM stream_guests sg2 WHERE sg2.stream_id = stream_guests.stream_id AND sg2.left_at IS NULL) <= 20
);
ALTER TABLE vst_tracks ADD CONSTRAINT vst_tracks_fader_check CHECK (fader_level BETWEEN 0 AND 100);
ALTER TABLE vst_tracks ADD CONSTRAINT vst_tracks_mode_check CHECK (mode IN ('publish','receive'));
ALTER TABLE creator_onboarding ADD CONSTRAINT creator_onboarding_step_check CHECK (step BETWEEN 1 AND 5);
ALTER TABLE fanout_destinations ADD CONSTRAINT fanout_platform_check CHECK (platform IN ('youtube','twitch','facebook','tiktok','instagram','twitter','kick','rumble','custom'));
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('viewer','creator','admin'));

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE vods ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_repurpose_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spotlight_battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE fanout_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vst_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardian_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE split_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_onboarding ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "users_own" ON users FOR ALL USING (id = auth.uid()::uuid);
CREATE POLICY "users_read_public" ON users FOR SELECT USING (true);

CREATE POLICY "streams_creator" ON streams FOR ALL USING (creator_id = auth.uid()::uuid);
CREATE POLICY "streams_public_read" ON streams FOR SELECT USING (is_public = true OR creator_id = auth.uid()::uuid);

CREATE POLICY "transactions_own" ON transactions FOR SELECT USING (payer_id = auth.uid()::uuid OR creator_id = auth.uid()::uuid);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (payer_id = auth.uid()::uuid);

CREATE POLICY "subscriptions_own" ON subscriptions FOR ALL USING (subscriber_id = auth.uid()::uuid OR creator_id = auth.uid()::uuid);

CREATE POLICY "stream_guests_own" ON stream_guests FOR ALL USING (user_id = auth.uid()::uuid);
CREATE POLICY "stream_guests_read" ON stream_guests FOR SELECT USING (true);

CREATE POLICY "chat_messages_read" ON chat_messages FOR SELECT USING (is_deleted = false);
CREATE POLICY "chat_messages_insert" ON chat_messages FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "chat_messages_delete" ON chat_messages FOR UPDATE USING (user_id = auth.uid()::uuid);

CREATE POLICY "stream_categories_read" ON stream_categories FOR SELECT USING (true);

CREATE POLICY "vods_own" ON vods FOR ALL USING (creator_id = auth.uid()::uuid);
CREATE POLICY "vods_public_read" ON vods FOR SELECT USING (is_public = true OR creator_id = auth.uid()::uuid);

CREATE POLICY "ai_jobs_own" ON ai_repurpose_jobs FOR ALL USING (creator_id = auth.uid()::uuid);

CREATE POLICY "stream_alerts_read" ON stream_alerts FOR SELECT USING (true);

CREATE POLICY "spotlight_battles_read" ON spotlight_battles FOR SELECT USING (true);
CREATE POLICY "spotlight_battles_creator" ON spotlight_battles FOR ALL USING (creator_a_id = auth.uid()::uuid OR creator_b_id = auth.uid()::uuid);

CREATE POLICY "battle_boosts_own" ON battle_boosts FOR ALL USING (booster_id = auth.uid()::uuid);
CREATE POLICY "battle_boosts_read" ON battle_boosts FOR SELECT USING (true);

CREATE POLICY "watch_parties_host" ON watch_parties FOR ALL USING (host_id = auth.uid()::uuid);
CREATE POLICY "watch_parties_read" ON watch_parties FOR SELECT USING (true);

CREATE POLICY "fanout_dests_own" ON fanout_destinations FOR ALL USING (creator_id = auth.uid()::uuid);

CREATE POLICY "vst_tracks_own" ON vst_tracks FOR ALL USING (creator_id = auth.uid()::uuid);

CREATE POLICY "guardian_events_admin" ON guardian_events FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "split_alerts_admin" ON split_alerts FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "stream_recordings_own" ON stream_recordings FOR ALL USING (
  EXISTS (SELECT 1 FROM streams WHERE id = stream_recordings.stream_id AND creator_id = auth.uid()::uuid)
);

CREATE POLICY "creator_onboarding_own" ON creator_onboarding FOR ALL USING (user_id = auth.uid()::uuid);

-- Seed stream categories
INSERT INTO stream_categories (name, slug, icon) VALUES
  ('Gaming', 'gaming', '🎮'),
  ('Music', 'music', '🎵'),
  ('Sports', 'sports', '⚽'),
  ('IRL', 'irl', '📸'),
  ('Talk Shows', 'talk-shows', '🎙️'),
  ('Education', 'education', '📚'),
  ('Art', 'art', '🎨'),
  ('Domino', 'domino', '🁣'),
  ('Tech', 'tech', '💻'),
  ('Fitness', 'fitness', '💪');

-- Indexes for performance
CREATE INDEX idx_streams_creator ON streams(creator_id);
CREATE INDEX idx_streams_status ON streams(status);
CREATE INDEX idx_transactions_stream ON transactions(stream_id);
CREATE INDEX idx_transactions_creator ON transactions(creator_id);
CREATE INDEX idx_chat_stream ON chat_messages(stream_id, created_at DESC);
CREATE INDEX idx_vods_creator ON vods(creator_id);
CREATE INDEX idx_guardian_stream ON guardian_events(stream_id);
