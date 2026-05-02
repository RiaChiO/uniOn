// Role: map HTTP routes to service functions.
import { pool } from "../db/pool.js";
import { readJsonBody } from "../http/request.js";
import { sendJson, sendNotFound } from "../http/response.js";
import {
  getMeetings,
  createMeeting,
  getMeetingsByParticipant,
  getMeetingMembers,
  getMeetingJoinRequests,
  createMeetingJoinRequest,
  approveMeetingJoinRequest,
  rejectMeetingJoinRequest,
} from "../services/meetingService.js";
import {
  getMeetingTypes,
  meetingTypeExists,
} from "../services/meetingTypeService.js";
import { getRecommendationsByUserId } from "../services/recommendationService.js";
import { getUsers, upsertUser } from "../services/userService.js";

export async function handleApiRoute(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    const result = await pool.query("SELECT NOW() AS now");
    sendJson(res, 200, {
      status: "ok",
      database: "connected",
      now: result.rows[0].now,
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/users") {
    const users = await getUsers();
    sendJson(res, 200, users);
    return;
  }

  if (req.method === "POST" && pathname === "/api/users/sync") {
    const body = await readJsonBody(req);
    const userId = String(body.userId ?? "").trim();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!userId || !name || !email) {
      sendJson(res, 400, {
        message: "userId, name, email은 필수입니다.",
      });
      return;
    }

    if (!email.endsWith("@gnu.ac.kr")) {
      sendJson(res, 403, {
        message: "gnu.ac.kr 계정만 허용됩니다.",
      });
      return;
    }

    const user = await upsertUser({ userId, name, email });
    sendJson(res, 200, {
      message: "사용자 정보가 동기화되었습니다.",
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        createdAt: user.created_at,
      },
    });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/users/vectors/")) {
    const userId = decodeURIComponent(pathname.replace("/api/users/vectors/", ""));
    const result = await pool.query(
      "SELECT * FROM user_interest_vectors WHERE TRIM(user_id) = TRIM($1)", 
      [userId]
    );
    
    if (result.rows.length === 0) {
      sendJson(res, 404, { message: "유저 벡터 정보를 찾을 수 없습니다." });
      return;
    }
    sendJson(res, 200, result.rows[0]);
    return;
  }

  // 2. 기존 /api/meetings GET 요청 (위의 서비스 수정을 통해 데이터가 이미 포함됨)
  if (req.method === "GET" && pathname === "/api/meetings") {
    const meetings = await getMeetings(); // 수정된 getMeetings 호출
    sendJson(res, 200, meetings);
    return;
  }

  if (req.method === "GET" && pathname === "/api/meeting-types") {
    const meetingTypes = await getMeetingTypes();
    sendJson(res, 200, meetingTypes);
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/meetings/") && pathname.endsWith("/members")) {
    const meetingId = decodeURIComponent(
      pathname.replace("/api/meetings/", "").replace("/members", "")
    );

    if (!meetingId) {
      sendJson(res, 400, {
        message: "meetingId는 필수입니다.",
      });
      return;
    }

    const members = await getMeetingMembers(meetingId);
    sendJson(res, 200, members);
    return;
  }

  if (pathname.startsWith("/api/meetings/") && pathname.endsWith("/join-requests")) {
    const meetingId = decodeURIComponent(
      pathname.replace("/api/meetings/", "").replace("/join-requests", "")
    );

    if (!meetingId) {
      sendJson(res, 400, {
        message: "meetingId는 필수입니다.",
      });
      return;
    }

    if (req.method === "GET") {
      const requests = await getMeetingJoinRequests(meetingId);
      sendJson(res, 200, requests);
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const userId = String(body.userId ?? "").trim();

      if (!userId) {
        sendJson(res, 400, {
          message: "userId는 필수입니다.",
        });
        return;
      }

      try {
        const request = await createMeetingJoinRequest({ meetingId, userId });
        sendJson(res, 201, {
          message: "가입 신청이 접수되었습니다.",
          request,
        });
      } catch (error) {
        sendJson(res, error.statusCode ?? 500, {
          message: error.message || "가입 신청 처리 중 오류가 발생했습니다.",
        });
      }
      return;
    }
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/meetings/") && pathname.includes("/join-requests/")) {
    const [meetingIdPart, userIdPart] = pathname
      .replace("/api/meetings/", "")
      .split("/join-requests/");
    const meetingId = decodeURIComponent(meetingIdPart ?? "");
    const userId = decodeURIComponent(userIdPart ?? "");
    const body = await readJsonBody(req);
    const action = String(body.action ?? "").trim();

    if (!meetingId || !userId || !action) {
      sendJson(res, 400, {
        message: "meetingId, userId, action은 필수입니다.",
      });
      return;
    }

    try {
      if (action === "approve") {
        await approveMeetingJoinRequest({ meetingId, userId });
        sendJson(res, 200, { message: "가입 신청을 승인했습니다." });
        return;
      }

      if (action === "reject") {
        await rejectMeetingJoinRequest({ meetingId, userId });
        sendJson(res, 200, { message: "가입 신청을 거절했습니다." });
        return;
      }

      sendJson(res, 400, {
        message: "action은 approve 또는 reject여야 합니다.",
      });
    } catch (error) {
      sendJson(res, error.statusCode ?? 500, {
        message: error.message || "가입 신청 처리 중 오류가 발생했습니다.",
      });
    }
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/users/") && pathname.endsWith("/meetings")) {
    const userId = decodeURIComponent(
      pathname.replace("/api/users/", "").replace("/meetings", "")
    );

    if (!userId) {
      sendJson(res, 400, {
        message: "userId는 필수입니다.",
      });
      return;
    }

    const meetings = await getMeetingsByParticipant(userId);
    sendJson(res, 200, meetings);
    return;
  }

  if (req.method === "POST" && pathname === "/api/meetings") {
    const body = await readJsonBody(req);
    const title = String(body.title ?? "").trim();
    const meetingType = String(body.meetingType ?? "").trim();
    const description = String(body.description ?? "").trim();
    const hostUserId = String(body.hostUserId ?? "").trim();
    const tagId = String(body.tagId ?? "").trim();

    if (!title || !meetingType || !description || !hostUserId || !tagId) {
      sendJson(res, 400, {
        message: "title, meetingType, description, hostUserId, tagId는 필수입니다.",
      });
      return;
    }

    if (!(await meetingTypeExists(meetingType))) {
      sendJson(res, 400, {
        message: "등록되지 않은 meetingType입니다.",
      });
      return;
    }

    const meeting = await createMeeting({ title, meetingType, description, hostUserId, tagId });
    sendJson(res, 201, {
      message: "모임이 생성되었습니다.",
      meeting,
    });
    return;
  }

  if (req.method === "GET" && pathname.startsWith("/api/recommendations/")) {
    const userId = decodeURIComponent(pathname.replace("/api/recommendations/", ""));
    const recommendations = await getRecommendationsByUserId(userId);

    if (recommendations.length === 0) {
      sendJson(res, 404, {
        message: `No recommendations found for ${userId}`,
      });
      return;
    }

    sendJson(res, 200, recommendations);
    return;
  }

  sendNotFound(res);
}
