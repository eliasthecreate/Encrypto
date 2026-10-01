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

-- Shadow friends table (§6.1)
-- 10 deterministically-chosen users per account. Their public-key hashes are a
-- permanent ingredient of that user's conversation keys, so any authenticated
-- user must be able to READ another user's row set in order to derive the
-- shared key. There is deliberately no DELETE policy: the assignment is
-- permanent and cannot be reset from the client.
CREATE TABLE IF NOT EXISTS shadow_friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shadow_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, shadow_user_id),
  CHECK (user_id <> shadow_user_id)
);

ALTER TABLE shadow_friends ENABLE ROW LEVEL SECURITY;

-- Readable by everyone signed in: key derivation requires the peer's rows.
CREATE POLICY "Shadow friends are readable by authenticated users"
  ON shadow_friends FOR SELECT USING (auth.role() = 'authenticated');

-- Only the owner may create their own assignment.
CREATE POLICY "Users can insert their own shadow friends"
  ON shadow_friends FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Undeletable and unmodifiable from the client (no UPDATE/DELETE policy).
CREATE INDEX IF NOT EXISTS shadow_friends_user_id_idx ON shadow_friends(user_id);

-- Drop the superseded fragment tables from the pre-§6 crypto engine.
DROP TABLE IF EXISTS fragment_mappings;
DROP TABLE IF EXISTS live_fragments;
DROP TABLE IF EXISTS shadow_fragments;

-- ============================================================
-- HELPER: is the current user a member of a conversation?
-- SECURITY DEFINER bypasses RLS on the inner query, which prevents
-- "infinite recursion detected in policy" when policies reference
-- conversation_participants.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_conversation_member(target_conversation_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = target_conversation_id
      AND cp.user_id = auth.uid()
  );
$$;

-- ============================================================
-- FIX: RLS policies for conversations & participants
-- ============================================================
-- Add INSERT policy for conversations
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Add SELECT policy for conversations (can see ones you're in)
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (public.is_conversation_member(id));

-- Add INSERT policy for conversation_participants
DROP POLICY IF EXISTS "Users can add participants to their conversations" ON conversation_participants;
CREATE POLICY "Users can add participants to their conversations" ON conversation_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- CRITICAL: fix conversation_participants SELECT policy.
-- The old policy (auth.uid() = user_id) meant you could only ever see your OWN
-- participant row, so the app could never find the "other person" in a chat and
-- the conversation list rendered empty. Participants must be able to see all
-- members of conversations they belong to.
DROP POLICY IF EXISTS "Participants can see their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Participants can see conversation members" ON conversation_participants;
CREATE POLICY "Participants can see conversation members" ON conversation_participants
  FOR SELECT USING (public.is_conversation_member(conversation_id));

-- Ensure messages RLS policies exist (receiver must be able to SELECT messages
-- in conversations they're part of).
DROP POLICY IF EXISTS "Users can see their conversation messages" ON messages;
CREATE POLICY "Users can see their conversation messages" ON messages
  FOR SELECT USING (public.is_conversation_member(conversation_id));

DROP POLICY IF EXISTS "Users can send messages" ON messages;
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND public.is_conversation_member(conversation_id)
  );

-- ============================================================
-- REALTIME (required for live chat & notifications)
-- ============================================================
-- Without these, postgres_changes events never fire and the
-- receiver's chat never updates live. Safe to run repeatedly.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['messages','conversations','conversation_participants','notifications']
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ============================================================
-- STORAGE BUCKETS (create these in Supabase Dashboard too)
-- ============================================================
-- Required buckets (create via Supabase Dashboard > Storage):
-- 1. "avatars" (public) - profile pictures
-- 2. "covers" (public) - cover photos
-- 3. "post-images" (public) - images/videos in posts
-- 4. "story-media" (public) - story media
-- 5. "chat-files" (public) - shared files in chats

-- ============================================================
-- POLL VOTES (chat polls)
-- ============================================================
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poll_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  option TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(poll_message_id, user_id)
);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Poll votes are readable by conversation members" ON poll_votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = poll_votes.poll_message_id
        AND public.is_conversation_member(m.conversation_id)
    )
  );
CREATE POLICY "Users can vote on polls" ON poll_votes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = poll_votes.poll_message_id
        AND public.is_conversation_member(m.conversation_id)
    )
  );
CREATE POLICY "Users can update their own vote" ON poll_votes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own vote" ON poll_votes
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- MESSAGES TABLE UPGRADE (run after the main schema)
-- ============================================================
-- Add file attachment columns to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Add delivery status column (WhatsApp-style ticks: 1 = sent, 2 = delivered, blue = read)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered BOOLEAN NOT NULL DEFAULT false;

-- Participants can update message status flags (delivered/read ticks)
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;
CREATE POLICY "Users can update messages in their conversations" ON messages
  FOR UPDATE USING (public.is_conversation_member(conversation_id));

-- ============================================================
-- SOFT DELETE (Clear chat / Delete chat hide, never erase)
-- Data stays in the database for audit/authority feedback.
-- ============================================================
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_for UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS hidden_for UUID[] NOT NULL DEFAULT '{}';

-- Group chat fields
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_group BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS group_avatar_url TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Users can update their conversations" ON conversations;
CREATE POLICY "Users can update their conversations" ON conversations
  FOR UPDATE USING (public.is_conversation_member(id));

CREATE OR REPLACE FUNCTION public.clear_chat_for_me(conv_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conv_id AND cp.user_id = uid
  ) THEN
    RAISE EXCEPTION 'Not a conversation member';
  END IF;
  UPDATE messages
  SET deleted_for = CASE
    WHEN uid = ANY(deleted_for) THEN deleted_for
    ELSE array_append(deleted_for, uid)
  END
  WHERE conversation_id = conv_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_chat_for_me(conv_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conv_id AND cp.user_id = uid
  ) THEN
    RAISE EXCEPTION 'Not a conversation member';
  END IF;
  -- Deleting a chat also clears it for this user (messages stay in the DB)
  UPDATE messages
  SET deleted_for = CASE
    WHEN uid = ANY(deleted_for) THEN deleted_for
    ELSE array_append(deleted_for, uid)
  END
  WHERE conversation_id = conv_id;

  UPDATE conversations
  SET hidden_for = CASE
    WHEN uid = ANY(hidden_for) THEN hidden_for
    ELSE array_append(hidden_for, uid)
  END
  WHERE id = conv_id;
END;
$$;

-- Restore a conversation this user had deleted (used when starting a new chat
-- with the same person — we reuse the existing conversation instead of creating
-- a duplicate).
CREATE OR REPLACE FUNCTION public.restore_chat_for_me(conv_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants cp
    WHERE cp.conversation_id = conv_id AND cp.user_id = uid
  ) THEN
    RAISE EXCEPTION 'Not a conversation member';
  END IF;
  UPDATE conversations
  SET hidden_for = array_remove(hidden_for, uid)
  WHERE id = conv_id;
END;
$$;

-- Update the type check constraint to include new types
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_type_check;
ALTER TABLE messages ADD CONSTRAINT messages_type_check
  CHECK (type IN ('text','image','voice','file','poll','call'));

-- Profile skills (comma-separated list shown on the profile page)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS skills TEXT;

-- Facebook-style profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hometown TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS workplace TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS instagram TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter TEXT;

-- ============================================================
-- SEALED SENDER & VERIFIED CREDENTIALS SCHEMA EXTENSION
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_uuid TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verification_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS university_domain TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_sealed BOOLEAN DEFAULT false;

-- Policy to allow sealed sender message insertion without requiring sender_id matching auth.uid()
DROP POLICY IF EXISTS "Users can send sealed messages" ON messages;
CREATE POLICY "Users can send sealed messages" ON messages
  FOR INSERT WITH CHECK (
    public.is_conversation_member(conversation_id)
  );

