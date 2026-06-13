import { pool } from "../db/pool.js";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export async function ensureNotificationsTable(client = pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id BIGSERIAL PRIMARY KEY,
      recipient_user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      audience TEXT NOT NULL DEFAULT 'member'
        CHECK (audience IN ('leader', 'member')),
      type TEXT NOT NULL,
      meeting_id TEXT REFERENCES meetings(meeting_id) ON DELETE SET NULL,
      actor_user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ
    )
  `);

  await client.query(`
    ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS audience TEXT
  `);

  await client.query(`
    UPDATE notifications
    SET audience = CASE
      WHEN type IN ('join_request', 'member_joined') THEN 'leader'
      ELSE 'member'
    END
    WHERE audience IS NULL
  `);

  await client.query(`
    ALTER TABLE notifications
    ALTER COLUMN audience SET DEFAULT 'member',
    ALTER COLUMN audience SET NOT NULL
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread_created
    ON notifications(recipient_user_id, is_read, created_at DESC, notification_id DESC)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_recipient_audience_created
    ON notifications(recipient_user_id, audience, created_at DESC, notification_id DESC)
  `);
}

function normalizeLimit(limit) {
  return Math.min(MAX_LIMIT, Math.max(1, Number(limit) || DEFAULT_LIMIT));
}

function normalizeOffset(offset) {
  return Math.max(0, Number(offset) || 0);
}

export async function createNotification({
  client = pool,
  recipientUserId,
  audience = "member",
  type,
  meetingId = null,
  actorUserId = null,
  title,
  message,
  metadata = {},
}) {
  await ensureNotificationsTable(client);

  const result = await client.query(
    `
    INSERT INTO notifications (
      recipient_user_id,
      audience,
      type,
      meeting_id,
      actor_user_id,
      title,
      message,
      metadata
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8::JSONB)
    RETURNING
      notification_id AS "notificationId",
      recipient_user_id AS "recipientUserId",
      audience,
      type,
      meeting_id AS "meetingId",
      actor_user_id AS "actorUserId",
      title,
      message,
      metadata,
      is_read AS "isRead",
      created_at AS "createdAt",
      read_at AS "readAt"
    `,
    [
      recipientUserId,
      audience,
      type,
      meetingId,
      actorUserId,
      title,
      message,
      JSON.stringify(metadata),
    ]
  );

  return result.rows[0];
}

export async function getUserNotifications({
  userId,
  audience = null,
  unreadOnly = false,
  limit = DEFAULT_LIMIT,
  offset = 0,
}) {
  await ensureNotificationsTable();

  const result = await pool.query(
    `
    SELECT
      n.notification_id AS "notificationId",
      n.audience,
      n.type,
      n.meeting_id AS "meetingId",
      m.title AS "meetingTitle",
      n.actor_user_id AS "actorUserId",
      actor.name AS "actorName",
      n.title,
      n.message,
      n.metadata,
      n.is_read AS "isRead",
      n.created_at AS "createdAt",
      n.read_at AS "readAt"
    FROM notifications n
    LEFT JOIN meetings m ON m.meeting_id = n.meeting_id
    LEFT JOIN users actor ON actor.user_id = n.actor_user_id
    WHERE n.recipient_user_id = $1
      AND ($2::BOOLEAN = FALSE OR n.is_read = FALSE)
      AND ($3::TEXT IS NULL OR n.audience = $3)
    ORDER BY n.created_at DESC, n.notification_id DESC
    LIMIT $4 OFFSET $5
    `,
    [
      userId,
      Boolean(unreadOnly),
      audience,
      normalizeLimit(limit),
      normalizeOffset(offset),
    ]
  );

  return result.rows;
}

export async function getUnreadNotificationCount(userId) {
  await ensureNotificationsTable();

  const result = await pool.query(
    `
    SELECT COUNT(*)::INT AS count
    FROM notifications
    WHERE recipient_user_id = $1
      AND is_read = FALSE
    `,
    [userId]
  );

  return result.rows[0].count;
}

export async function markNotificationRead({ userId, notificationId }) {
  await ensureNotificationsTable();

  const result = await pool.query(
    `
    UPDATE notifications
    SET
      is_read = TRUE,
      read_at = COALESCE(read_at, NOW())
    WHERE notification_id = $1
      AND recipient_user_id = $2
    RETURNING
      notification_id AS "notificationId",
      is_read AS "isRead",
      read_at AS "readAt"
    `,
    [notificationId, userId]
  );

  if (result.rowCount === 0) {
    const error = new Error("알림을 찾을 수 없습니다.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

export async function markAllNotificationsRead(userId) {
  await ensureNotificationsTable();

  const result = await pool.query(
    `
    UPDATE notifications
    SET
      is_read = TRUE,
      read_at = NOW()
    WHERE recipient_user_id = $1
      AND is_read = FALSE
    `,
    [userId]
  );

  return result.rowCount;
}
