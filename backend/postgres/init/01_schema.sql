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
  meeting_type TEXT NOT NULL DEFAULT 'small-group',
  tag_id TEXT REFERENCES tags(tag_id),
  description TEXT NOT NULL,
  host_user_id TEXT NOT NULL REFERENCES users(user_id),
  created_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS meeting_type TEXT NOT NULL DEFAULT 'small-group';
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS tag_id TEXT REFERENCES tags(tag_id);

CREATE TABLE IF NOT EXISTS meeting_participants (
  meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(user_id),
  joined_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (meeting_id, user_id)
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
