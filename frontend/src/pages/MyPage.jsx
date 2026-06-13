// 📌 MyPage - 마이페이지 화면
// 🔧 [기능 포인트]
//   - user          : 로그인한 유저 정보 → API 응답으로 교체
//   - myClubs       : 참여 중인 소모임 목록 → API 응답으로 교체
//   - onEditProfile : 프로필 수정 클릭 → 프로필 수정 페이지 이동
//   - onLogout      : 로그아웃 클릭 → 로그아웃 로직 연결
//   - onClubClick   : 소모임 클릭 → 소모임 상세 페이지 이동
//   - onManageClick : 리더의 모임 관리 클릭 → 모임 관리 페이지 이동
//   - 모임 탈퇴      : DELETE /api/meetings/:meetingId/members/:userId 호출 (멤버 전용, 리더는 비활성)

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import NotificationCard from "../components/NotificationCard";
import { getUserMeetings, getUserWishlistMeetings } from "../api/users";
import { leaveMeeting } from "../api/meetings";
import {
  getUnreadNotificationCount,
  getUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications";

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function MyPage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
  onEditProfile,
  onLogout,
  onClubClick,
  onManageClick,
  wishlistCount,
}) {
  const [myClubs, setMyClubs] = useState([]);
  const [myClubsLoading, setMyClubsLoading] = useState(false);
  const [myClubsError, setMyClubsError] = useState("");
  const [wishlistClubs, setWishlistClubs] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [notificationsUpdating, setNotificationsUpdating] = useState(false);

  // 🔧 [탈퇴] 모달 상태 및 처리 중 상태
  const [leaveTarget, setLeaveTarget] = useState(null); // { id, name } 또는 null
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  const displayUser = user ?? {};

  useEffect(() => {
    const userId = user?.userId ?? user?.id;

    if (!userId) {
      setMyClubs([]);
      return;
    }

    async function loadMyClubs() {
      try {
        setMyClubsLoading(true);
        setMyClubsError("");

        const data = await getUserMeetings(userId);
        setMyClubs(
          data.map((club) => ({
            id: club.meetingId,
            name: club.title,
            memberCount: club.participantCount,
            role: club.role,
          })),
        );
      } catch (error) {
        setMyClubsError(error.message);
      } finally {
        setMyClubsLoading(false);
      }
    }

    loadMyClubs();
  }, [user]);

  useEffect(() => {
    const userId = user?.userId ?? user?.id;

    if (!userId) {
      setNotifications([]);
      setUnreadNotificationCount(0);
      return;
    }

    async function loadNotifications() {
      try {
        setNotificationsLoading(true);
        setNotificationsError("");

        const [leaderItems, memberItems, unreadResult] = await Promise.all([
          getUserNotifications(userId, { limit: 8, audience: "leader" }),
          getUserNotifications(userId, { limit: 8, audience: "member" }),
          getUnreadNotificationCount(userId),
        ]);

        setNotifications([...leaderItems, ...memberItems]);
        setUnreadNotificationCount(Number(unreadResult.count) || 0);
      } catch (error) {
        setNotificationsError(error.message);
      } finally {
        setNotificationsLoading(false);
      }
    }

    loadNotifications();
  }, [user]);

  useEffect(() => {
    const userId = user?.userId ?? user?.id;

    if (!userId) {
      setWishlistClubs([]);
      return;
    }

    async function loadWishlistClubs() {
      try {
        setWishlistLoading(true);
        setWishlistError("");

        const data = await getUserWishlistMeetings(userId);
        setWishlistClubs(
          data.map((club) => ({
            id: club.meetingId,
            name: club.title,
            memberCount: club.participantCount,
            typeLabel: club.meetingTypeLabel,
            wishlistedAt: club.wishlistedAt,
          })),
        );
      } catch (error) {
        setWishlistError(error.message);
      } finally {
        setWishlistLoading(false);
      }
    }

    loadWishlistClubs();
  }, [user]);

  // 🔧 [탈퇴] 버튼 클릭 시 확인 모달 열기 (카드 클릭 이벤트는 막음)
  const handleOpenLeaveModal = (e, club) => {
    e.stopPropagation();
    setLeaveError("");
    setLeaveTarget(club);
  };

  // 🔧 [관리] 리더의 관리 버튼 클릭 (카드 클릭 이벤트는 막음)
  const handleManageClick = (e, clubId) => {
    e.stopPropagation();
    if (onManageClick) {
      onManageClick(clubId);
    } else if (onClubClick) {
      // onManageClick 미연결 시 상세로라도 이동
      onClubClick(clubId);
    }
  };

  // 🔧 [탈퇴] 모달 닫기
  const handleCloseLeaveModal = () => {
    if (isLeaving) return;
    setLeaveTarget(null);
    setLeaveError("");
  };

  // 🔧 [탈퇴] 실제 API 호출
  const handleConfirmLeave = async () => {
    const userId = user?.userId ?? user?.id;

    if (!leaveTarget || !userId) return;

    try {
      setIsLeaving(true);
      setLeaveError("");
      await leaveMeeting(leaveTarget.id, userId);
      // 성공 시 목록에서 즉시 제거
      setMyClubs((prev) => prev.filter((c) => c.id !== leaveTarget.id));
      setLeaveTarget(null);
    } catch (error) {
      setLeaveError(error.message || "탈퇴 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleNotificationClick = async (notification) => {
    const userId = user?.userId ?? user?.id;
    if (!userId) return;

    if (!notification.isRead) {
      try {
        await markNotificationRead(userId, notification.notificationId);
        setNotifications((prev) =>
          prev.map((item) =>
            item.notificationId === notification.notificationId
              ? { ...item, isRead: true }
              : item
          )
        );
        setUnreadNotificationCount((count) => Math.max(0, count - 1));
      } catch (error) {
        setNotificationsError(error.message);
        return;
      }
    }

    if (notification.meetingId && onClubClick) {
      onClubClick(notification.meetingId);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    const userId = user?.userId ?? user?.id;
    if (!userId || unreadNotificationCount === 0) return;

    try {
      setNotificationsUpdating(true);
      setNotificationsError("");
      await markAllNotificationsRead(userId);
      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );
      setUnreadNotificationCount(0);
    } catch (error) {
      setNotificationsError(error.message);
    } finally {
      setNotificationsUpdating(false);
    }
  };

  const displayedClubs = user ? myClubs : [];
  const displayedWishlistClubs = user ? wishlistClubs : [];
  const leaderNotifications = notifications.filter(
    (notification) => notification.audience === "leader"
  );
  const memberNotifications = notifications.filter(
    (notification) => notification.audience !== "leader"
  );
  const displayedDepartment = displayUser.department ?? "학과 정보 없음";
  const displayedEmail = displayUser.email ?? "로그인이 필요합니다";
  const displayedGrade = displayUser.grade ?? "학년 정보 없음";
  const displayedJoinDate = formatDate(
    displayUser.createdAt ?? displayUser.joinDate,
  );
  const displayedWishlistCount = Math.max(
    wishlistCount ?? 0,
    displayedWishlistClubs.length,
  );

  return (
    <div className="mypage">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={onLoginClick}
      />

      <main className="mypage__main">
        <div className="mypage__layout">
          {/* 사이드바 - 프로필 */}
          <aside className="mypage__sidebar">
            <div className="mypage__profile">
              <div className="mypage__avatar">👤</div>
              <h2 className="mypage__name">
                {displayUser.name ?? "로그인 필요"}
              </h2>
              <p className="mypage__info">
                {displayedDepartment} · {displayedGrade}
              </p>
            </div>

            <div className="mypage__profile-detail">
              <div className="mypage__profile-row">📧 {displayedEmail}</div>
              <div className="mypage__profile-row">
                📅 가입일: {displayedJoinDate}
              </div>
              <div className="mypage__profile-row">
                👥 참여 모임: {displayedClubs.length}개
              </div>
            </div>

            <div className="mypage__profile-actions">
              <button
                className="mypage__profile-btn"
                // 🔧 [기능] 프로필 수정 페이지 이동
                onClick={onEditProfile}
              >
                ✏️ 프로필 수정
              </button>
              <button
                className="mypage__profile-btn mypage__profile-btn--logout"
                // 🔧 [기능] 로그아웃 로직 연결
                onClick={onLogout}
              >
                🚪 로그아웃
              </button>
            </div>

            {/* 통계 */}
            <div className="mypage__stats">
              <div className="mypage__stat-item">
                <span className="mypage__stat-value">
                  {displayedClubs.length}
                </span>
                <span className="mypage__stat-label">참여중</span>
              </div>
              <div className="mypage__stat-item">
                <span className="mypage__stat-value">
                  {displayedWishlistCount}
                </span>
                <span className="mypage__stat-label">관심목록</span>
              </div>
            </div>
          </aside>

          {/* 메인 콘텐츠 */}
          <div className="mypage__content">
            <div className="mypage__notification-overview">
              <div className="mypage__section-header">
                <div>
                  <h3 className="mypage__section-title mypage__section-title--inline">
                    알림
                  </h3>
                  {unreadNotificationCount > 0 && (
                    <span className="mypage__notification-count">
                      {unreadNotificationCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="mypage__notification-read-all"
                  disabled={
                    notificationsUpdating || unreadNotificationCount === 0
                  }
                  onClick={handleMarkAllNotificationsRead}
                >
                  {notificationsUpdating ? "처리 중..." : "모두 읽음"}
                </button>
              </div>
            </div>

            <div className="mypage__notification-grid">
              <NotificationCard
                title="리더 알림"
                description="가입 신청과 회원 변동을 확인합니다."
                notifications={leaderNotifications}
                isLoading={notificationsLoading}
                error={notificationsError}
                onNotificationClick={handleNotificationClick}
              />
              <NotificationCard
                title="회원 알림"
                description="가입 결과와 내 활동 변경을 확인합니다."
                notifications={memberNotifications}
                isLoading={notificationsLoading}
                error={notificationsError}
                onNotificationClick={handleNotificationClick}
              />
            </div>

            {/* 참여 중인 소모임 */}
            <section className="mypage__section">
              <h3 className="mypage__section-title">참여 중인 모임</h3>
              <div className="mypage__club-list">
                {myClubsLoading ? (
                  <p>참여 중인 모임을 불러오는 중입니다.</p>
                ) : myClubsError ? (
                  <p>{myClubsError}</p>
                ) : displayedClubs.length === 0 ? (
                  <p>참여 중인 모임이 없습니다.</p>
                ) : (
                  displayedClubs.map((club) => {
                    const isLeader = club.role === "리더";
                    const roleClassName = isLeader
                      ? "mypage__club-role mypage__club-role--leader"
                      : "mypage__club-role mypage__club-role--member";
                    return (
                      <div
                        key={club.id}
                        className="mypage__club-card"
                        // 🔧 [기능] 소모임 상세 페이지 이동
                        onClick={() => onClubClick && onClubClick(club.id)}
                      >
                        <div className="mypage__club-thumb">🏠</div>
                        <div className="mypage__club-info">
                          <div className={roleClassName}>
                            {isLeader ? "👑 리더" : "멤버"}
                          </div>
                          <div className="mypage__club-name">{club.name}</div>
                          <div className="mypage__club-member">
                            👥 {club.memberCount}명
                          </div>
                        </div>
                        {/* 🔧 [기능] 역할별 액션 버튼 */}
                        <div className="mypage__club-actions">
                          {isLeader ? (
                            <button
                              type="button"
                              className="mypage__club-btn mypage__club-btn--manage"
                              onClick={(e) => handleManageClick(e, club.id)}
                            >
                              ⚙️ 관리
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="mypage__club-btn mypage__club-btn--leave"
                              onClick={(e) =>
                                handleOpenLeaveModal(e, {
                                  id: club.id,
                                  name: club.name,
                                })
                              }
                            >
                              🚪 탈퇴
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* 관심 목록 */}
            <section className="mypage__section">
              <h3 className="mypage__section-title">관심 목록</h3>
              <div className="mypage__club-list">
                {wishlistLoading ? (
                  <p>관심 목록을 불러오는 중입니다.</p>
                ) : wishlistError ? (
                  <p>{wishlistError}</p>
                ) : displayedWishlistClubs.length === 0 ? (
                  <p>관심 목록에 추가한 모임이 없습니다.</p>
                ) : (
                  displayedWishlistClubs.map((club) => (
                    <div
                      key={club.id}
                      className="mypage__club-card"
                      onClick={() => onClubClick && onClubClick(club.id)}
                    >
                      <div className="mypage__club-thumb mypage__club-thumb--wishlist">
                        <svg
                          aria-hidden="true"
                          width="22"
                          height="22"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21.2l7.8-7.7 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
                        </svg>
                      </div>
                      <div className="mypage__club-info">
                        <div className="mypage__club-role">
                          {club.typeLabel || "관심 모임"}
                        </div>
                        <div className="mypage__club-name">{club.name}</div>
                        <div className="mypage__club-member">
                          👥 {club.memberCount}명 · 추가일{" "}
                          {formatDate(club.wishlistedAt)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

          </div>
        </div>
      </main>

      <Footer />

      {/* 🔧 [탈퇴] 확인 모달 */}
      {leaveTarget && (
        <div
          className="mypage__modal-overlay"
          onClick={handleCloseLeaveModal}
          role="presentation"
        >
          <div
            className="mypage__modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-modal-title"
          >
            <button
              type="button"
              className="mypage__modal-close"
              onClick={handleCloseLeaveModal}
              aria-label="닫기"
              disabled={isLeaving}
            >
              ✕
            </button>
            <div className="mypage__modal-icon" aria-hidden="true">🚪</div>
            <h3 id="leave-modal-title" className="mypage__modal-title">
              정말 탈퇴하시겠어요?
            </h3>
            <p className="mypage__modal-club-name">{leaveTarget.name}</p>
            <p className="mypage__modal-desc">
              탈퇴 후 다시 가입하려면<br />
              가입 신청을 새로 보내야 합니다.
            </p>
            {leaveError && (
              <p className="mypage__modal-error">{leaveError}</p>
            )}
            <div className="mypage__modal-actions">
              <button
                type="button"
                className="mypage__modal-btn mypage__modal-btn--cancel"
                onClick={handleCloseLeaveModal}
                disabled={isLeaving}
              >
                취소
              </button>
              <button
                type="button"
                className="mypage__modal-btn mypage__modal-btn--leave"
                onClick={handleConfirmLeave}
                disabled={isLeaving}
              >
                {isLeaving ? "처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
