// Role: query and mutate meeting-related data.
import { pool } from "../db/pool.js";
import { createNotification } from "./notificationService.js";

async function ensureJoinRequestsTable(client = pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS meeting_join_requests (
      meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (meeting_id, user_id)
    )
  `);
}

async function ensureActivitiesTable(client = pool) {
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
    CREATE INDEX IF NOT EXISTS idx_meeting_activities_meeting_date
    ON meeting_activities(meeting_id, activity_date DESC, activity_id DESC)
  `);
}

async function ensureMeetingDisplayCategoryColumn(client = pool) {
  await client.query(`
    ALTER TABLE meetings
    ADD COLUMN IF NOT EXISTS display_category TEXT
  `);
}

async function ensureMeetingImageUrlColumn(client = pool) {
  await client.query(`
    ALTER TABLE meetings
    ADD COLUMN IF NOT EXISTS image_url TEXT
  `);
}

async function ensureMeetingCustomTagsTable(client = pool) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS meeting_custom_tags (
      meeting_id TEXT NOT NULL REFERENCES meetings(meeting_id) ON DELETE CASCADE,
      tag TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (meeting_id, tag)
    )
  `);
}

function normalizeCustomTags(tags) {
  if (!Array.isArray(tags)) return [];

  return [...new Set(
    tags
      .map((tag) => String(tag ?? "").replace(/^#/, "").trim())
      .filter(Boolean)
  )];
}

function buildMeetingTags(tagId, tags) {
  const normalizedTags = normalizeCustomTags(tags);
  const normalizedTagId = String(tagId ?? "").replace(/^#/, "").trim();

  if (!normalizedTagId) return normalizedTags;

  const withoutTagId = normalizedTags.filter((tag) => tag !== normalizedTagId);
  return [normalizedTagId, ...withoutTagId];
}

async function replaceMeetingCustomTags(client, meetingId, tagId, tags) {
  const normalizedTags = buildMeetingTags(tagId, tags);

  await client.query("DELETE FROM meeting_custom_tags WHERE meeting_id = $1", [meetingId]);

  for (const [index, tag] of normalizedTags.entries()) {
    await client.query(
      `
      INSERT INTO meeting_custom_tags (meeting_id, tag, sort_order)
      VALUES ($1, $2, $3)
      `,
      [meetingId, tag, index]
    );
  }

  return normalizedTags;
}

function inferDisplayCategory({ displayCategory, tagId, description }) {
  if (displayCategory) return displayCategory;

  const text = String(description ?? "");
  if (/창업|경영|마케팅|투자|브랜딩|스타트업|비즈니스|경제|공모전/.test(text)) return "startup";
  if (/영어|일본어|중국어|외국어|회화|토익|언어|국제/.test(text)) return "language";
  if (/네트워킹|커뮤니티|토론|발표|교류|친목|취업|면접|포트폴리오/.test(text)) return "networking";
  if (/알고리즘|코딩|개발|프로그래밍|웹|앱|IT|컴활|파이썬|자바|데이터|AI|인공지능|머신러닝|해커톤|백준/.test(text)) return "it";
  if (/사진|영상|필름|카메라|촬영|편집|미디어/.test(text)) return "photo";
  if (/미술|공예|드로잉|그림|캘리|디자인|일러스트/.test(text)) return "art";
  if (/공연|음악|밴드|보컬|기타|연극|극예술|합창|댄스|스트링|오케스트라|풍물|노래|메아리|로망스/.test(text)) return "music";
  if (/운동|스포츠|체육|러닝|축구|농구|배드민턴|배드|테니스|탁구|야구|볼링|등산|헬스|요가|수영|자전거|풋살|검도|태권도|유도|족구/.test(text)) return "sports";
  if (/봉사|사회|플로깅|환경|나눔/.test(text)) return "volunteer";
  if (/종교|기독|불교|가톨릭|성경|기도|선교/.test(text)) return "religion";
  if (/게임|e스포츠|롤|리그 오브 레전드|보드게임|내전/.test(text)) return "game";
  if (/학술|스터디|공부|교육|자격증|시험|기출/.test(text)) return "academic";

  const fallbackByTag = {
    study: "academic",
    exercise: "sports",
    culture: "culture",
    game: "game",
    religion: "religion",
    volunteer: "volunteer",
  };

  return fallbackByTag[tagId] ?? tagId ?? null;
}

export async function getMeetings() {
  await ensureMeetingDisplayCategoryColumn();
  await ensureMeetingImageUrlColumn();
  await ensureMeetingCustomTagsTable();

  const result = await pool.query(
    `
    SELECT
      m.meeting_id AS "meetingId",
      m.title,
      m.meeting_type AS "meetingType",
      mt.label AS "meetingTypeLabel",
      m.tag_id AS "tagId",
      COALESCE(
        m.display_category,
        CASE
          WHEN m.description LIKE '%공연분과%' OR m.description LIKE '%공연 관련%' THEN 'music'
          WHEN m.description LIKE '%체육분과%' THEN 'sports'
          WHEN m.description LIKE '%학술분과%' THEN 'academic'
          WHEN m.description LIKE '%봉사%' THEN 'volunteer'
          WHEN m.description LIKE '%종교분과%' THEN 'religion'
          WHEN m.tag_id = 'study' THEN 'academic'
          WHEN m.tag_id = 'exercise' THEN 'sports'
          ELSE m.tag_id
        END
      ) AS "displayCategory",
      m.description,
      m.location,
      m.meeting_time AS "meetingTime",
      m.max_members AS "maxMembers",
      m.is_recruiting AS "isRecruiting",
      m.join_condition AS "joinCondition",
      m.image_url AS "imageUrl",
      m.host_user_id AS "hostUserId",
      host.name AS "leaderName",
      host.department AS "leaderDepartment",
      host.grade AS "leaderGrade",
      m.created_at AS "createdAt",
      COALESCE(
        (
          SELECT array_agg(mct.tag ORDER BY mct.sort_order, mct.tag)
          FROM meeting_custom_tags mct
          WHERE mct.meeting_id = m.meeting_id
        ),
        CASE
          WHEN m.tag_id IS NULL THEN ARRAY[]::text[]
          ELSE ARRAY[m.tag_id]
        END
      ) AS tags,
      COALESCE(mp_count.participant_count, 0)::INT AS "participantCount",
      -- [추가] 참여자 평균 벡터 계산
      ARRAY[
        COALESCE(AVG(uv.study), 0)::FLOAT, 
        COALESCE(AVG(uv.exercise), 0)::FLOAT, 
        COALESCE(AVG(uv.culture), 0)::FLOAT, 
        COALESCE(AVG(uv.game), 0)::FLOAT, 
        COALESCE(AVG(uv.religion), 0)::FLOAT, 
        COALESCE(AVG(uv.volunteer), 0)::FLOAT
      ] AS "avg_participant_vector"
    FROM meetings m
    JOIN users host ON host.user_id = m.host_user_id
    JOIN meeting_types mt ON mt.type_id = m.meeting_type
    -- 참여자 수 카운트 서브쿼리
    LEFT JOIN (
      SELECT meeting_id, COUNT(*) AS participant_count
      FROM meeting_participants
      GROUP BY meeting_id
    ) mp_count ON TRIM(mp_count.meeting_id) = TRIM(m.meeting_id)
    -- [추가] 참여자 벡터 데이터를 가져오기 위한 JOIN
    LEFT JOIN meeting_participants mp ON TRIM(mp.meeting_id) = TRIM(m.meeting_id)
    LEFT JOIN user_interest_vectors uv ON TRIM(uv.user_id) = TRIM(mp.user_id)
    GROUP BY 
      m.meeting_id, m.title, m.meeting_type, mt.label, m.tag_id, m.display_category,
      m.description, m.location, m.meeting_time, m.max_members, m.is_recruiting,
      m.join_condition, m.image_url, m.host_user_id, host.name, host.department, host.grade,
      m.created_at, mp_count.participant_count
    ORDER BY
      NULLIF(regexp_replace(m.meeting_id, '[^0-9]', '', 'g'), '')::INT,
      m.meeting_id
    `
  );

  return result.rows;
}

export async function getMeetingActivities(meetingId) {
  await ensureActivitiesTable();

  const result = await pool.query(
    `
    SELECT
      activity_id AS "activityId",
      meeting_id AS "meetingId",
      title,
      activity_type AS "activityType",
      activity_date AS "activityDate",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM meeting_activities
    WHERE meeting_id = $1
    ORDER BY activity_date DESC, activity_id DESC
    `,
    [meetingId]
  );

  return result.rows;
}

export async function createMeetingActivity({
  meetingId,
  title,
  activityType,
  activityDate,
}) {
  await ensureActivitiesTable();

  const result = await pool.query(
    `
    INSERT INTO meeting_activities (
      meeting_id,
      title,
      activity_type,
      activity_date
    )
    VALUES ($1, $2, $3, $4)
    RETURNING
      activity_id AS "activityId",
      meeting_id AS "meetingId",
      title,
      activity_type AS "activityType",
      activity_date AS "activityDate",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [meetingId, title, activityType, activityDate]
  );

  return result.rows[0];
}

export async function updateMeetingActivity({
  meetingId,
  activityId,
  title,
  activityType,
  activityDate,
}) {
  await ensureActivitiesTable();

  const result = await pool.query(
    `
    UPDATE meeting_activities
    SET
      title = $3,
      activity_type = $4,
      activity_date = $5,
      updated_at = NOW()
    WHERE meeting_id = $1 AND activity_id = $2
    RETURNING
      activity_id AS "activityId",
      meeting_id AS "meetingId",
      title,
      activity_type AS "activityType",
      activity_date AS "activityDate",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    `,
    [meetingId, activityId, title, activityType, activityDate]
  );

  if (result.rowCount === 0) {
    const error = new Error("활동 내역을 찾을 수 없습니다.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

export async function deleteMeetingActivity({ meetingId, activityId }) {
  await ensureActivitiesTable();

  const result = await pool.query(
    `
    DELETE FROM meeting_activities
    WHERE meeting_id = $1 AND activity_id = $2
    `,
    [meetingId, activityId]
  );

  if (result.rowCount === 0) {
    const error = new Error("활동 내역을 찾을 수 없습니다.");
    error.statusCode = 404;
    throw error;
  }
}

export async function getMeetingsByParticipant(userId) {
  const result = await pool.query(
    `
    SELECT
      m.meeting_id AS "meetingId",
      m.title,
      m.meeting_type AS "meetingType",
      mt.label AS "meetingTypeLabel",
      m.host_user_id AS "hostUserId",
      host.name AS "leaderName",
      CASE
        WHEN m.host_user_id = $1 THEN '리더'
        ELSE '멤버'
      END AS role,
      COALESCE(mp_count.participant_count, 0)::INT AS "participantCount"
    FROM meeting_participants mp
    JOIN meetings m ON m.meeting_id = mp.meeting_id
    JOIN meeting_types mt ON mt.type_id = m.meeting_type
    JOIN users host ON host.user_id = m.host_user_id
    LEFT JOIN (
      SELECT meeting_id, COUNT(*) AS participant_count
      FROM meeting_participants
      GROUP BY meeting_id
    ) mp_count ON mp_count.meeting_id = m.meeting_id
    WHERE mp.user_id = $1
    ORDER BY
      NULLIF(regexp_replace(m.meeting_id, '[^0-9]', '', 'g'), '')::INT,
      m.meeting_id
    `,
    [userId]
  );

  return result.rows;
}

export async function getMeetingMembers(meetingId) {
  const result = await pool.query(
    `
    SELECT
      u.user_id AS "userId",
      u.name,
      u.department,
      u.grade,
      CASE
        WHEN m.host_user_id = u.user_id THEN '리더'
        ELSE '멤버'
      END AS role,
      mp.joined_at AS "joinedAt"
    FROM meeting_participants mp
    JOIN users u ON u.user_id = mp.user_id
    JOIN meetings m ON m.meeting_id = mp.meeting_id
    WHERE mp.meeting_id = $1
    ORDER BY
      CASE WHEN m.host_user_id = u.user_id THEN 0 ELSE 1 END,
      u.name,
      u.user_id
    `,
    [meetingId]
  );

  return result.rows;
}

export async function getMeetingJoinRequests(meetingId) {
  await ensureJoinRequestsTable();

  const result = await pool.query(
    `
    SELECT
      u.user_id AS "userId",
      u.name,
      u.department,
      u.grade,
      mjr.requested_at AS "requestedAt"
    FROM meeting_join_requests mjr
    JOIN users u ON u.user_id = mjr.user_id
    WHERE mjr.meeting_id = $1
    ORDER BY mjr.requested_at, u.name, u.user_id
    `,
    [meetingId]
  );

  return result.rows;
}

export async function getMeetingJoinStatus({ meetingId, userId }) {
  await ensureJoinRequestsTable();

  const result = await pool.query(
    `
    SELECT
      EXISTS (
        SELECT 1
        FROM meeting_join_requests
        WHERE meeting_id = $1 AND user_id = $2
      ) AS "isPending",
      EXISTS (
        SELECT 1
        FROM meeting_participants
        WHERE meeting_id = $1 AND user_id = $2
      ) AS "isMember"
    `,
    [meetingId, userId]
  );

  return result.rows[0];
}

function requiresJoinApproval(joinCondition) {
  return String(joinCondition ?? "")
    .split(",")
    .map((condition) => condition.trim())
    .includes("승인 필요");
}

export async function createMeetingJoinRequest({ meetingId, userId }) {
  const client = await pool.connect();

  try {
    await ensureJoinRequestsTable(client);
    await client.query("BEGIN");

    const meetingResult = await client.query(
      `
      SELECT
        is_recruiting AS "isRecruiting",
        join_condition AS "joinCondition",
        title,
        host_user_id AS "hostUserId"
      FROM meetings
      WHERE meeting_id = $1
      `,
      [meetingId]
    );

    if (meetingResult.rowCount === 0) {
      const error = new Error("모임을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    const userResult = await client.query(
      `
      SELECT name
      FROM users
      WHERE user_id = $1
      `,
      [userId]
    );
    const userName = userResult.rows[0]?.name || "회원";
    const meeting = meetingResult.rows[0];

    if (!meeting.isRecruiting) {
      const error = new Error("현재 모집이 마감된 모임입니다.");
      error.statusCode = 409;
      throw error;
    }

    const existingMember = await client.query(
      `
      SELECT 1
      FROM meeting_participants
      WHERE meeting_id = $1 AND user_id = $2
      `,
      [meetingId, userId]
    );

    if (existingMember.rowCount > 0) {
      const error = new Error("이미 가입된 모임입니다.");
      error.statusCode = 409;
      throw error;
    }

    if (requiresJoinApproval(meeting.joinCondition)) {
      const result = await client.query(
        `
        INSERT INTO meeting_join_requests (meeting_id, user_id, requested_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (meeting_id, user_id)
        DO NOTHING
        RETURNING
          meeting_id AS "meetingId",
          user_id AS "userId",
          requested_at AS "requestedAt"
        `,
        [meetingId, userId]
      );

      const request = result.rows[0] ?? (
        await client.query(
          `
          SELECT
            meeting_id AS "meetingId",
            user_id AS "userId",
            requested_at AS "requestedAt"
          FROM meeting_join_requests
          WHERE meeting_id = $1 AND user_id = $2
          `,
          [meetingId, userId]
        )
      ).rows[0];

      if (result.rowCount > 0) {
        await createNotification({
          client,
          recipientUserId: meeting.hostUserId,
          audience: "leader",
          type: "join_request",
          meetingId,
          actorUserId: userId,
          title: "새 가입 신청",
          message: `${userName}님이 ${meeting.title} 모임에 가입을 신청했습니다.`,
          metadata: { applicantUserId: userId },
        });
      }

      await client.query("COMMIT");
      return { status: "pending", request };
    }

    await client.query(
      `
      DELETE FROM meeting_join_requests
      WHERE meeting_id = $1 AND user_id = $2
      `,
      [meetingId, userId]
    );

    const result = await client.query(
      `
      INSERT INTO meeting_participants (meeting_id, user_id, joined_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (meeting_id, user_id) DO NOTHING
      RETURNING
        meeting_id AS "meetingId",
        user_id AS "userId",
        joined_at AS "joinedAt"
      `,
      [meetingId, userId]
    );

    await createNotification({
      client,
      recipientUserId: meeting.hostUserId,
      audience: "leader",
      type: "member_joined",
      meetingId,
      actorUserId: userId,
      title: "새 회원 가입",
      message: `${userName}님이 ${meeting.title} 모임에 가입했습니다.`,
      metadata: { memberUserId: userId },
    });

    await client.query("COMMIT");
    return { status: "joined", member: result.rows[0] };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function approveMeetingJoinRequest({ meetingId, userId }) {
  const client = await pool.connect();

  try {
    await ensureJoinRequestsTable(client);
    await client.query("BEGIN");

    const meetingResult = await client.query(
      `
      SELECT
        title,
        host_user_id AS "hostUserId"
      FROM meetings
      WHERE meeting_id = $1
      `,
      [meetingId]
    );

    if (meetingResult.rowCount === 0) {
      const error = new Error("모임을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    const request = await client.query(
      `
      DELETE FROM meeting_join_requests
      WHERE meeting_id = $1 AND user_id = $2
      RETURNING meeting_id, user_id
      `,
      [meetingId, userId]
    );

    if (request.rowCount === 0) {
      const error = new Error("가입 신청을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    await client.query(
      `
      INSERT INTO meeting_participants (meeting_id, user_id, joined_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (meeting_id, user_id) DO NOTHING
      `,
      [meetingId, userId]
    );

    const meeting = meetingResult.rows[0];
    await createNotification({
      client,
      recipientUserId: userId,
      audience: "member",
      type: "join_approved",
      meetingId,
      actorUserId: meeting.hostUserId,
      title: "가입 승인",
      message: `${meeting.title} 모임 가입이 승인되었습니다.`,
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function rejectMeetingJoinRequest({ meetingId, userId }) {
  const client = await pool.connect();

  try {
    await ensureJoinRequestsTable(client);
    await client.query("BEGIN");

    const meetingResult = await client.query(
      `
      SELECT
        title,
        host_user_id AS "hostUserId"
      FROM meetings
      WHERE meeting_id = $1
      `,
      [meetingId]
    );

    if (meetingResult.rowCount === 0) {
      const error = new Error("모임을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    const result = await client.query(
      `
      DELETE FROM meeting_join_requests
      WHERE meeting_id = $1 AND user_id = $2
      `,
      [meetingId, userId]
    );

    if (result.rowCount === 0) {
      const error = new Error("가입 신청을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    const meeting = meetingResult.rows[0];
    await createNotification({
      client,
      recipientUserId: userId,
      audience: "member",
      type: "join_rejected",
      meetingId,
      actorUserId: meeting.hostUserId,
      title: "가입 신청 결과",
      message: `${meeting.title} 모임 가입 신청이 거절되었습니다.`,
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createMeeting({
  title,
  meetingType,
  description,
  hostUserId,
  tagId,
  displayCategory,
  tags,
  location,
  meetingTime,
  maxMembers,
  joinCondition,
  imageUrl,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureMeetingDisplayCategoryColumn(client);
    await ensureMeetingImageUrlColumn(client);
    await ensureMeetingCustomTagsTable(client);

    const nextIdResult = await client.query(
      `
      SELECT COALESCE(MAX(NULLIF(regexp_replace(meeting_id, '[^0-9]', '', 'g'), '')::INT), 0) + 1 AS next_id
      FROM meetings
      `
    );

    const meetingId = `meeting${nextIdResult.rows[0].next_id}`;

    await client.query(
      `
      INSERT INTO meetings (
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
        image_url,
        host_user_id,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $11, $12, NOW())
      `,
      [
        meetingId,
        title,
        meetingType,
        tagId,
        inferDisplayCategory({ displayCategory, tagId, description }),
        description,
        location,
        meetingTime,
        maxMembers,
        joinCondition,
        imageUrl,
        hostUserId,
      ]
    );

    await client.query(
      `
      INSERT INTO meeting_participants (meeting_id, user_id, joined_at)
      VALUES ($1, $2, NOW())
      `,
      [meetingId, hostUserId]
    );
    const customTags = await replaceMeetingCustomTags(client, meetingId, tagId, tags);

    const hostResult = await client.query(
      `
      SELECT name, department, grade
      FROM users
      WHERE user_id = $1
      `,
      [hostUserId]
    );
    const meetingTypeResult = await client.query(
      `
      SELECT label
      FROM meeting_types
      WHERE type_id = $1
      `,
      [meetingType]
    );

    await client.query("COMMIT");

    return {
      meetingId,
      title,
      meetingType,
      meetingTypeLabel: meetingTypeResult.rows[0]?.label ?? meetingType,
      tagId,
      tags: customTags.length > 0 ? customTags : [tagId],
      displayCategory: inferDisplayCategory({ displayCategory, tagId, description }),
      description,
      location,
      meetingTime,
      maxMembers,
      isRecruiting: true,
      joinCondition,
      imageUrl,
      hostUserId,
      leaderName: hostResult.rows[0]?.name,
      leaderDepartment: hostResult.rows[0]?.department,
      leaderGrade: hostResult.rows[0]?.grade,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateMeeting({
  meetingId,
  title,
  description,
  location,
  meetingTime,
  maxMembers,
  tagId,
  displayCategory,
  tags,
  joinCondition,
  imageUrl,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await ensureMeetingDisplayCategoryColumn(client);
    await ensureMeetingImageUrlColumn(client);
    await ensureMeetingCustomTagsTable(client);

    const result = await client.query(
      `
      UPDATE meetings AS m
      SET
        title = $2,
        description = $3,
        location = $4,
        meeting_time = $5,
        max_members = $6,
        tag_id = $7,
        join_condition = $8,
        display_category = COALESCE($9, m.display_category),
        image_url = COALESCE($10, m.image_url)
      FROM users host
      WHERE m.meeting_id = $1
        AND host.user_id = m.host_user_id
      RETURNING
        m.meeting_id AS "meetingId",
        m.title,
        m.meeting_type AS "meetingType",
        m.tag_id AS "tagId",
        COALESCE(m.display_category, m.tag_id) AS "displayCategory",
        m.description,
        m.location,
        m.meeting_time AS "meetingTime",
        m.max_members AS "maxMembers",
        m.is_recruiting AS "isRecruiting",
        m.join_condition AS "joinCondition",
        m.image_url AS "imageUrl",
        m.host_user_id AS "hostUserId",
        host.name AS "leaderName",
        host.department AS "leaderDepartment",
        host.grade AS "leaderGrade",
        m.created_at AS "createdAt"
      `,
      [
        meetingId,
        title,
        description,
        location,
        meetingTime,
        maxMembers,
        tagId,
        joinCondition,
        displayCategory == null
          ? null
          : inferDisplayCategory({ displayCategory, tagId, description }),
        imageUrl,
      ]
    );

    if (result.rowCount === 0) {
      const error = new Error("모임을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    let customTags = null;
    if (tags != null) {
      customTags = await replaceMeetingCustomTags(client, meetingId, tagId, tags);
    }

    await client.query("COMMIT");

    return {
      ...result.rows[0],
      tags: customTags == null
        ? undefined
        : customTags.length > 0 ? customTags : [result.rows[0].tagId],
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteMeeting(meetingId) {
  const result = await pool.query(
    `
    DELETE FROM meetings
    WHERE meeting_id = $1
    RETURNING meeting_id AS "meetingId"
    `,
    [meetingId]
  );

  if (result.rowCount === 0) {
    const error = new Error("모임을 찾을 수 없습니다.");
    error.statusCode = 404;
    throw error;
  }
}

export async function removeMeetingMember({ meetingId, userId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const meetingResult = await client.query(
      `
      SELECT
        title,
        host_user_id AS "hostUserId"
      FROM meetings
      WHERE meeting_id = $1
      `,
      [meetingId]
    );

    if (meetingResult.rowCount === 0) {
      const error = new Error("모임을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    const meeting = meetingResult.rows[0];
    if (meeting.hostUserId === userId) {
      const error = new Error("리더는 내보낼 수 없습니다.");
      error.statusCode = 400;
      throw error;
    }

    const result = await client.query(
      `
      DELETE FROM meeting_participants
      WHERE meeting_id = $1 AND user_id = $2
      `,
      [meetingId, userId]
    );

    if (result.rowCount === 0) {
      const error = new Error("해당 멤버를 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    await createNotification({
      client,
      recipientUserId: userId,
      audience: "member",
      type: "member_removed",
      meetingId,
      actorUserId: meeting.hostUserId,
      title: "모임 강퇴",
      message: `${meeting.title} 모임에서 강퇴되었습니다.`,
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function leaveMeeting({ meetingId, userId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const meetingResult = await client.query(
      `
      SELECT
        title,
        host_user_id AS "hostUserId"
      FROM meetings
      WHERE meeting_id = $1
      `,
      [meetingId]
    );

    if (meetingResult.rowCount === 0) {
      const error = new Error("모임을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    const meeting = meetingResult.rows[0];
    if (meeting.hostUserId === userId) {
      const error = new Error("리더는 모임을 탈퇴할 수 없습니다.");
      error.statusCode = 400;
      throw error;
    }

    const memberResult = await client.query(
      `
      SELECT name
      FROM users
      WHERE user_id = $1
      `,
      [userId]
    );

    const memberName = memberResult.rows[0]?.name ?? "회원";

    const result = await client.query(
      `
      DELETE FROM meeting_participants
      WHERE meeting_id = $1 AND user_id = $2
      `,
      [meetingId, userId]
    );

    if (result.rowCount === 0) {
      const error = new Error("가입된 모임이 아닙니다.");
      error.statusCode = 404;
      throw error;
    }

    await createNotification({
      client,
      recipientUserId: userId,
      audience: "member",
      type: "member_left",
      meetingId,
      actorUserId: userId,
      title: "모임 탈퇴",
      message: `${meeting.title} 모임에서 탈퇴했습니다.`,
    });

    await createNotification({
      client,
      recipientUserId: meeting.hostUserId,
      audience: "leader",
      type: "member_left",
      meetingId,
      actorUserId: userId,
      title: "회원 탈퇴",
      message: `${memberName}님이 ${meeting.title} 모임에서 탈퇴했습니다.`,
      metadata: { memberUserId: userId },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function transferMeetingLeadership({ meetingId, newLeaderUserId }) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const meetingResult = await client.query(
      `
      SELECT host_user_id AS "hostUserId"
      FROM meetings
      WHERE meeting_id = $1
      `,
      [meetingId]
    );

    if (meetingResult.rowCount === 0) {
      const error = new Error("모임을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    if (meetingResult.rows[0].hostUserId === newLeaderUserId) {
      const error = new Error("이미 현재 리더입니다.");
      error.statusCode = 400;
      throw error;
    }

    await client.query(
      `
      INSERT INTO meeting_participants (meeting_id, user_id, joined_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (meeting_id, user_id) DO NOTHING
      `,
      [meetingId, newLeaderUserId]
    );

    const updateResult = await client.query(
      `
      UPDATE meetings
      SET host_user_id = $2
      WHERE meeting_id = $1
      RETURNING host_user_id AS "hostUserId"
      `,
      [meetingId, newLeaderUserId]
    );

    await client.query("COMMIT");
    return updateResult.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function transferMeetingLeadershipAndLeave({
  meetingId,
  currentLeaderUserId,
  newLeaderUserId,
}) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const meetingResult = await client.query(
      `
      SELECT
        title,
        host_user_id AS "hostUserId"
      FROM meetings
      WHERE meeting_id = $1
      FOR UPDATE
      `,
      [meetingId]
    );

    if (meetingResult.rowCount === 0) {
      const error = new Error("모임을 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    const meeting = meetingResult.rows[0];
    if (meeting.hostUserId !== currentLeaderUserId) {
      const error = new Error("현재 모임 리더만 위임 후 탈퇴할 수 있습니다.");
      error.statusCode = 403;
      throw error;
    }

    if (currentLeaderUserId === newLeaderUserId) {
      const error = new Error("다른 멤버에게 리더를 위임해야 합니다.");
      error.statusCode = 400;
      throw error;
    }

    const newLeaderResult = await client.query(
      `
      SELECT 1
      FROM meeting_participants
      WHERE meeting_id = $1 AND user_id = $2
      `,
      [meetingId, newLeaderUserId]
    );

    if (newLeaderResult.rowCount === 0) {
      const error = new Error("리더로 위임할 멤버를 찾을 수 없습니다.");
      error.statusCode = 404;
      throw error;
    }

    await client.query(
      `
      UPDATE meetings
      SET host_user_id = $2
      WHERE meeting_id = $1
      `,
      [meetingId, newLeaderUserId]
    );

    await client.query(
      `
      DELETE FROM meeting_participants
      WHERE meeting_id = $1 AND user_id = $2
      `,
      [meetingId, currentLeaderUserId]
    );

    await createNotification({
      client,
      recipientUserId: currentLeaderUserId,
      audience: "member",
      type: "member_left",
      meetingId,
      actorUserId: currentLeaderUserId,
      title: "리더 위임 및 탈퇴",
      message: `${meeting.title} 모임의 리더를 위임하고 탈퇴했습니다.`,
      metadata: { newLeaderUserId },
    });

    await createNotification({
      client,
      recipientUserId: newLeaderUserId,
      audience: "leader",
      type: "leader_transferred",
      meetingId,
      actorUserId: currentLeaderUserId,
      title: "모임 리더 위임",
      message: `${meeting.title} 모임의 새 리더가 되었습니다.`,
      metadata: { previousLeaderUserId: currentLeaderUserId },
    });

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateMeetingRecruitment({ meetingId, isRecruiting }) {
  const result = await pool.query(
    `
    UPDATE meetings
    SET is_recruiting = $2
    WHERE meeting_id = $1
    RETURNING
      meeting_id AS "meetingId",
      is_recruiting AS "isRecruiting"
    `,
    [meetingId, isRecruiting]
  );

  if (result.rowCount === 0) {
    const error = new Error("모임을 찾을 수 없습니다.");
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}
