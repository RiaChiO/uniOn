import { requestJson } from "./http";

export function getMeetings() {
  return requestJson("/api/meetings", {}, "모임 목록을 불러오지 못했습니다.");
}

export function createMeeting({
  title,
  meetingType,
  tagId,
  displayCategory,
  tags,
  description,
  hostUserId,
  location,
  meetingTime,
  maxMembers,
  joinCondition,
  imageUrl,
}) {
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
        displayCategory,
        tags,
        description,
        hostUserId,
        location,
        meetingTime,
        maxMembers,
        joinCondition,
        imageUrl,
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

export function getMeetingActivities(meetingId) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/activities`,
    {},
    "활동 내역을 불러오지 못했습니다."
  );
}

export function createMeetingActivity(meetingId, payload) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/activities`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "활동 추가에 실패했습니다."
  );
}

export function updateMeetingActivity(meetingId, activityId, payload) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/activities/${encodeURIComponent(activityId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "활동 수정에 실패했습니다."
  );
}

export function deleteMeetingActivity(meetingId, activityId) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/activities/${encodeURIComponent(activityId)}`,
    {
      method: "DELETE",
    },
    "활동 삭제에 실패했습니다."
  );
}

export function getMeetingJoinRequests(meetingId) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/join-requests`,
    {},
    "가입 신청 목록을 불러오지 못했습니다."
  );
}

export function getMeetingJoinStatus(meetingId, userId) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/join-requests/${encodeURIComponent(userId)}`,
    {},
    "가입 신청 상태를 불러오지 못했습니다."
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

export function updateMeeting(meetingId, payload) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "모임 수정에 실패했습니다."
  );
}

export function deleteMeeting(meetingId) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}`,
    {
      method: "DELETE",
    },
    "모임 삭제에 실패했습니다."
  );
}

export function removeMeetingMember(meetingId, userId) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/members/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
    "멤버 내보내기에 실패했습니다."
  );
}

export function leaveMeeting(meetingId, userId) {
  return requestJson(
    `/api/users/${encodeURIComponent(userId)}/meetings/${encodeURIComponent(meetingId)}`,
    {
      method: "DELETE",
    },
    "모임 탈퇴에 실패했습니다."
  );
}

export function transferMeetingLeadership(meetingId, newLeaderUserId) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/leader`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ newLeaderUserId }),
    },
    "리더 위임에 실패했습니다."
  );
}

export function transferMeetingLeadershipAndLeave(
  meetingId,
  currentLeaderUserId,
  newLeaderUserId
) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/leader/transfer-and-leave`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ currentLeaderUserId, newLeaderUserId }),
    },
    "리더 위임 및 탈퇴에 실패했습니다."
  );
}

export function updateMeetingRecruitment(meetingId, isRecruiting) {
  return requestJson(
    `/api/meetings/${encodeURIComponent(meetingId)}/recruitment`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ isRecruiting }),
    },
    "모집 상태 변경에 실패했습니다."
  );
}
