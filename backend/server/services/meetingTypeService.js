import { pool } from "../db/pool.js";

export async function getMeetingTypes() {
  const result = await pool.query(
    `
    SELECT
      type_id AS id,
      label,
      description,
      emoji,
      short_description AS "desc"
    FROM meeting_types
    ORDER BY sort_order, type_id
    `
  );

  return result.rows;
}

export async function meetingTypeExists(typeId) {
  const result = await pool.query(
    `
    SELECT 1
    FROM meeting_types
    WHERE type_id = $1
    `,
    [typeId]
  );

  return result.rowCount > 0;
}
