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

// src/api/users.js (또는 해당 프로젝트의 API 관리 파일)

export async function getUserInterestVectors(userId) {
  if (!userId) {
    console.warn("userId가 없어 데이터를 가져올 수 없습니다.");
    return null;
  }

  try {
    // 1. URL 뒤에 userId를 붙여서 특정 유저의 벡터를 요청
    const response = await fetch(`http://localhost:4000/api/user-interests/${userId}`); 
    
    if (!response.ok) {
      throw new Error("관심도 데이터를 가져오는데 실패했습니다.");
    }

    const data = await response.json();
    
    // 2. 데이터가 배열로 온다면 첫 번째 객체를, 아니면 그대로 반환
    // (SQL 결과값은 보통 배열 [ {study: 3...} ] 형태일 때가 많음)
    return Array.isArray(data) ? data[0] : data; 

  } catch (error) {
    console.error("getUserInterestVectors Error:", error);
    return null; // 점수가 없으면 추천 로직에서 기본값 처리를 위해 null 반환
  }
}