import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";




const { Client } = pg;
const TAGS = ["study", "exercise", "culture", "game", "religion", "volunteer"];
const MEETING_TYPES = [
  {
    id: "club",
    label: "동아리",
    description: "정기적으로 활동하는 공식 동아리",
    emoji: "🏛️",
    desc: "정식 등록",
    sortOrder: 1,
  },
  {
    id: "small-group",
    label: "소모임",
    description: "관심사가 같은 사람들의 모임",
    emoji: "👥",
    desc: "자유 활동",
    sortOrder: 2,
  },
  {
    id: "one-time",
    label: "일회성 모임",
    description: "한 번의 만남을 위한 모임",
    emoji: "⚡",
    desc: "단기 진행",
    sortOrder: 3,
  },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(backendRoot, "..");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return readJson(filePath);
}

function vectorValues(vector) {
  return TAGS.map((tag) => Number(vector?.[tag] ?? 0));
}

function recommendationFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((name) => /^user\d+\.json$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function collectReferencedUserIds(meetings) {
  const userIds = new Set();

  for (const meeting of Object.values(meetings)) {
    if (meeting.hostUserId) userIds.add(meeting.hostUserId);
    for (const userId of meeting.participants ?? []) {
      userIds.add(userId);
    }
  }

  return userIds;
}

async function main() {
  const client = new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "gnu_DB",
    password: process.env.PGPASSWORD ?? "gnublank4898",
    database: process.env.PGDATABASE ?? "gnumatchclub",
  });

  const dataDir = path.join(backendRoot, "data");
  const recommendationsDir = path.join(projectRoot, "frontend", "public", "data");

  const legacyUsers = readJson(path.join(dataDir, "users.json"));
  const officialUsers = {
    ...readJson(path.join(dataDir, "official_users.json")),
    ...readJsonIfExists(path.join(dataDir, "official_extra_users.json")),
  };
  const meetings = {
    ...readJson(path.join(dataDir, "official_meetings.json")),
    ...readJsonIfExists(path.join(dataDir, "official_extra_meetings.json")),
  };
  const referencedUserIds = collectReferencedUserIds(meetings);
  const users = {};

  for (const userId of referencedUserIds) {
    if (legacyUsers[userId]) {
      users[userId] = legacyUsers[userId];
    }
  }

  Object.assign(users, officialUsers);

  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      ALTER TABLE meetings
      ADD COLUMN IF NOT EXISTS tag_id TEXT REFERENCES tags(tag_id)
    `);

    await client.query(`
      ALTER TABLE meetings
      ADD COLUMN IF NOT EXISTS location TEXT
    `);

    await client.query(`
      ALTER TABLE meetings
      ADD COLUMN IF NOT EXISTS display_category TEXT
    `);

    await client.query(`
      ALTER TABLE meetings
      ADD COLUMN IF NOT EXISTS meeting_time TEXT
    `);

    await client.query(`
      ALTER TABLE meetings
      ADD COLUMN IF NOT EXISTS max_members INTEGER
    `);

    await client.query(`
      ALTER TABLE meetings
      ADD COLUMN IF NOT EXISTS is_recruiting BOOLEAN NOT NULL DEFAULT TRUE
    `);

    await client.query(`
      ALTER TABLE meetings
      ADD COLUMN IF NOT EXISTS join_condition TEXT
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_types (
        type_id TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        description TEXT NOT NULL,
        emoji TEXT NOT NULL,
        short_description TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      )
    `);

    for (const type of MEETING_TYPES) {
      await client.query(
        `
        INSERT INTO meeting_types(type_id, label, description, emoji, short_description, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (type_id) DO UPDATE SET
          label = EXCLUDED.label,
          description = EXCLUDED.description,
          emoji = EXCLUDED.emoji,
          short_description = EXCLUDED.short_description,
          sort_order = EXCLUDED.sort_order
        `,
        [type.id, type.label, type.description, type.emoji, type.desc, type.sortOrder]
      );
    }

    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'meetings_meeting_type_fkey'
        ) THEN
          ALTER TABLE meetings
            ADD CONSTRAINT meetings_meeting_type_fkey
            FOREIGN KEY (meeting_type) REFERENCES meeting_types(type_id);
        END IF;
      END $$
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS meeting_join_requests (
        meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (meeting_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_wishlist_meetings (
        user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, meeting_id)
      )
    `);

    const tableExists = await client.query(
      "SELECT to_regclass('public.users') IS NOT NULL AS ok"
    );
    if (!tableExists.rows[0].ok) {
      throw new Error(
        "스키마가 없습니다. 먼저 `npm run db:up` 실행 후 다시 시도하세요."
      );
    }

    await client.query(`
      TRUNCATE TABLE
        recommendations,
        user_wishlist_meetings,
        meeting_join_requests,
        meeting_participants,
        meetings,
        meeting_types,
        user_interest_vectors,
        tags,
        users
      CASCADE
    `);

    for (const tag of TAGS) {
      await client.query(
        "INSERT INTO tags(tag_id, name) VALUES ($1, $2)",
        [tag, tag]
      );
    }

    for (const type of MEETING_TYPES) {
      await client.query(
        `
        INSERT INTO meeting_types(type_id, label, description, emoji, short_description, sort_order)
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
        [type.id, type.label, type.description, type.emoji, type.desc, type.sortOrder]
      );
    }

    for (const [userId, user] of Object.entries(users)) {
      await client.query(
        `
        INSERT INTO users(user_id, name, email, created_at)
        VALUES ($1, $2, $3, $4::timestamptz)
      `,
        [userId, user.name, user.email, user.createdAt]
      );

      await client.query(
        `
        INSERT INTO user_interest_vectors
        (user_id, study, exercise, culture, game, religion, volunteer)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
        [userId, ...vectorValues(user.interestVector)]
      );
    }

    await client.query(`
      INSERT INTO users (user_id, name, email, created_at) 
      VALUES ('1ZTgGPmwvrVMsNeOvBRhNuVmWxE3', 'gnu_test01', 'gnutest011@gmail.com', '2026-04-06 07:04:21')
      ON CONFLICT (user_id) DO NOTHING;
    `);
    await client.query(`
      INSERT INTO user_interest_vectors (user_id, study, exercise, culture, game, religion, volunteer)
      VALUES ('1ZTgGPmwvrVMsNeOvBRhNuVmWxE3', 8, 5, 2, 9, 0, 4)
      ON CONFLICT (user_id) DO UPDATE SET 
        study = 8, exercise = 5, culture = 2, game = 9, religion = 0, volunteer = 4;
    `);

    for (const [meetingId, meeting] of Object.entries(meetings)) {
      await client.query(
        `
        INSERT INTO meetings(
          meeting_id,
          title,
          meeting_type,
          tag_id,
          description,
          location,
          meeting_time,
          max_members,
          is_recruiting,
          join_condition,
          host_user_id,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz)
      `,
        [
          meetingId,
          meeting.title,
          meeting.meetingType ?? "small-group",
          meeting.tagId ?? meeting.tags?.[0] ?? null,
          meeting.description,
          meeting.location ?? null,
          meeting.meetingTime ?? null,
          meeting.maxMembers ?? null,
          meeting.isRecruiting ?? true,
          meeting.joinCondition ?? null,
          meeting.hostUserId,
          meeting.createdAt,
        ]
      );

      for (const userId of meeting.participants ?? []) {
        await client.query(
          `
          INSERT INTO meeting_participants(meeting_id, user_id, joined_at)
          VALUES ($1, $2, $3::timestamptz)
        `,
          [meetingId, userId, meeting.createdAt]
        );
      }
    }

    const now = new Date().toISOString();
    for (const fileName of recommendationFiles(recommendationsDir)) {
      const userId = fileName.replace(".json", "");
      const rows = readJson(path.join(recommendationsDir, fileName));

      for (const row of rows) {
        if (!users[userId] || !meetings[row.meetingId]) {
          continue;
        }

        const cosine = Number(row.cosine);
        const jaccard = Number(row.jaccard);
        const hybridRaw =
          row.hybrid !== undefined ? Number(row.hybrid) : cosine + jaccard;

        await client.query(
          `
          INSERT INTO recommendations
          (user_id, meeting_id, cosine_score, jaccard_score, hybrid_raw, final_score, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
        `,
          [userId, row.meetingId, cosine, jaccard, hybridRaw, Number(row.finalScore), now]
        );
      }
    }

    await client.query("COMMIT");
    await client.query("DROP TABLE IF EXISTS meeting_participant_vectors");
    await client.query("DROP TABLE IF EXISTS meeting_tag_vectors");
    await client.query("DROP TABLE IF EXISTS meeting_tags");
    await client.query("ALTER TABLE meetings DROP COLUMN IF EXISTS leader_name");

    const counts = await client.query(`
      SELECT 'users' AS table_name, COUNT(*) AS count FROM users
      UNION ALL SELECT 'meeting_types', COUNT(*) FROM meeting_types
      UNION ALL SELECT 'tags', COUNT(*) FROM tags
      UNION ALL SELECT 'meetings', COUNT(*) FROM meetings
      UNION ALL SELECT 'recommendations', COUNT(*) FROM recommendations
      ORDER BY table_name
    `);

    for (const [meetingId, meeting] of Object.entries(meetings)) {
      // 1. meetings 기본 정보 삽입 (ON CONFLICT 추가)
      await client.query(
        `
        INSERT INTO meetings(
          meeting_id,
          title,
          meeting_type,
          tag_id,
          description,
          location,
          meeting_time,
          max_members,
          is_recruiting,
          join_condition,
          host_user_id,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::timestamptz)
        ON CONFLICT (meeting_id) DO UPDATE SET
          title = EXCLUDED.title,
          meeting_type = EXCLUDED.meeting_type,
          tag_id = EXCLUDED.tag_id,
          description = EXCLUDED.description,
          location = EXCLUDED.location,
          meeting_time = EXCLUDED.meeting_time,
          max_members = EXCLUDED.max_members,
          is_recruiting = EXCLUDED.is_recruiting,
          join_condition = EXCLUDED.join_condition,
          host_user_id = EXCLUDED.host_user_id,
          created_at = EXCLUDED.created_at
        `,
        [
          meetingId,
          meeting.title,
          meeting.meetingType ?? "small-group",
          meeting.tagId ?? meeting.tags?.[0] ?? null,
          meeting.description,
          meeting.location ?? null,
          meeting.meetingTime ?? null,
          meeting.maxMembers ?? null,
          meeting.isRecruiting ?? true,
          meeting.joinCondition ?? null,
          meeting.hostUserId,
          meeting.createdAt,
        ]
      );

      // 2. participants 삽입 부분 (기존과 동일하지만 안전하게 ON CONFLICT 유지)
      if (meeting.participants && Array.isArray(meeting.participants)) {
        for (const userId of meeting.participants) {
          if (users[userId]) {
            await client.query(
              `
              INSERT INTO meeting_participants(meeting_id, user_id, joined_at)
              VALUES ($1, $2, $3::timestamptz)
              ON CONFLICT (meeting_id, user_id) DO NOTHING
              `,
              [meetingId, userId, meeting.createdAt]
            );
          }
        }
      }
    }

    console.log("PostgreSQL 시드 완료");
    counts.rows.forEach((row) => {
      console.log(`${row.table_name}: ${row.count}`);
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("시드 실패:", error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
