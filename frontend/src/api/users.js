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

export function updateUserProfile(userId, { name, department, grade }) {
  return requestJson(
    `/api/users/${encodeURIComponent(userId)}/profile`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        department,
        grade,
      }),
    },
    "프로필 저장에 실패했습니다."
  );
}

export function completeUserOnboarding(userId) {
  return requestJson(
    `/api/users/${encodeURIComponent(userId)}/onboarding`,
    {
      method: "PATCH",
    },
    "온보딩 상태 저장에 실패했습니다."
  );
}

export function deleteUserAccount(userId) {
  return requestJson(
    `/api/users/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
    "회원 탈퇴에 실패했습니다."
  );
}

export function updateUserInterestVector(userId, vector) {
  return requestJson(
    `/api/users/vectors/${encodeURIComponent(userId.trim())}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(vector),
    },
    "관심도 저장에 실패했습니다."
  );
}

export function getUserMeetings(userId) {
  return requestJson(
    `/api/users/${encodeURIComponent(userId)}/meetings`,
    {},
    "참여 중인 모임을 불러오지 못했습니다."
  );
}

export function getUserWishlistMeetings(userId) {
  return requestJson(
    `/api/users/${encodeURIComponent(userId)}/wishlist`,
    {},
    "관심 목록을 불러오지 못했습니다."
  );
}

export function addUserWishlistMeeting(userId, meetingId) {
  return requestJson(
    `/api/users/${encodeURIComponent(userId)}/wishlist`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ meetingId }),
    },
    "관심 목록 추가에 실패했습니다."
  );
}

export function removeUserWishlistMeeting(userId, meetingId) {
  return requestJson(
    `/api/users/${encodeURIComponent(userId)}/wishlist/${encodeURIComponent(meetingId)}`,
    {
      method: "DELETE",
    },
    "관심 목록 제거에 실패했습니다."
  );
}

export async function getUserInterestVectors(userId) {
  if (!userId) return null;

  try {
    return await requestJson(
      `/api/users/vectors/${encodeURIComponent(userId.trim())}`,
      {},
      "관심도 데이터를 가져오는데 실패했습니다."
    );
  } catch (error) {
    console.error("getUserInterestVectors Error:", error);
    return null;
  }
}
