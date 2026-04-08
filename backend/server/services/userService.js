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
