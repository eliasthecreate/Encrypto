-- ============================================================
-- Campus Connect ICU — Crypto System Schema Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Public keys table: stores each user's RSA public key
CREATE TABLE IF NOT EXISTS public_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  public_key_pem TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public keys are readable by authenticated users"
  ON public_keys FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can upsert their own public key"
  ON public_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own public key"
  ON public_keys FOR UPDATE USING (auth.uid() = user_id);

-- Shadow friends table: stores invisible friend assignments
CREATE TABLE IF NOT EXISTS shadow_friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shadow_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, shadow_user_id)
);

ALTER TABLE shadow_friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own shadow friends"
  ON shadow_friends FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own shadow friends"
  ON shadow_friends FOR INSERT WITH CHECK (auth.uid() = user_id);
