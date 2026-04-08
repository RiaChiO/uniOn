// Role: query and mutate meeting-related data.
import { pool } from "../db/pool.js";

export async function getMeetings() {
  const result = await pool.query(
    `
    SELECT
      m.meeting_id AS "meetingId",
      m.title,
      m.meeting_type AS "meetingType",
      m.tag_id AS "tagId",
      m.description,
      m.host_user_id AS "hostUserId",
      m.created_at AS "createdAt",
      CASE
        WHEN m.tag_id IS NULL THEN ARRAY[]::text[]
        ELSE ARRAY[m.tag_id]
      END AS tags,
      COALESCE(mp.participant_count, 0)::INT AS "participantCount"
    FROM meetings m
    LEFT JOIN (
      SELECT meeting_id, COUNT(*) AS participant_count
      FROM meeting_participants
      GROUP BY meeting_id
    ) mp ON mp.meeting_id = m.meeting_id
    ORDER BY
      NULLIF(regexp_replace(m.meeting_id, '[^0-9]', '', 'g'), '')::INT,
      m.meeting_id
    `
  );

  return result.rows;
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
