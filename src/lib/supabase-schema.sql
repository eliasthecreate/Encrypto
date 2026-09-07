-- ============================================================
-- Campus Connect ICU — Supabase Database Schema
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ============================================================

-- 1. Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase Auth users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  year TEXT,
  skills TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  bio TEXT,
  pronouns TEXT,
  location TEXT,
  hometown TEXT,
  birthday TEXT,
  workplace TEXT,
  job_title TEXT,
  school TEXT,
  website TEXT,
  instagram TEXT,
  twitter TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online','offline','away','busy')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS: Users can read all profiles, update only their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are publicly readable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- POSTS
-- ============================================================
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'post' CHECK (type IN ('post','event','announcement')),
  image_url TEXT,
  event_location TEXT,
  event_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are publicly readable" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- POST LIKES
-- ============================================================
CREATE TABLE post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are readable" ON post_likes FOR SELECT USING (true);
CREATE POLICY "Users can like" ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are readable" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can comment" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = user_id);

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
-- CONVERSATIONS (chats)
-- ============================================================
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- User IDs for whom this conversation is hidden (soft-deleted). Data stays in DB.
  hidden_for UUID[] NOT NULL DEFAULT '{}',
  -- Group chat fields
  is_group BOOLEAN NOT NULL DEFAULT false,
  group_name TEXT,
  group_avatar_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can view conversations they participate in" ON conversations
  FOR SELECT USING (public.is_conversation_member(id));
CREATE POLICY "Users can update their conversations" ON conversations
  FOR UPDATE USING (public.is_conversation_member(id));

-- ============================================================
-- CONVERSATION PARTICIPANTS
-- ============================================================
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
-- IMPORTANT: participants can see ALL members of conversations they belong to.
-- (The old policy auth.uid() = user_id meant you could only ever see your OWN row,
--  so the app could never find the "other person" in a chat and the conversation
--  list rendered empty. Uses is_conversation_member() to avoid policy recursion.)
CREATE POLICY "Participants can see conversation members" ON conversation_participants
  FOR SELECT USING (public.is_conversation_member(conversation_id));
CREATE POLICY "Users can add participants to their conversations" ON conversation_participants
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','image','voice','file','poll','call')),
  delivered BOOLEAN NOT NULL DEFAULT false,
  read BOOLEAN NOT NULL DEFAULT false,
  -- User IDs for whom this message is hidden (cleared chat). Data stays in DB.
  deleted_for UUID[] NOT NULL DEFAULT '{}',
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- Users can see messages in conversations they're part of
CREATE POLICY "Users can see their conversation messages" ON messages
  FOR SELECT USING (public.is_conversation_member(conversation_id));
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND public.is_conversation_member(conversation_id)
  );
-- Participants can update message status flags (delivered/read ticks)
CREATE POLICY "Users can update messages in their conversations" ON messages
  FOR UPDATE USING (public.is_conversation_member(conversation_id));

-- ============================================================
-- SOFT DELETE HELPERS (Clear chat / Delete chat hide, never erase)
-- SECURITY DEFINER = runs as table owner, but membership is enforced
-- inside the function so users can only hide data in their own chats.
-- ============================================================
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
-- FRIEND REQUESTS
-- ============================================================
CREATE TABLE friend_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see requests they sent or received" ON friend_requests
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send requests" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update requests they received" ON friend_requests
  FOR UPDATE USING (auth.uid() = receiver_id);

-- ============================================================
-- FRIENDS
-- ============================================================
CREATE TABLE friends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id_1 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2),
  CHECK (user_id_1 < user_id_2)
);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Friends are readable by participants" ON friends
  FOR SELECT USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Auto-create friend record when request is accepted
CREATE OR REPLACE FUNCTION handle_friend_request_accepted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.friends (user_id_1, user_id_2)
    VALUES (
      LEAST(NEW.sender_id, NEW.receiver_id),
      GREATEST(NEW.sender_id, NEW.receiver_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_friend_request_accepted
  AFTER UPDATE ON friend_requests
  FOR EACH ROW
  WHEN (NEW.status = 'accepted' AND OLD.status = 'pending')
  EXECUTE FUNCTION handle_friend_request_accepted();

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- LIVE STREAMS
-- ============================================================
CREATE TABLE live_streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  is_live BOOLEAN NOT NULL DEFAULT false,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Live streams are readable" ON live_streams FOR SELECT USING (true);
CREATE POLICY "Users can create streams" ON live_streams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own streams" ON live_streams FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- STORIES
-- ============================================================
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stories are readable" ON stories FOR SELECT USING (true);
CREATE POLICY "Users can create stories" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own stories" ON stories FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- HELPFUL VIEWS
-- ============================================================

-- Post with like count and comment count
CREATE OR REPLACE VIEW post_details AS
SELECT
  p.*,
  COALESCE(l.like_count, 0) AS like_count,
  COALESCE(c.comment_count, 0) AS comment_count
FROM posts p
LEFT JOIN (SELECT post_id, COUNT(*) AS like_count FROM post_likes GROUP BY post_id) l ON l.post_id = p.id
LEFT JOIN (SELECT post_id, COUNT(*) AS comment_count FROM comments GROUP BY post_id) c ON c.post_id = p.id
ORDER BY p.created_at DESC;

-- Message with sender profile
CREATE OR REPLACE VIEW message_details AS
SELECT
  m.*,
  p.name AS sender_name,
  p.avatar_url AS sender_avatar
FROM messages m
JOIN profiles p ON p.id = m.sender_id
ORDER BY m.created_at ASC;

-- ============================================================
-- SEED DATA (optional — run to add sample students)
-- ============================================================
-- Note: This seed assumes auth.users exist for these IDs.
-- For demo purposes, sign up users through the app first,
-- then you can run INSERT statements to add sample posts.
