// 📌 MyPage - 마이페이지 화면
// 🔧 [기능 포인트]
//   - user          : 로그인한 유저 정보 → API 응답으로 교체
//   - myClubs       : 참여 중인 소모임 목록 → API 응답으로 교체
//   - onEditProfile : 프로필 수정 클릭 → 프로필 수정 페이지 이동
//   - onLogout      : 로그아웃 클릭 → 로그아웃 로직 연결
//   - onClubClick   : 소모임 클릭 → 소모임 상세 페이지 이동

import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getUserMeetings, getUserWishlistMeetings } from "../api/users";

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
  wishlistCount,
}) {
  const [myClubs, setMyClubs] = useState([]);
  const [myClubsLoading, setMyClubsLoading] = useState(false);
  const [myClubsError, setMyClubsError] = useState("");
  const [wishlistClubs, setWishlistClubs] = useState([]);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [wishlistError, setWishlistError] = useState("");
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
                  displayedClubs.map((club) => (
                    <div
                      key={club.id}
                      className="mypage__club-card"
                      // 🔧 [기능] 소모임 상세 페이지 이동
                      onClick={() => onClubClick && onClubClick(club.id)}
                    >
                      <div className="mypage__club-thumb">🏠</div>
                      <div className="mypage__club-info">
                        <div className="mypage__club-role">{club.role}</div>
                        <div className="mypage__club-name">{club.name}</div>
                        <div className="mypage__club-member">
                          👥 {club.memberCount}명
                        </div>
                      </div>
                    </div>
                  ))
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
    </div>
  );
}
