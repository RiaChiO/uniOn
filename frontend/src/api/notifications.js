import { requestJson } from "./http";

export function getUserNotifications(
  userId,
  { limit = 10, unreadOnly = false, audience } = {}
) {
  const params = new URLSearchParams({
    limit: String(limit),
    unreadOnly: String(unreadOnly),
  });

  if (audience) {
    params.set("audience", audience);
  }

  return requestJson(
    `/api/users/${encodeURIComponent(userId)}/notifications?${params}`,
    {},
    "알림을 불러오지 못했습니다."
  );
}

export function getUnreadNotificationCount(userId) {
  return requestJson(
    `/api/users/${encodeURIComponent(userId)}/notifications/unread-count`,
    {},
    "읽지 않은 알림 개수를 불러오지 못했습니다."
  );
}

export function markNotificationRead(userId, notificationId) {
  return requestJson(
    `/api/users/${encodeURIComponent(userId)}/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: "PATCH",
    },
    "알림 읽음 처리에 실패했습니다."
  );
}

export function markAllNotificationsRead(userId) {
  return requestJson(
    `/api/users/${encodeURIComponent(userId)}/notifications/read-all`,
    {
      method: "PATCH",
    },
    "전체 알림 읽음 처리에 실패했습니다."
  );
}
