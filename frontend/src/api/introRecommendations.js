import { requestJson } from "./http";

export function getIntroRecommendations({ introText, userId = null, limit = 6 }) {
  return requestJson(
    "/api/intro-recommendations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ introText, userId, limit }),
    },
    "자기소개서 기반 추천을 불러오지 못했습니다."
  );
}
