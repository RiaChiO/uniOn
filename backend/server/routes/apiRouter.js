// Role: map HTTP routes to service functions.
import { pool } from "../db/pool.js";
import { readJsonBody } from "../http/request.js";
import { sendJson, sendNotFound } from "../http/response.js";
import { getMeetings, createMeeting } from "../services/meetingService.js";
import { getRecommendationsByUserId } from "../services/recommendationService.js";
import { getUsers } from "../services/userService.js";

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

  if (req.method === "GET" && pathname === "/api/meetings") {
    const meetings = await getMeetings();
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
    const allowedMeetingTypes = new Set(["club", "small-group", "one-time"]);

    if (!title || !meetingType || !description || !hostUserId || !tagId) {
      sendJson(res, 400, {
        message: "title, meetingType, description, hostUserId, tagId는 필수입니다.",
      });
      return;
    }

    if (!allowedMeetingTypes.has(meetingType)) {
      sendJson(res, 400, {
        message: "meetingType은 club, small-group, one-time 중 하나여야 합니다.",
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
