// Role: read user-related data from database.
import { pool } from "../db/pool.js";

async function ensureWishlistTable(client = pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_wishlist_meetings (
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, meeting_id)
    )
  `);
}

export async function getUsers() {
  const result = await pool.query(
    `
    SELECT user_id, name, email, created_at
    FROM users
    ORDER BY
      NULLIF(regexp_replace(user_id, '[^0-9]', '', 'g'), '')::INT,
      user_id
    `
  );

  return result.rows;
}

export async function upsertUser({ userId, name, email }) {
  const result = await pool.query(
    `
    INSERT INTO users (user_id, name, email, created_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email
    RETURNING user_id, name, email, created_at
    `,
    [userId, name, email]
  );

  return result.rows[0];
}

export async function getUserWishlistMeetings(userId) {
  await ensureWishlistTable();

  const result = await pool.query(
    `
    SELECT
      m.meeting_id AS "meetingId",
      m.title,
      m.meeting_type AS "meetingType",
      mt.label AS "meetingTypeLabel",
      m.tag_id AS "tagId",
      m.description,
      m.location,
      m.meeting_time AS "meetingTime",
      m.max_members AS "maxMembers",
      m.is_recruiting AS "isRecruiting",
      m.join_condition AS "joinCondition",
      m.host_user_id AS "hostUserId",
      host.name AS "leaderName",
      uwm.created_at AS "wishlistedAt",
      COALESCE(mp_count.participant_count, 0)::INT AS "participantCount"
    FROM user_wishlist_meetings uwm
    JOIN meetings m ON m.meeting_id = uwm.meeting_id
    JOIN meeting_types mt ON mt.type_id = m.meeting_type
    JOIN users host ON host.user_id = m.host_user_id
    LEFT JOIN (
      SELECT meeting_id, COUNT(*) AS participant_count
      FROM meeting_participants
      GROUP BY meeting_id
    ) mp_count ON mp_count.meeting_id = m.meeting_id
    WHERE uwm.user_id = $1
    ORDER BY uwm.created_at DESC, m.meeting_id
    `,
    [userId]
  );

  return result.rows;
}

export async function addUserWishlistMeeting({ userId, meetingId }) {
  await ensureWishlistTable();

  const result = await pool.query(
    `
    INSERT INTO user_wishlist_meetings (user_id, meeting_id, created_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (user_id, meeting_id)
    DO UPDATE SET created_at = user_wishlist_meetings.created_at
    RETURNING
      user_id AS "userId",
      meeting_id AS "meetingId",
      created_at AS "createdAt"
    `,
    [userId, meetingId]
  );

  return result.rows[0];
}

export async function removeUserWishlistMeeting({ userId, meetingId }) {
  await ensureWishlistTable();

  const result = await pool.query(
    `
    DELETE FROM user_wishlist_meetings
    WHERE user_id = $1 AND meeting_id = $2
    RETURNING
      user_id AS "userId",
      meeting_id AS "meetingId"
    `,
    [userId, meetingId]
  );

  if (result.rowCount === 0) {
    const error = new Error("관심 목록에 등록된 모임을 찾을 수 없습니다.");
    error.statusCode = 404;
    throw error;
  }
}
