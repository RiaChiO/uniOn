// Role: read recommendation results for a selected user.
import { pool } from "../db/pool.js";
import { recommend } from "../../logic/recommendation.js";

function normalizeUserRow(row) {
  return {
    userId: row.user_id,
    interestVector: {
      study: Number(row.study),
      exercise: Number(row.exercise),
      culture: Number(row.culture),
      game: Number(row.game),
      religion: Number(row.religion),
      volunteer: Number(row.volunteer),
    },
  };
}

function normalizeMeetingRow(row) {
  return {
    title: row.title,
    description: row.description,
    tagId: row.tag_id,
    participants: row.participants ?? [],
  };
}

export async function getRecommendationsByUserId(userId) {
  const userResult = await pool.query(
    `
    SELECT
      u.user_id,
      uv.study,
      uv.exercise,
      uv.culture,
      uv.game,
      uv.religion,
      uv.volunteer
    FROM users u
    JOIN user_interest_vectors uv ON uv.user_id = u.user_id
    WHERE u.user_id = $1
    `,
    [userId]
  );

  if (userResult.rows.length === 0) {
    return [];
  }

  const meetingsResult = await pool.query(
    `
    SELECT
      m.meeting_id,
      m.title,
      m.description,
      m.tag_id,
      COALESCE(array_agg(mp.user_id ORDER BY mp.user_id) FILTER (WHERE mp.user_id IS NOT NULL), ARRAY[]::text[]) AS participants
    FROM meetings m
    LEFT JOIN meeting_participants mp ON mp.meeting_id = m.meeting_id
    GROUP BY m.meeting_id, m.title, m.description, m.tag_id
    ORDER BY
      NULLIF(regexp_replace(m.meeting_id, '[^0-9]', '', 'g'), '')::INT,
      m.meeting_id
    `
  );

  const allUsersResult = await pool.query(
    `
    SELECT
      u.user_id,
      uv.study,
      uv.exercise,
      uv.culture,
      uv.game,
      uv.religion,
      uv.volunteer
    FROM users u
    JOIN user_interest_vectors uv ON uv.user_id = u.user_id
    `
  );

  const currentUser = normalizeUserRow(userResult.rows[0]);
  const usersById = Object.fromEntries(
    allUsersResult.rows.map((row) => {
      const normalized = normalizeUserRow(row);
      return [normalized.userId, normalized];
    })
  );
  const meetingsById = Object.fromEntries(
    meetingsResult.rows.map((row) => [row.meeting_id, normalizeMeetingRow(row)])
  );

  return recommend(currentUser, meetingsById, usersById).map((row) => ({
    userId,
    meetingId: row.meetingId,
    title: meetingsById[row.meetingId]?.title ?? "",
    description: meetingsById[row.meetingId]?.description ?? "",
    cosine: row.cosine,
    jaccard: row.jaccard,
    hybrid: row.cosine + row.jaccard,
    finalScore: row.finalScore,
    createdAt: new Date().toISOString(),
  }));
}
