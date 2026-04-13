import { requestJson } from "./http";

export function syncUser({ userId, name, email }) {
  return requestJson(
    "/api/users/sync",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        name,
        email,
      }),
    },
    "사용자 동기화에 실패했습니다."
  );
}

export function getUserMeetings(userId) {
  return requestJson(
    `/api/users/${encodeURIComponent(userId)}/meetings`,
    {},
    "참여 중인 모임을 불러오지 못했습니다."
  );
}
