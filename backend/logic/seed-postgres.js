import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;
const TAGS = ["study", "exercise", "culture", "game", "religion", "volunteer"];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(backendRoot, "..");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
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

  const users = readJson(path.join(dataDir, "users.json"));
  const meetings = readJson(path.join(dataDir, "meetings.json"));

  await client.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      ALTER TABLE meetings
      ADD COLUMN IF NOT EXISTS tag_id TEXT REFERENCES tags(tag_id)
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
        meeting_participants,
        meetings,
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

    for (const [meetingId, meeting] of Object.entries(meetings)) {
      await client.query(
        `
        INSERT INTO meetings(meeting_id, title, meeting_type, tag_id, description, host_user_id, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz)
      `,
        [
          meetingId,
          meeting.title,
          meeting.meetingType ?? "small-group",
          meeting.tagId ?? meeting.tags?.[0] ?? null,
          meeting.description,
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

    const counts = await client.query(`
      SELECT 'users' AS table_name, COUNT(*) AS count FROM users
      UNION ALL SELECT 'tags', COUNT(*) FROM tags
      UNION ALL SELECT 'meetings', COUNT(*) FROM meetings
      UNION ALL SELECT 'recommendations', COUNT(*) FROM recommendations
      ORDER BY table_name
    `);

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
