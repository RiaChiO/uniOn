// Role: query and mutate meeting-related data.
import { pool } from "../db/pool.js";

async function ensureJoinRequestsTable(client = pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS meeting_join_requests (
      meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (meeting_id, user_id)
    )
  `);
}

export async function getMeetings() {
  const result = await pool.query(
    `
    SELECT
      m.meeting_id AS "meetingId",
      m.title,
      m.meeting_type AS "meetingType",
      mt.label AS "meetingTypeLabel",
      m.tag_id AS "tagId",
      m.description,
      m.host_user_id AS "hostUserId",
      host.name AS "leaderName",
      m.created_at AS "createdAt",
      CASE
        WHEN m.tag_id IS NULL THEN ARRAY[]::text[]
        ELSE ARRAY[m.tag_id]
      END AS tags,
      COALESCE(mp_count.participant_count, 0)::INT AS "participantCount",
      -- [추가] 참여자 평균 벡터 계산
      ARRAY[
        COALESCE(AVG(uv.study), 0)::FLOAT, 
        COALESCE(AVG(uv.exercise), 0)::FLOAT, 
        COALESCE(AVG(uv.culture), 0)::FLOAT, 
        COALESCE(AVG(uv.game), 0)::FLOAT, 
        COALESCE(AVG(uv.religion), 0)::FLOAT, 
        COALESCE(AVG(uv.volunteer), 0)::FLOAT
      ] AS "avg_participant_vector"
    FROM meetings m
    JOIN users host ON host.user_id = m.host_user_id
    JOIN meeting_types mt ON mt.type_id = m.meeting_type
    -- 참여자 수 카운트 서브쿼리
    LEFT JOIN (
      SELECT meeting_id, COUNT(*) AS participant_count
      FROM meeting_participants
      GROUP BY meeting_id
    ) mp_count ON TRIM(mp_count.meeting_id) = TRIM(m.meeting_id)
    -- [추가] 참여자 벡터 데이터를 가져오기 위한 JOIN
    LEFT JOIN meeting_participants mp ON TRIM(mp.meeting_id) = TRIM(m.meeting_id)
    LEFT JOIN user_interest_vectors uv ON TRIM(uv.user_id) = TRIM(mp.user_id)
    GROUP BY 
      m.meeting_id, m.title, m.meeting_type, mt.label, m.tag_id, 
      m.description, m.host_user_id, host.name, m.created_at, mp_count.participant_count
    ORDER BY
      NULLIF(regexp_replace(m.meeting_id, '[^0-9]', '', 'g'), '')::INT,
      m.meeting_id
    `
  );

  return result.rows;
}

export async function getMeetingsByParticipant(userId) {
  const result = await pool.query(
    `
    SELECT
      m.meeting_id AS "meetingId",
      m.title,
      m.meeting_type AS "meetingType",
      mt.label AS "meetingTypeLabel",
      m.host_user_id AS "hostUserId",
      host.name AS "leaderName",
      CASE
        WHEN m.host_user_id = $1 THEN '리더'
        ELSE '멤버'
      END AS role,
      COALESCE(mp_count.participant_count, 0)::INT AS "participantCount"
    FROM meeting_participants mp
    JOIN meetings m ON m.meeting_id = mp.meeting_id
    JOIN meeting_types mt ON mt.type_id = m.meeting_type
    JOIN users host ON host.user_id = m.host_user_id
    LEFT JOIN (
      SELECT meeting_id, COUNT(*) AS participant_count
      FROM meeting_participants
      GROUP BY meeting_id
    ) mp_count ON mp_count.meeting_id = m.meeting_id
    WHERE mp.user_id = $1
    ORDER BY
      NULLIF(regexp_replace(m.meeting_id, '[^0-9]', '', 'g'), '')::INT,
      m.meeting_id
    `,
    [userId]
  );

  return result.rows;
}

export async function getMeetingMembers(meetingId) {
  const result = await pool.query(
    `
    SELECT
      u.user_id AS "userId",
      u.name,
      CASE
        WHEN m.host_user_id = u.user_id THEN '리더'
        ELSE '멤버'
      END AS role,
      mp.joined_at AS "joinedAt"
    FROM meeting_participants mp
    JOIN users u ON u.user_id = mp.user_id
    JOIN meetings m ON m.meeting_id = mp.meeting_id
    WHERE mp.meeting_id = $1
    ORDER BY
      CASE WHEN m.host_user_id = u.user_id THEN 0 ELSE 1 END,
      u.name,
      u.user_id
    `,
    [meetingId]
  );

  return result.rows;
}

export async function getMeetingJoinRequests(meetingId) {
  await ensureJoinRequestsTable();

  const result = await pool.query(
    `
    SELECT
      u.user_id AS "userId",
      u.name,
      mjr.requested_at AS "requestedAt"
    FROM meeting_join_requests mjr
    JOIN users u ON u.user_id = mjr.user_id
    WHERE mjr.meeting_id = $1
    ORDER BY mjr.requested_at, u.name, u.user_id
    `,
    [meetingId]
  );

  return result.rows;
}

export async function createMeetingJoinRequest({ meetingId, userId }) {
  await ensureJoinRequestsTable();

  const existingMember = await pool.query(
    `
    SELECT 1
    FROM meeting_participants
    WHERE meeting_id = $1 AND user_id = $2
    `,
    [meetingId, userId]
  );

  if (existingMember.rowCount > 0) {
    const error = new Error("이미 가입된 모임입니다.");
    error.statusCode = 409;
    throw error;
  }

  const result = await pool.query(
    `
    INSERT INTO meeting_join_requests (meeting_id, user_id, requested_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (meeting_id, user_id)
    DO UPDATE SET requested_at = meeting_join_requests.requested_at
    RETURNING
      meeting_id AS "meetingId",
      user_id AS "userId",
      requested_at AS "requestedAt"
    `,
    [meetingId, userId]
  );

  return result.rows[0];
}

export async function approveMeetingJoinRequest({ meetingId, userId }) {
  const client = await pool.connect();

  try {
    await ensureJoinRequestsTable(client);
    await client.query("BEGIN");

    const request = await client.query(
      `
      DELETE FROM meeting_join_requests
      WHERE meeting_id = $1 AND user_id = $2
      RETURNING meeting_id, user_id
      `,
      [meetingId, userId]
    );

    if (request.rowCount === 0) {
      const error = new Error("가입 신청을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    await client.query(
      `
      INSERT INTO meeting_participants (meeting_id, user_id, joined_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (meeting_id, user_id) DO NOTHING
      `,
      [meetingId, userId]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectMeetingJoinRequest({ meetingId, userId }) {
  await ensureJoinRequestsTable();

  const result = await pool.query(
    `
    DELETE FROM meeting_join_requests
    WHERE meeting_id = $1 AND user_id = $2
    `,
    [meetingId, userId]
  );

  if (result.rowCount === 0) {
    const error = new Error("가입 신청을 찾을 수 없습니다.");
    error.statusCode = 404;
    throw error;
  }
}

export async function createMeeting({ title, meetingType, description, hostUserId, tagId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const nextIdResult = await client.query(
      `
      SELECT COALESCE(MAX(NULLIF(regexp_replace(meeting_id, '[^0-9]', '', 'g'), '')::INT), 0) + 1 AS next_id
      FROM meetings
      `
    );

    const meetingId = `meeting${nextIdResult.rows[0].next_id}`;

    await client.query(
      `
      INSERT INTO meetings (meeting_id, title, meeting_type, tag_id, description, host_user_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `,
      [meetingId, title, meetingType, tagId, description, hostUserId]
    );

    await client.query(
      `
      INSERT INTO meeting_participants (meeting_id, user_id, joined_at)
      VALUES ($1, $2, NOW())
      `,
      [meetingId, hostUserId]
    );

    await client.query("COMMIT");

    return {
      meetingId,
      title,
      meetingType,
      tagId,
      description,
      hostUserId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
