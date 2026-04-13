import { requestJson } from "./http";

export function getMeetingTypes() {
  return requestJson("/api/meeting-types", {}, "모임 유형을 불러오지 못했습니다.");
}
