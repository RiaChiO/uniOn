// Role: map HTTP routes to service functions.
import express from "express";
import { pool } from "../db/pool.js";
import {
  getMeetings,
  createMeeting,
  createMeetingActivity,
  deleteMeetingActivity,
  getMeetingActivities,
  getMeetingsByParticipant,
  getMeetingMembers,
  getMeetingJoinRequests,
  getMeetingJoinStatus,
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
  getUserInterestVector,
  getUserWishlistMeetings,
  getUsers,
  removeUserWishlistMeeting,
  updateUserInterestVector,
  updateUserProfile,
  upsertUser,
} from "../services/userService.js";

export const apiRouter = express.Router();

const ALLOWED_EMAIL_DOMAIN = "@gnu.ac.kr";
const ALLOW_TEST_LOGIN =
  (typeof process !== "undefined" && process.env.ALLOW_TEST_LOGIN === "true") ||
  (typeof import.meta.env !== "undefined" && import.meta.env.VITE_ALLOW_TEST_LOGIN === "true");

function asyncRoute(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function sendServiceError(res, error, fallbackMessage) {
  res.status(error.statusCode ?? 500).json({
    message: error.message || fallbackMessage,
  });
}

apiRouter.get("/api/health", asyncRoute(async (req, res) => {
  const result = await pool.query("SELECT NOW() AS now");
  res.status(200).json({
    status: "ok",
    database: "connected",
    now: result.rows[0].now,
  });
}));

apiRouter.get("/api/users", asyncRoute(async (req, res) => {
  const users = await getUsers();
  res.status(200).json(users);
}));

apiRouter.post("/api/users/sync", asyncRoute(async (req, res) => {
  const body = req.body ?? {};
  const userId = String(body.userId ?? "").trim();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!userId || !name || !email) {
    res.status(400).json({
      message: "userId, name, email은 필수입니다.",
    });
    return;
  }

  if (!ALLOW_TEST_LOGIN && !email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    res.status(403).json({
      message: "gnu.ac.kr 계정만 허용됩니다.",
    });
    return;
  }

  const user = await upsertUser({ userId, name, email });
  res.status(200).json({
    message: "사용자 정보가 동기화되었습니다.",
    user: {
      userId: user.user_id,
      name: user.name,
      email: user.email,
      department: user.department,
      grade: user.grade,
      createdAt: user.created_at,
    },
  });
}));

apiRouter.patch("/api/users/:userId/profile", asyncRoute(async (req, res) => {
  const userId = req.params.userId;
  const body = req.body ?? {};
  const name = String(body.name ?? "").trim();
  const department = String(body.department ?? "").trim();
  const grade = String(body.grade ?? "").trim();

  if (!userId) {
    res.status(400).json({
      message: "userId는 필수입니다.",
    });
    return;
  }

  if (!name) {
    res.status(400).json({
      message: "이름은 필수입니다.",
    });
    return;
  }

  try {
    const user = await updateUserProfile({
      userId,
      name,
      department,
      grade,
    });
    res.status(200).json({
      message: "프로필이 저장되었습니다.",
      user: {
        userId: user.user_id,
        name: user.name,
        email: user.email,
        department: user.department,
        grade: user.grade,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    sendServiceError(res, error, "프로필 저장 중 오류가 발생했습니다.");
  }
}));

apiRouter.get("/api/users/vectors/:userId", asyncRoute(async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    res.status(400).json({
      message: "userId는 필수입니다.",
    });
    return;
  }

  try {
    const vector = await getUserInterestVector(userId);
    res.status(200).json(vector);
  } catch (error) {
    sendServiceError(res, error, "유저 벡터 정보를 불러오지 못했습니다.");
  }
}));

apiRouter.patch("/api/users/vectors/:userId", asyncRoute(async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    res.status(400).json({
      message: "userId는 필수입니다.",
    });
    return;
  }

  try {
    const vector = await updateUserInterestVector({ userId, vector: req.body ?? {} });
    res.status(200).json({
      message: "관심 벡터가 저장되었습니다.",
      vector,
    });
  } catch (error) {
    sendServiceError(res, error, "관심 벡터 저장 중 오류가 발생했습니다.");
  }
}));

apiRouter.get("/api/users/:userId/wishlist", asyncRoute(async (req, res) => {
  const userId = req.params.userId;

  if (!userId) {
    res.status(400).json({
      message: "userId는 필수입니다.",
    });
    return;
  }

  const meetings = await getUserWishlistMeetings(userId);
  res.status(200).json(meetings);
}));

apiRouter.post("/api/users/:userId/wishlist", asyncRoute(async (req, res) => {
  const userId = req.params.userId;
  const meetingId = String(req.body?.meetingId ?? "").trim();

  if (!userId) {
    res.status(400).json({
      message: "userId는 필수입니다.",
    });
    return;
  }

  if (!meetingId) {
    res.status(400).json({
      message: "meetingId는 필수입니다.",
    });
    return;
  }

  try {
    const wishlist = await addUserWishlistMeeting({ userId, meetingId });
    res.status(201).json({
      message: "관심 목록에 추가했습니다.",
      wishlist,
    });
  } catch (error) {
    sendServiceError(res, error, "관심 목록 추가 중 오류가 발생했습니다.");
  }
}));

apiRouter.delete("/api/users/:userId/wishlist/:meetingId", asyncRoute(async (req, res) => {
  const { userId, meetingId } = req.params;

  if (!userId || !meetingId) {
    res.status(400).json({
      message: "userId와 meetingId는 필수입니다.",
    });
    return;
  }

  try {
    await removeUserWishlistMeeting({ userId, meetingId });
    res.status(200).json({ message: "관심 목록에서 제거했습니다." });
  } catch (error) {
    sendServiceError(res, error, "관심 목록 제거 중 오류가 발생했습니다.");
  }
}));

apiRouter.get("/api/meetings", asyncRoute(async (req, res) => {
  const meetings = await getMeetings();
  res.status(200).json(meetings);
}));

apiRouter.post("/api/meetings", asyncRoute(async (req, res) => {
  const body = req.body ?? {};
  const title = String(body.title ?? "").trim();
  const meetingType = String(body.meetingType ?? "").trim();
  const description = String(body.description ?? "").trim();
  const hostUserId = String(body.hostUserId ?? "").trim();
  const tagId = String(body.tagId ?? "").trim();
  const displayCategory = String(body.displayCategory ?? "").trim();
  const tags = Array.isArray(body.tags) ? body.tags : [];
  const location = body.location == null ? null : String(body.location).trim();
  const meetingTime = body.meetingTime == null ? null : String(body.meetingTime).trim();
  const maxMembers = body.maxMembers == null || body.maxMembers === "" ? null : Number(body.maxMembers);
  const joinCondition = body.joinCondition == null ? null : String(body.joinCondition).trim();

  if (!title || !meetingType || !description || !hostUserId || !tagId) {
    res.status(400).json({
      message: "title, meetingType, description, hostUserId, tagId는 필수입니다.",
    });
    return;
  }

  if (!(await meetingTypeExists(meetingType))) {
    res.status(400).json({
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
    tags,
    location,
    meetingTime,
    maxMembers,
    joinCondition,
  });
  res.status(201).json({
    message: "모임이 생성되었습니다.",
    meeting,
  });
}));

apiRouter.get("/api/meeting-types", asyncRoute(async (req, res) => {
  const meetingTypes = await getMeetingTypes();
  res.status(200).json(meetingTypes);
}));

apiRouter.get("/api/meetings/:meetingId/members", asyncRoute(async (req, res) => {
  const { meetingId } = req.params;

  if (!meetingId) {
    res.status(400).json({
      message: "meetingId는 필수입니다.",
    });
    return;
  }

  const members = await getMeetingMembers(meetingId);
  res.status(200).json(members);
}));

apiRouter.delete("/api/meetings/:meetingId/members/:userId", asyncRoute(async (req, res) => {
  const { meetingId, userId } = req.params;

  if (!meetingId || !userId) {
    res.status(400).json({
      message: "meetingId와 userId는 필수입니다.",
    });
    return;
  }

  try {
    await removeMeetingMember({ meetingId, userId });
    res.status(200).json({ message: "멤버를 내보냈습니다." });
  } catch (error) {
    sendServiceError(res, error, "멤버 내보내기 중 오류가 발생했습니다.");
  }
}));

apiRouter.get("/api/meetings/:meetingId/activities", asyncRoute(async (req, res) => {
  const { meetingId } = req.params;

  if (!meetingId) {
    res.status(400).json({
      message: "meetingId는 필수입니다.",
    });
    return;
  }

  const activities = await getMeetingActivities(meetingId);
  res.status(200).json(activities);
}));

apiRouter.post("/api/meetings/:meetingId/activities", asyncRoute(async (req, res) => {
  const { meetingId } = req.params;
  const body = req.body ?? {};
  const title = String(body.title ?? "").trim();
  const activityType = String(body.activityType ?? "").trim();
  const activityDate = String(body.activityDate ?? "").trim();

  if (!meetingId) {
    res.status(400).json({
      message: "meetingId는 필수입니다.",
    });
    return;
  }

  if (!title || !activityType || !activityDate) {
    res.status(400).json({
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
    res.status(201).json({
      message: "활동 내역을 추가했습니다.",
      activity,
    });
  } catch (error) {
    sendServiceError(res, error, "활동 추가 중 오류가 발생했습니다.");
  }
}));

apiRouter.patch("/api/meetings/:meetingId/activities/:activityId", asyncRoute(async (req, res) => {
  const { meetingId } = req.params;
  const activityId = Number(req.params.activityId);
  const body = req.body ?? {};
  const title = String(body.title ?? "").trim();
  const activityType = String(body.activityType ?? "").trim();
  const activityDate = String(body.activityDate ?? "").trim();

  if (!meetingId || !Number.isInteger(activityId)) {
    res.status(400).json({
      message: "meetingId와 activityId는 필수입니다.",
    });
    return;
  }

  if (!title || !activityType || !activityDate) {
    res.status(400).json({
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
    res.status(200).json({
      message: "활동 내역을 수정했습니다.",
      activity,
    });
  } catch (error) {
    sendServiceError(res, error, "활동 수정 중 오류가 발생했습니다.");
  }
}));

apiRouter.delete("/api/meetings/:meetingId/activities/:activityId", asyncRoute(async (req, res) => {
  const { meetingId } = req.params;
  const activityId = Number(req.params.activityId);

  if (!meetingId || !Number.isInteger(activityId)) {
    res.status(400).json({
      message: "meetingId와 activityId는 필수입니다.",
    });
    return;
  }

  try {
    await deleteMeetingActivity({ meetingId, activityId });
    res.status(200).json({ message: "활동 내역을 삭제했습니다." });
  } catch (error) {
    sendServiceError(res, error, "활동 삭제 중 오류가 발생했습니다.");
  }
}));

apiRouter.get("/api/meetings/:meetingId/join-requests", asyncRoute(async (req, res) => {
  const { meetingId } = req.params;

  if (!meetingId) {
    res.status(400).json({
      message: "meetingId는 필수입니다.",
    });
    return;
  }

  const requests = await getMeetingJoinRequests(meetingId);
  res.status(200).json(requests);
}));

apiRouter.post("/api/meetings/:meetingId/join-requests", asyncRoute(async (req, res) => {
  const { meetingId } = req.params;
  const userId = String(req.body?.userId ?? "").trim();

  if (!meetingId) {
    res.status(400).json({
      message: "meetingId는 필수입니다.",
    });
    return;
  }

  if (!userId) {
    res.status(400).json({
      message: "userId는 필수입니다.",
    });
    return;
  }

  try {
    const request = await createMeetingJoinRequest({ meetingId, userId });
    res.status(201).json({
      message: "가입 신청이 접수되었습니다.",
      request,
    });
  } catch (error) {
    sendServiceError(res, error, "가입 신청 처리 중 오류가 발생했습니다.");
  }
}));

apiRouter.get("/api/meetings/:meetingId/join-requests/:userId", asyncRoute(async (req, res) => {
  const { meetingId, userId } = req.params;

  if (!meetingId || !userId) {
    res.status(400).json({
      message: "meetingId와 userId는 필수입니다.",
    });
    return;
  }

  const status = await getMeetingJoinStatus({ meetingId, userId });
  res.status(200).json(status);
}));

apiRouter.patch("/api/meetings/:meetingId/join-requests/:userId", asyncRoute(async (req, res) => {
  const { meetingId, userId } = req.params;
  const action = String(req.body?.action ?? "").trim();

  if (!meetingId || !userId || !action) {
    res.status(400).json({
      message: "meetingId, userId, action은 필수입니다.",
    });
    return;
  }

  try {
    if (action === "approve") {
      await approveMeetingJoinRequest({ meetingId, userId });
      res.status(200).json({ message: "가입 신청을 승인했습니다." });
      return;
    }

    if (action === "reject") {
      await rejectMeetingJoinRequest({ meetingId, userId });
      res.status(200).json({ message: "가입 신청을 거절했습니다." });
      return;
    }

    res.status(400).json({
      message: "action은 approve 또는 reject여야 합니다.",
    });
  } catch (error) {
    sendServiceError(res, error, "가입 신청 처리 중 오류가 발생했습니다.");
  }
}));

apiRouter.get("/api/users/:userId/meetings", asyncRoute(async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    res.status(400).json({
      message: "userId는 필수입니다.",
    });
    return;
  }

  const meetings = await getMeetingsByParticipant(userId);
  res.status(200).json(meetings);
}));

apiRouter.patch("/api/meetings/:meetingId/leader", asyncRoute(async (req, res) => {
  const { meetingId } = req.params;
  const newLeaderUserId = String(req.body?.newLeaderUserId ?? "").trim();

  if (!meetingId || !newLeaderUserId) {
    res.status(400).json({
      message: "meetingId와 newLeaderUserId는 필수입니다.",
    });
    return;
  }

  try {
    await transferMeetingLeadership({ meetingId, newLeaderUserId });
    res.status(200).json({ message: "리더를 위임했습니다." });
  } catch (error) {
    sendServiceError(res, error, "리더 위임 중 오류가 발생했습니다.");
  }
}));

apiRouter.patch("/api/meetings/:meetingId/recruitment", asyncRoute(async (req, res) => {
  const { meetingId } = req.params;
  const isRecruiting = Boolean(req.body?.isRecruiting);

  if (!meetingId) {
    res.status(400).json({
      message: "meetingId는 필수입니다.",
    });
    return;
  }

  try {
    const meeting = await updateMeetingRecruitment({ meetingId, isRecruiting });
    res.status(200).json({
      message: "모집 상태를 변경했습니다.",
      meeting,
    });
  } catch (error) {
    sendServiceError(res, error, "모집 상태 변경 중 오류가 발생했습니다.");
  }
}));

apiRouter.patch("/api/meetings/:meetingId", asyncRoute(async (req, res) => {
  const { meetingId } = req.params;
  const body = req.body ?? {};
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim();
  const location = body.location == null ? null : String(body.location).trim();
  const meetingTime = body.meetingTime == null ? null : String(body.meetingTime).trim();
  const tagId = body.tagId == null ? null : String(body.tagId).trim();
  const displayCategory = body.displayCategory == null ? null : String(body.displayCategory).trim();
  const tags = body.tags == null ? null : Array.isArray(body.tags) ? body.tags : [];
  const joinCondition = body.joinCondition == null ? null : String(body.joinCondition).trim();
  const maxMembers = body.maxMembers == null || body.maxMembers === "" ? null : Number(body.maxMembers);

  if (!meetingId || !title || !description) {
    res.status(400).json({
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
      tags,
      joinCondition,
    });
    res.status(200).json({
      message: "모임 정보가 수정되었습니다.",
      meeting,
    });
  } catch (error) {
    sendServiceError(res, error, "모임 수정 중 오류가 발생했습니다.");
  }
}));

apiRouter.delete("/api/meetings/:meetingId", asyncRoute(async (req, res) => {
  const { meetingId } = req.params;

  if (!meetingId) {
    res.status(400).json({
      message: "meetingId는 필수입니다.",
    });
    return;
  }

  try {
    await deleteMeeting(meetingId);
    res.status(200).json({ message: "모임을 삭제했습니다." });
  } catch (error) {
    sendServiceError(res, error, "모임 삭제 중 오류가 발생했습니다.");
  }
}));

apiRouter.get("/api/recommendations/:userId", asyncRoute(async (req, res) => {
  const { userId } = req.params;
  const recommendations = await getRecommendationsByUserId(userId);

  if (recommendations.length === 0) {
    res.status(404).json({
      message: `No recommendations found for ${userId}`,
    });
    return;
  }

  res.status(200).json(recommendations);
}));
