import { requestJson } from "./http";

export function getMeetings() {
  return requestJson("/api/meetings", {}, "모임 목록을 불러오지 못했습니다.");
}

export function createMeeting({ title, meetingType, tagId, description, hostUserId }) {
  return requestJson(
    "/api/meetings",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        meetingType,
        tagId,
        description,
        hostUserId,
      }),
    },
    "모임 생성에 실패했습니다."
  );
}

export function getMeetingMembers(meetingId) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/members`,
    {},
    "멤버 목록을 불러오지 못했습니다."
  );
}

export function getMeetingJoinRequests(meetingId) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/join-requests`,
    {},
    "가입 신청 목록을 불러오지 못했습니다."
  );
}

export function createMeetingJoinRequest(meetingId, userId) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/join-requests`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    },
    "가입 신청에 실패했습니다."
  );
}

export function updateMeetingJoinRequest(meetingId, userId, action) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/join-requests/${encodeURIComponent(userId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    },
    "가입 신청 처리에 실패했습니다."
  );
}
