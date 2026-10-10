-- ============================================================
-- Campus Connect ICU — "For You" personalization migration
-- Run this in your Supabase SQL Editor (idempotent / safe to re-run)
-- ============================================================

-- Interests the user picked during For You onboarding.
-- Stored as a comma-separated list of ids, e.g. "movies,anime,sports".
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT;

-- Courses the user is taking / interested in. Comma-separated course ids.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS courses TEXT;

-- Flipped to true when the user finishes (or skips) For You onboarding,
-- so the animated interest picker only appears on the first visit.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests_set BOOLEAN NOT NULL DEFAULT false;

-- ✅ Done. The For You tab will now remember each student's interests.
