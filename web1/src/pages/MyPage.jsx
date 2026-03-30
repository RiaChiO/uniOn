// 📌 MyPage - 마이페이지 화면
// 🔧 [기능 포인트]
//   - user          : 로그인한 유저 정보 → API 응답으로 교체
//   - myClubs       : 참여 중인 소모임 목록 → API 응답으로 교체
//   - notifications : 알림 목록 → API 응답으로 교체
//   - onEditProfile : 프로필 수정 클릭 → 프로필 수정 페이지 이동
//   - onLogout      : 로그아웃 클릭 → 로그아웃 로직 연결
//   - onClubClick   : 소모임 클릭 → 소모임 상세 페이지 이동

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// 🔧 [기능] 더미 유저 정보 → 로그인 API 응답으로 교체
const MOCK_USER = {
  name: "김경상",
  department: "컴퓨터과학과",
  grade: "21학번",
  email: "kim@gnu.ac.kr",
  joinDate: "2024.03.02",
  clubCount: 2,
  wishlistCount: 2,
};

// 🔧 [기능] 더미 참여 소모임 → API 응답으로 교체
const MOCK_MY_CLUBS = [
  { id: 1, name: "GNU 코딩 스터디", memberCount: 24, role: "멤버" },
  { id: 2, name: "FC GNU",          memberCount: 35, role: "리더" },
];

// 🔧 [기능] 더미 알림 → API 응답으로 교체
const MOCK_NOTIFICATIONS = [
  { id: 1, message: "GNU 코딩 스터디에 새 공지가 등록되었습니다",  date: "2026.03.15" },
  { id: 2, message: "FC GNU 모임이 내일 예정되어 있습니다",        date: "2026.03.12" },
  { id: 3, message: "아트클럽을 관심 목록에 추가했습니다",          date: "2026.03.08" },
];

export default function MyPage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
  onEditProfile,
  onLogout,
  onClubClick,
}) {
  const displayUser = user ?? MOCK_USER;

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
              <h2 className="mypage__name">{displayUser.name}</h2>
              <p className="mypage__info">{displayUser.department} · {displayUser.grade}</p>
            </div>

            <div className="mypage__profile-detail">
              <div className="mypage__profile-row">📧 {displayUser.email}</div>
              <div className="mypage__profile-row">📅 가입일: {displayUser.joinDate}</div>
              <div className="mypage__profile-row">👥 참여 소모임: {displayUser.clubCount}개</div>
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
                <span className="mypage__stat-value">{displayUser.clubCount}</span>
                <span className="mypage__stat-label">참여중</span>
              </div>
              <div className="mypage__stat-item">
                <span className="mypage__stat-value">{displayUser.wishlistCount}</span>
                <span className="mypage__stat-label">관심목록</span>
              </div>
            </div>

          </aside>

          {/* 메인 콘텐츠 */}
          <div className="mypage__content">

            {/* 참여 중인 소모임 */}
            <section className="mypage__section">
              <h3 className="mypage__section-title">참여 중인 소모임</h3>
              <div className="mypage__club-list">
                {MOCK_MY_CLUBS.map((club) => (
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
                      <div className="mypage__club-member">👥 {club.memberCount}명</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* 알림 */}
            <section className="mypage__section">
              <h3 className="mypage__section-title">알림</h3>
              <div className="mypage__notification-list">
                {MOCK_NOTIFICATIONS.map((noti) => (
                  <div key={noti.id} className="mypage__notification-item">
                    <p className="mypage__notification-msg">{noti.message}</p>
                    <span className="mypage__notification-date">{noti.date}</span>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
