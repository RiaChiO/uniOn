// Role: read user-related data from database.
import { pool } from "../db/pool.js";

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
