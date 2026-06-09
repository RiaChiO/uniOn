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
import { getUserMeetings, getUserWishlistMeetings } from "../api/users";
import { removeMeetingMember } from "../api/meetings";

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
      await removeMeetingMember(leaveTarget.id, userId);
      // 성공 시 목록에서 즉시 제거
      setMyClubs((prev) => prev.filter((c) => c.id !== leaveTarget.id));
      setLeaveTarget(null);
    } catch (error) {
      setLeaveError(error.message || "탈퇴 처리 중 오류가 발생했습니다.");
    } finally {
      setIsLeaving(false);
    }
  };

  const displayedClubs = user ? myClubs : [];
  const displayedWishlistClubs = user ? wishlistClubs : [];
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
                      <div className="mypage__club-thumb">♡</div>
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
