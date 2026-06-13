function formatNotificationDate(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const NOTIFICATION_ICONS = {
  join_request: "👋",
  member_joined: "✅",
  join_approved: "🎉",
  join_rejected: "ℹ️",
  member_left: "🚪",
  member_removed: "⚠️",
  leader_transferred: "👑",
};

export default function NotificationCard({
  title,
  description,
  notifications,
  isLoading,
  error,
  onNotificationClick,
}) {
  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length;

  return (
    <section className="mypage__section mypage__notification-card">
      <div className="mypage__notification-card-header">
        <div>
          <div className="mypage__notification-card-title-row">
            <h3 className="mypage__section-title mypage__section-title--inline">
              {title}
            </h3>
            {unreadCount > 0 && (
              <span className="mypage__notification-count">{unreadCount}</span>
            )}
          </div>
          <p className="mypage__notification-card-description">
            {description}
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="mypage__empty-text">알림을 불러오는 중입니다.</p>
      ) : error ? (
        <p className="mypage__notification-error">{error}</p>
      ) : notifications.length === 0 ? (
        <p className="mypage__empty-text">표시할 알림이 없습니다.</p>
      ) : (
        <div className="mypage__notification-list">
          {notifications.map((notification) => (
            <button
              key={notification.notificationId}
              type="button"
              className={`mypage__notification-item ${
                notification.isRead
                  ? ""
                  : "mypage__notification-item--unread"
              }`}
              onClick={() => onNotificationClick(notification)}
            >
              <span className="mypage__notification-icon">
                {NOTIFICATION_ICONS[notification.type] ?? "🔔"}
              </span>
              <span className="mypage__notification-content">
                <span className="mypage__notification-title">
                  {notification.title}
                </span>
                <span className="mypage__notification-msg">
                  {notification.message}
                </span>
              </span>
              <span className="mypage__notification-date">
                {formatNotificationDate(notification.createdAt)}
              </span>
              {!notification.isRead && (
                <span
                  className="mypage__notification-unread"
                  aria-label="읽지 않음"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
