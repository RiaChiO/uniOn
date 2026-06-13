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

async function ensureUserProfileColumns(client = pool) {
  await client.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS department TEXT,
      ADD COLUMN IF NOT EXISTS grade TEXT,
      ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE
  `);

  await client.query(`
    UPDATE users
    SET onboarding_completed = TRUE
    WHERE onboarding_completed = FALSE
      AND NULLIF(TRIM(name), '') IS NOT NULL
      AND NULLIF(TRIM(department), '') IS NOT NULL
      AND NULLIF(TRIM(grade), '') IS NOT NULL
  `);
}

export async function getUsers() {
  await ensureUserProfileColumns();

  const result = await pool.query(
    `
    SELECT user_id, name, email, department, grade, onboarding_completed, created_at
    FROM users
    ORDER BY
      NULLIF(regexp_replace(user_id, '[^0-9]', '', 'g'), '')::INT,
      user_id
    `
  );

  return result.rows;
}

function createTemporaryInterestVector() {
  const randomScore = () => Math.floor(Math.random() * 11);

  return {
    study: randomScore(),
    exercise: randomScore(),
    culture: randomScore(),
    game: randomScore(),
    religion: randomScore(),
    volunteer: randomScore(),
  };
}

function normalizeVectorScore(value, field) {
  const score = Number(value);

  if (!Number.isInteger(score) || score < 0 || score > 10) {
    const error = new Error(`${field} 값은 0부터 10까지의 정수여야 합니다.`);
    error.statusCode = 400;
    throw error;
  }

  return score;
}

function normalizeInterestVector(vector) {
  return {
    study: normalizeVectorScore(vector.study, "study"),
    exercise: normalizeVectorScore(vector.exercise, "exercise"),
    culture: normalizeVectorScore(vector.culture, "culture"),
    game: normalizeVectorScore(vector.game, "game"),
    religion: normalizeVectorScore(vector.religion, "religion"),
    volunteer: normalizeVectorScore(vector.volunteer, "volunteer"),
  };
}

export async function upsertUser({ userId, name, email }) {
  const vector = createTemporaryInterestVector();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureUserProfileColumns(client);

    const existingResult = await client.query(
      `
      SELECT user_id
      FROM users
      WHERE email = $1 OR user_id = $2
      ORDER BY
        CASE WHEN email = $1 THEN 0 ELSE 1 END,
        user_id
      LIMIT 1
      FOR UPDATE
      `,
      [email, userId]
    );

    const result = existingResult.rowCount > 0
      ? await client.query(
        `
        UPDATE users
        SET
          name = $2,
          email = $3
        WHERE user_id = $1
        RETURNING user_id, name, email, department, grade, onboarding_completed, created_at
        `,
        [existingResult.rows[0].user_id, name, email]
      )
      : await client.query(
      `
      INSERT INTO users (user_id, name, email, created_at)
      VALUES ($1, $2, $3, NOW())
      RETURNING user_id, name, email, department, grade, onboarding_completed, created_at
      `,
      [userId, name, email]
    );

    await client.query(
      `
      INSERT INTO user_interest_vectors
        (user_id, study, exercise, culture, game, religion, volunteer)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id)
      DO NOTHING
      `,
      [
        result.rows[0].user_id,
        vector.study,
        vector.exercise,
        vector.culture,
        vector.game,
        vector.religion,
        vector.volunteer,
      ]
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getUserInterestVector(userId) {
  const result = await pool.query(
    `
    SELECT user_id, study, exercise, culture, game, religion, volunteer
    FROM user_interest_vectors
    WHERE TRIM(user_id) = TRIM($1)
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error("유저 벡터 정보를 찾을 수 없습니다.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

export async function updateUserInterestVector({ userId, vector }) {
  const normalizedVector = normalizeInterestVector(vector);

  const result = await pool.query(
    `
    INSERT INTO user_interest_vectors
      (user_id, study, exercise, culture, game, religion, volunteer)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (user_id)
    DO UPDATE SET
      study = EXCLUDED.study,
      exercise = EXCLUDED.exercise,
      culture = EXCLUDED.culture,
      game = EXCLUDED.game,
      religion = EXCLUDED.religion,
      volunteer = EXCLUDED.volunteer
    RETURNING user_id, study, exercise, culture, game, religion, volunteer
    `,
    [
      userId,
      normalizedVector.study,
      normalizedVector.exercise,
      normalizedVector.culture,
      normalizedVector.game,
      normalizedVector.religion,
      normalizedVector.volunteer,
    ]
  );

  return result.rows[0];
}

export async function updateUserProfile({ userId, name, department, grade }) {
  await ensureUserProfileColumns();

  const result = await pool.query(
    `
    UPDATE users
    SET
      name = $2,
      department = NULLIF($3, ''),
      grade = NULLIF($4, ''),
      onboarding_completed = TRUE
    WHERE TRIM(user_id) = TRIM($1)
    RETURNING user_id, name, email, department, grade, onboarding_completed, created_at
    `,
    [userId, name, department, grade]
  );

  if (result.rows.length === 0) {
    const error = new Error("사용자 정보를 찾을 수 없습니다.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

export async function completeUserOnboarding(userId) {
  await ensureUserProfileColumns();

  const result = await pool.query(
    `
    UPDATE users
    SET onboarding_completed = TRUE
    WHERE TRIM(user_id) = TRIM($1)
    RETURNING user_id, onboarding_completed
    `,
    [userId]
  );

  if (result.rowCount === 0) {
    const error = new Error("사용자 정보를 찾을 수 없습니다.");
    error.statusCode = 404;
    throw error;
  }

  return {
    userId: result.rows[0].user_id,
    onboardingCompleted: result.rows[0].onboarding_completed,
  };
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
