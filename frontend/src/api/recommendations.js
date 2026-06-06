import { requestJson } from "./http";

export function getRecommendations(userId) {
  return requestJson(
    `/api/recommendations/${encodeURIComponent(userId)}`,
    {},
    "추천 결과를 불러오지 못했습니다."
  );
}
