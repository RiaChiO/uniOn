// Role: map HTTP routes to service functions.
import { pool } from "../db/pool.js";
import { readJsonBody } from "../http/request.js";
import { sendJson, sendNotFound } from "../http/response.js";
import {
  getMeetings,
  createMeeting,
  createMeetingActivity,
  deleteMeetingActivity,
  getMeetingActivities,
  getMeetingsByParticipant,
  getMeetingMembers,
  getMeetingJoinRequests,
  createMeetingJoinRequest,
  approveMeetingJoinRequest,
  rejectMeetingJoinRequest,
  updateMeeting,
  updateMeetingActivity,
  deleteMeeting,
  removeMeetingMember,
  transferMeetingLeadership,
  updateMeetingRecruitment,
} from "../services/meetingService.js";
import {
  getMeetingTypes,
  meetingTypeExists,
} from "../services/meetingTypeService.js";
import { getRecommendationsByUserId } from "../services/recommendationService.js";
import {
  addUserWishlistMeeting,
  getUserWishlistMeetings,
  getUsers,
  removeUserWishlistMeeting,
  upsertUser,
} from "../services/userService.js";

const ALLOWED_EMAIL_DOMAIN = "@gnu.ac.kr";
const ALLOW_TEST_LOGIN = process.env.ALLOW_TEST_LOGIN === "true";

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

    if (!ALLOW_TEST_LOGIN && !email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
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

  if (pathname.startsWith("/api/users/") && pathname.endsWith("/wishlist")) {
    const userId = decodeURIComponent(
      pathname.replace("/api/users/", "").replace("/wishlist", "")
    );

    if (!userId) {
      sendJson(res, 400, {
        message: "userId는 필수입니다.",
      });
      return;
    }

    if (req.method === "GET") {
      const meetings = await getUserWishlistMeetings(userId);
      sendJson(res, 200, meetings);
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const meetingId = String(body.meetingId ?? "").trim();

      if (!meetingId) {
        sendJson(res, 400, {
          message: "meetingId는 필수입니다.",
        });
        return;
      }

      try {
        const wishlist = await addUserWishlistMeeting({ userId, meetingId });
        sendJson(res, 201, {
          message: "관심 목록에 추가했습니다.",
          wishlist,
        });
      } catch (error) {
        sendJson(res, error.statusCode ?? 500, {
          message: error.message || "관심 목록 추가 중 오류가 발생했습니다.",
        });
      }
      return;
    }
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/users/") && pathname.includes("/wishlist/")) {
    const [userIdPart, meetingIdPart] = pathname
      .replace("/api/users/", "")
      .split("/wishlist/");
    const userId = decodeURIComponent(userIdPart ?? "");
    const meetingId = decodeURIComponent(meetingIdPart ?? "");

    if (!userId || !meetingId) {
      sendJson(res, 400, {
        message: "userId와 meetingId는 필수입니다.",
      });
      return;
    }

    try {
      await removeUserWishlistMeeting({ userId, meetingId });
      sendJson(res, 200, { message: "관심 목록에서 제거했습니다." });
    } catch (error) {
      sendJson(res, error.statusCode ?? 500, {
        message: error.message || "관심 목록 제거 중 오류가 발생했습니다.",
      });
    }
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

  if (pathname.startsWith("/api/meetings/") && pathname.endsWith("/activities")) {
    const meetingId = decodeURIComponent(
      pathname.replace("/api/meetings/", "").replace("/activities", "")
    );

    if (!meetingId) {
      sendJson(res, 400, {
        message: "meetingId는 필수입니다.",
      });
      return;
    }

    if (req.method === "GET") {
      const activities = await getMeetingActivities(meetingId);
      sendJson(res, 200, activities);
      return;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      const title = String(body.title ?? "").trim();
      const activityType = String(body.activityType ?? "").trim();
      const activityDate = String(body.activityDate ?? "").trim();

      if (!title || !activityType || !activityDate) {
        sendJson(res, 400, {
          message: "title, activityType, activityDate는 필수입니다.",
        });
        return;
      }

      try {
        const activity = await createMeetingActivity({
          meetingId,
          title,
          activityType,
          activityDate,
        });
        sendJson(res, 201, {
          message: "활동 내역을 추가했습니다.",
          activity,
        });
      } catch (error) {
        sendJson(res, error.statusCode ?? 500, {
          message: error.message || "활동 추가 중 오류가 발생했습니다.",
        });
      }
      return;
    }
  }

  if (pathname.startsWith("/api/meetings/") && pathname.includes("/activities/")) {
    const [meetingIdPart, activityIdPart] = pathname
      .replace("/api/meetings/", "")
      .split("/activities/");
    const meetingId = decodeURIComponent(meetingIdPart ?? "");
    const activityId = Number(decodeURIComponent(activityIdPart ?? ""));

    if (!meetingId || !Number.isInteger(activityId)) {
      sendJson(res, 400, {
        message: "meetingId와 activityId는 필수입니다.",
      });
      return;
    }

    if (req.method === "PATCH") {
      const body = await readJsonBody(req);
      const title = String(body.title ?? "").trim();
      const activityType = String(body.activityType ?? "").trim();
      const activityDate = String(body.activityDate ?? "").trim();

      if (!title || !activityType || !activityDate) {
        sendJson(res, 400, {
          message: "title, activityType, activityDate는 필수입니다.",
        });
        return;
      }

      try {
        const activity = await updateMeetingActivity({
          meetingId,
          activityId,
          title,
          activityType,
          activityDate,
        });
        sendJson(res, 200, {
          message: "활동 내역을 수정했습니다.",
          activity,
        });
      } catch (error) {
        sendJson(res, error.statusCode ?? 500, {
          message: error.message || "활동 수정 중 오류가 발생했습니다.",
        });
      }
      return;
    }

    if (req.method === "DELETE") {
      try {
        await deleteMeetingActivity({ meetingId, activityId });
        sendJson(res, 200, { message: "활동 내역을 삭제했습니다." });
      } catch (error) {
        sendJson(res, error.statusCode ?? 500, {
          message: error.message || "활동 삭제 중 오류가 발생했습니다.",
        });
      }
      return;
    }
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/meetings/") && pathname.includes("/members/")) {
    const [meetingIdPart, userIdPart] = pathname
      .replace("/api/meetings/", "")
      .split("/members/");
    const meetingId = decodeURIComponent(meetingIdPart ?? "");
    const userId = decodeURIComponent(userIdPart ?? "");

    if (!meetingId || !userId) {
      sendJson(res, 400, {
        message: "meetingId와 userId는 필수입니다.",
      });
      return;
    }

    try {
      await removeMeetingMember({ meetingId, userId });
      sendJson(res, 200, { message: "멤버를 내보냈습니다." });
    } catch (error) {
      sendJson(res, error.statusCode ?? 500, {
        message: error.message || "멤버 내보내기 중 오류가 발생했습니다.",
      });
    }
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
    const displayCategory = String(body.displayCategory ?? "").trim();
    const location = body.location == null ? null : String(body.location).trim();
    const meetingTime = body.meetingTime == null ? null : String(body.meetingTime).trim();
    const maxMembers = body.maxMembers == null || body.maxMembers === "" ? null : Number(body.maxMembers);
    const joinCondition = body.joinCondition == null ? null : String(body.joinCondition).trim();

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

    const meeting = await createMeeting({
      title,
      meetingType,
      description,
      hostUserId,
      tagId,
      displayCategory,
      location,
      meetingTime,
      maxMembers,
      joinCondition,
    });
    sendJson(res, 201, {
      message: "모임이 생성되었습니다.",
      meeting,
    });
    return;
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/meetings/") && !pathname.includes("/join-requests/") && !pathname.includes("/activities") && !pathname.endsWith("/leader") && !pathname.endsWith("/recruitment")) {
    const meetingId = decodeURIComponent(pathname.replace("/api/meetings/", ""));
    const body = await readJsonBody(req);
    const title = String(body.title ?? "").trim();
    const description = String(body.description ?? "").trim();
    const location = body.location == null ? null : String(body.location).trim();
    const meetingTime = body.meetingTime == null ? null : String(body.meetingTime).trim();
    const tagId = body.tagId == null ? null : String(body.tagId).trim();
    const displayCategory = body.displayCategory == null ? null : String(body.displayCategory).trim();
    const joinCondition = body.joinCondition == null ? null : String(body.joinCondition).trim();
    const maxMembers = body.maxMembers == null || body.maxMembers === "" ? null : Number(body.maxMembers);

    if (!meetingId || !title || !description) {
      sendJson(res, 400, {
        message: "meetingId, title, description은 필수입니다.",
      });
      return;
    }

    try {
      const meeting = await updateMeeting({
        meetingId,
        title,
        description,
        location,
        meetingTime,
        maxMembers,
        tagId,
        displayCategory,
        joinCondition,
      });
      sendJson(res, 200, {
        message: "모임 정보가 수정되었습니다.",
        meeting,
      });
    } catch (error) {
      sendJson(res, error.statusCode ?? 500, {
        message: error.message || "모임 수정 중 오류가 발생했습니다.",
      });
    }
    return;
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/meetings/") && pathname.endsWith("/leader")) {
    const meetingId = decodeURIComponent(pathname.replace("/api/meetings/", "").replace("/leader", ""));
    const body = await readJsonBody(req);
    const newLeaderUserId = String(body.newLeaderUserId ?? "").trim();

    if (!meetingId || !newLeaderUserId) {
      sendJson(res, 400, {
        message: "meetingId와 newLeaderUserId는 필수입니다.",
      });
      return;
    }

    try {
      await transferMeetingLeadership({ meetingId, newLeaderUserId });
      sendJson(res, 200, { message: "리더를 위임했습니다." });
    } catch (error) {
      sendJson(res, error.statusCode ?? 500, {
        message: error.message || "리더 위임 중 오류가 발생했습니다.",
      });
    }
    return;
  }

  if (req.method === "PATCH" && pathname.startsWith("/api/meetings/") && pathname.endsWith("/recruitment")) {
    const meetingId = decodeURIComponent(pathname.replace("/api/meetings/", "").replace("/recruitment", ""));
    const body = await readJsonBody(req);
    const isRecruiting = Boolean(body.isRecruiting);

    if (!meetingId) {
      sendJson(res, 400, {
        message: "meetingId는 필수입니다.",
      });
      return;
    }

    try {
      const meeting = await updateMeetingRecruitment({ meetingId, isRecruiting });
      sendJson(res, 200, {
        message: "모집 상태를 변경했습니다.",
        meeting,
      });
    } catch (error) {
      sendJson(res, error.statusCode ?? 500, {
        message: error.message || "모집 상태 변경 중 오류가 발생했습니다.",
      });
    }
    return;
  }

  if (req.method === "DELETE" && pathname.startsWith("/api/meetings/") && !pathname.includes("/members/") && !pathname.includes("/activities")) {
    const meetingId = decodeURIComponent(pathname.replace("/api/meetings/", ""));

    if (!meetingId) {
      sendJson(res, 400, {
        message: "meetingId는 필수입니다.",
      });
      return;
    }

    try {
      await deleteMeeting(meetingId);
      sendJson(res, 200, { message: "모임을 삭제했습니다." });
    } catch (error) {
      sendJson(res, error.statusCode ?? 500, {
        message: error.message || "모임 삭제 중 오류가 발생했습니다.",
      });
    }
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
