import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Client } = pg;

const TAGS = [
  { id: "study", name: "학습/교육" },
  { id: "exercise", name: "운동/스포츠" },
  { id: "culture", name: "문화/취미" },
  { id: "game", name: "게임/e스포츠" },
  { id: "religion", name: "종교" },
  { id: "volunteer", name: "봉사/사회" },
];

const VECTOR_KEYS = TAGS.map((tag) => tag.id);

const MEETING_TYPES = [
  {
    id: "club",
    label: "동아리",
    description: "정기적으로 활동하는 공식 동아리",
    emoji: "🏛️",
    shortDescription: "정식 등록",
    sortOrder: 1,
  },
  {
    id: "small-group",
    label: "소모임",
    description: "관심사가 같은 사람들의 모임",
    emoji: "👥",
    shortDescription: "자유 활동",
    sortOrder: 2,
  },
  {
    id: "one-time",
    label: "일회성 모임",
    description: "한 번의 만남을 위한 모임",
    emoji: "⚡",
    shortDescription: "단기 진행",
    sortOrder: 3,
  },
];

const DISPLAY_CATEGORY_BY_TAG = {
  study: "academic",
  exercise: "sports",
  culture: "culture",
  game: "game",
  religion: "religion",
  volunteer: "volunteer",
};

function inferDisplayCategory(meeting, tagId) {
  if (meeting.displayCategory || meeting.category) {
    return meeting.displayCategory ?? meeting.category;
  }

  const text = `${meeting.title ?? ""} ${meeting.description ?? ""}`;

  if (/창업|경영|마케팅|투자|브랜딩|스타트업|비즈니스|경제|공모전/.test(text)) {
    return "startup";
  }
  if (/영어|일본어|중국어|외국어|회화|토익|언어|국제/.test(text)) {
    return "language";
  }
  if (/네트워킹|커뮤니티|토론|발표|교류|친목|취업|면접|포트폴리오/.test(text)) {
    return "networking";
  }
  if (/알고리즘|코딩|개발|프로그래밍|웹|앱|IT|컴활|파이썬|자바|데이터|AI|인공지능|머신러닝|해커톤|백준/.test(text)) {
    return "it";
  }
  if (/사진|영상|필름|카메라|촬영|편집|미디어/.test(text)) {
    return "photo";
  }
  if (/미술|공예|드로잉|그림|캘리|디자인|일러스트/.test(text)) {
    return "art";
  }
  if (/공연|음악|밴드|보컬|기타|연극|극예술|합창|댄스|스트링|오케스트라|풍물|노래|메아리|로망스/.test(text)) {
    return "music";
  }
  if (/운동|스포츠|체육|러닝|축구|농구|배드민턴|배드|테니스|탁구|야구|볼링|등산|헬스|요가|수영|자전거|풋살|검도|태권도|유도|족구/.test(text)) {
    return "sports";
  }
  if (/봉사|사회|플로깅|환경|나눔/.test(text) || tagId === "volunteer") {
    return "volunteer";
  }
  if (/종교|기독|불교|가톨릭|성경|기도|선교/.test(text) || tagId === "religion") {
    return "religion";
  }
  if (/게임|e스포츠|롤|리그 오브 레전드|보드게임|내전/.test(text) || tagId === "game") {
    return "game";
  }
  if (/학술|스터디|공부|교육|자격증|시험|기출/.test(text) || tagId === "study") {
    return "academic";
  }

  return DISPLAY_CATEGORY_BY_TAG[tagId] ?? tagId ?? null;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function readJsonIfExists(filePath) {
  return fs.existsSync(filePath) ? readJson(filePath) : {};
}

function normalizeVector(vector = {}) {
  return VECTOR_KEYS.map((key) => {
    const value = Number(vector[key] ?? 0);
    return Number.isFinite(value) ? Math.min(10, Math.max(0, Math.round(value))) : 0;
  });
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

function buildSeedData() {
  const dataDir = path.join(backendRoot, "data");
  const legacyUsers = readJson(path.join(dataDir, "users.json"));
  const officialUsers = {
    ...readJson(path.join(dataDir, "official_users.json")),
    ...readJsonIfExists(path.join(dataDir, "official_extra_users.json")),
  };
  const meetings = {
    ...readJson(path.join(dataDir, "official_meetings.json")),
    ...readJsonIfExists(path.join(dataDir, "official_extra_meetings.json")),
  };
  const users = {};

  for (const userId of collectReferencedUserIds(meetings)) {
    if (legacyUsers[userId]) {
      users[userId] = legacyUsers[userId];
    }
  }

  Object.assign(users, officialUsers);

  return { users, meetings };
}

async function ensureSchema(client) {
  const tableExists = await client.query(
    "SELECT to_regclass('public.users') IS NOT NULL AS ok"
  );

  if (!tableExists.rows[0].ok) {
    throw new Error("스키마가 없습니다. 먼저 `npm run db:up`을 실행하세요.");
  }

  await client.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS department TEXT,
      ADD COLUMN IF NOT EXISTS grade TEXT
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

  await client.query(`
    ALTER TABLE meetings
      ADD COLUMN IF NOT EXISTS meeting_type TEXT NOT NULL DEFAULT 'small-group',
      ADD COLUMN IF NOT EXISTS tag_id TEXT REFERENCES tags(tag_id),
      ADD COLUMN IF NOT EXISTS display_category TEXT,
      ADD COLUMN IF NOT EXISTS location TEXT,
      ADD COLUMN IF NOT EXISTS meeting_time TEXT,
      ADD COLUMN IF NOT EXISTS max_members INTEGER,
      ADD COLUMN IF NOT EXISTS is_recruiting BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS join_condition TEXT
  `);

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
    CREATE TABLE IF NOT EXISTS meeting_custom_tags (
      meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (meeting_id, tag)
    )
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
    CREATE TABLE IF NOT EXISTS meeting_activities (
      activity_id BIGSERIAL PRIMARY KEY,
      meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      activity_type TEXT NOT NULL,
      activity_date DATE NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  await client.query("DROP TABLE IF EXISTS meeting_participant_vectors");
  await client.query("DROP TABLE IF EXISTS meeting_tag_vectors");
  await client.query("DROP TABLE IF EXISTS meeting_tags");
  await client.query("ALTER TABLE meetings DROP COLUMN IF EXISTS leader_name");
}

async function clearSeedData(client) {
  await client.query(`
    TRUNCATE TABLE
      recommendations,
      user_wishlist_meetings,
      meeting_activities,
      meeting_join_requests,
      meeting_custom_tags,
      meeting_participants,
      meetings,
      meeting_types,
      user_interest_vectors,
      tags,
      users
    RESTART IDENTITY CASCADE
  `);
}

async function seedMasterData(client) {
  for (const tag of TAGS) {
    await client.query(
      "INSERT INTO tags(tag_id, name) VALUES ($1, $2)",
      [tag.id, tag.name]
    );
  }

  for (const type of MEETING_TYPES) {
    await client.query(
      `
      INSERT INTO meeting_types(
        type_id,
        label,
        description,
        emoji,
        short_description,
        sort_order
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        type.id,
        type.label,
        type.description,
        type.emoji,
        type.shortDescription,
        type.sortOrder,
      ]
    );
  }
}

async function seedUsers(client, users) {
  for (const [userId, user] of Object.entries(users)) {
    await client.query(
      `
      INSERT INTO users(user_id, name, email, department, grade, created_at)
      VALUES ($1, $2, $3, $4, $5, $6::timestamptz)
      `,
      [
        userId,
        user.name,
        user.email,
        user.department ?? null,
        user.grade ?? null,
        user.createdAt,
      ]
    );

    await client.query(
      `
      INSERT INTO user_interest_vectors(
        user_id,
        study,
        exercise,
        culture,
        game,
        religion,
        volunteer
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [userId, ...normalizeVector(user.interestVector)]
    );
  }
}

async function seedMeetings(client, meetings) {
  for (const [meetingId, meeting] of Object.entries(meetings)) {
    const tagId = meeting.tagId ?? meeting.tags?.[0] ?? null;
    const displayCategory = inferDisplayCategory(meeting, tagId);

    await client.query(
      `
      INSERT INTO meetings(
        meeting_id,
        title,
        meeting_type,
        tag_id,
        display_category,
        description,
        location,
        meeting_time,
        max_members,
        is_recruiting,
        join_condition,
        host_user_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::timestamptz)
      `,
      [
        meetingId,
        meeting.title,
        meeting.meetingType ?? "small-group",
        tagId,
        displayCategory,
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

    const customTags = meeting.tags?.length ? meeting.tags : tagId ? [tagId] : [];
    for (const [index, tag] of customTags.entries()) {
      await client.query(
        `
        INSERT INTO meeting_custom_tags(meeting_id, tag, sort_order)
        VALUES ($1, $2, $3)
        `,
        [meetingId, String(tag), index]
      );
    }

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
}

async function logCounts(client) {
  const counts = await client.query(`
    SELECT 'users' AS table_name, COUNT(*) AS count FROM users
    UNION ALL SELECT 'user_interest_vectors', COUNT(*) FROM user_interest_vectors
    UNION ALL SELECT 'meeting_types', COUNT(*) FROM meeting_types
    UNION ALL SELECT 'tags', COUNT(*) FROM tags
    UNION ALL SELECT 'meetings', COUNT(*) FROM meetings
    UNION ALL SELECT 'meeting_custom_tags', COUNT(*) FROM meeting_custom_tags
    UNION ALL SELECT 'meeting_participants', COUNT(*) FROM meeting_participants
    ORDER BY table_name
  `);

  console.log("PostgreSQL 시드 완료");
  counts.rows.forEach((row) => {
    console.log(`${row.table_name}: ${row.count}`);
  });
}

async function main() {
  const client = new Client({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? 5432),
    user: process.env.PGUSER ?? "gnu_DB",
    password: process.env.PGPASSWORD ?? "gnublank4898",
    database: process.env.PGDATABASE ?? "gnumatchclub",
  });
  const { users, meetings } = buildSeedData();

  await client.connect();

  try {
    await client.query("BEGIN");
    await ensureSchema(client);
    await clearSeedData(client);
    await seedMasterData(client);
    await seedUsers(client, users);
    await seedMeetings(client, meetings);
    await client.query("COMMIT");
    await logCounts(client);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("시드 실패:", error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
