CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS tags (
  tag_id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS meeting_types (
  type_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  emoji TEXT NOT NULL,
  short_description TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

INSERT INTO meeting_types(type_id, label, description, emoji, short_description, sort_order)
VALUES
  ('club', '동아리', '정기적으로 활동하는 공식 동아리', '🏛️', '정식 등록', 1),
  ('small-group', '소모임', '관심사가 같은 사람들의 모임', '👥', '자유 활동', 2),
  ('one-time', '일회성 모임', '한 번의 만남을 위한 모임', '⚡', '단기 진행', 3)
ON CONFLICT (type_id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  emoji = EXCLUDED.emoji,
  short_description = EXCLUDED.short_description,
  sort_order = EXCLUDED.sort_order;

CREATE TABLE IF NOT EXISTS user_interest_vectors (
  user_id TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  study DOUBLE PRECISION NOT NULL,
  exercise DOUBLE PRECISION NOT NULL,
  culture DOUBLE PRECISION NOT NULL,
  game DOUBLE PRECISION NOT NULL,
  religion DOUBLE PRECISION NOT NULL,
  volunteer DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS meetings (
  meeting_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'small-group' REFERENCES meeting_types(type_id),
  tag_id TEXT REFERENCES tags(tag_id),
  description TEXT NOT NULL,
  display_category TEXT,
  location TEXT,
  meeting_time TEXT,
  max_members INTEGER,
  is_recruiting BOOLEAN NOT NULL DEFAULT TRUE,
  join_condition TEXT,
  host_user_id TEXT NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS meeting_type TEXT NOT NULL DEFAULT 'small-group';
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS tag_id TEXT REFERENCES tags(tag_id);
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS display_category TEXT;
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS meeting_time TEXT;
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS max_members INTEGER;
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS is_recruiting BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS join_condition TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meetings_meeting_type_fkey'
  ) THEN
    ALTER TABLE meetings
      ADD CONSTRAINT meetings_meeting_type_fkey
      FOREIGN KEY (meeting_type) REFERENCES meeting_types(type_id);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS meeting_participants (
  meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  joined_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (meeting_id, user_id)
);

CREATE TABLE IF NOT EXISTS meeting_join_requests (
  meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (meeting_id, user_id)
);

CREATE TABLE IF NOT EXISTS meeting_activities (
  activity_id BIGSERIAL PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  activity_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_activities_meeting_date
  ON meeting_activities(meeting_id, activity_date DESC, activity_id DESC);

CREATE TABLE IF NOT EXISTS user_wishlist_meetings (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, meeting_id)
);

CREATE TABLE IF NOT EXISTS recommendations (
  user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  cosine_score DOUBLE PRECISION NOT NULL,
  jaccard_score DOUBLE PRECISION NOT NULL,
  hybrid_raw DOUBLE PRECISION NOT NULL,
  final_score INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, meeting_id)
);

CREATE INDEX IF NOT EXISTS idx_recommendations_user_score
  ON recommendations(user_id, final_score DESC);

DROP TABLE IF EXISTS meeting_participant_vectors;
DROP TABLE IF EXISTS meeting_tag_vectors;
DROP TABLE IF EXISTS meeting_tags;
