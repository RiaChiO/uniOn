// 📌 ClubDetailPage - 소모임 상세 페이지 (소개 / 활동 / 멤버 / 후기 탭 포함)
// 🔧 [기능 포인트]
//   - club            : 더미 데이터 → API 응답으로 교체 (useParams로 id 받아서 fetch)
//   - onJoin          : 가입 신청하기 → 가입 신청 API 연결
//   - onWishlist      : 관심 목록 추가 → 관심 목록 API 연결
//   - onShare         : 공유하기 → 공유 기능 연결
//   - onContactLeader : 문의하기 → 리더에게 메시지 기능 연결
//   - onRelatedClick  : 관련 모임 클릭 → 해당 소모임 상세 페이지 이동

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

// 🔧 [기능] 더미 데이터 → useParams()로 id 받아서 API로 교체
const MOCK_CLUB = {
  id: 1,
  name: "GNU 코딩 스터디",
  type: "동아리",
  categoryLabel: "IT/개발",
  isRecruiting: true,
  description: "알고리즘부터 프로젝트까지, 함께 성장하는 개발 스터디",
  intro: [
    "GNU 코딩 스터디는 프로그래밍에 관심 있는 경상대 학생들이 모여 함께 공부하고 성장하는 동아리입니다.",
    "매주 수요일 저녁, 우리는 알고리즘 문제를 풀고, 최신 기술 트렌드를 공유하며, 팀 프로젝트를 진행합니다. 초보자부터 경험자까지 누구나 환영합니다!",
  ],
  activities: [
    "알고리즘 스터디 (백준, 프로그래머스)",
    "웹 개발 프로젝트",
    "기술 세미나 및 코드 리뷰",
    "해커톤 참가",
  ],
  // 🔧 [기능] 최근 활동 목록 → API로 교체
  recentActivities: [
    { id: 1, title: "알고리즘 스터디 Week 12", date: "2024.03.20", type: "정기모임" },
    { id: 2, title: "해커톤 참가",             date: "2024.03.15", type: "특별활동" },
    { id: 3, title: "신입생 환영회",            date: "2024.03.10", type: "행사" },
    { id: 4, title: "코드 리뷰 세션",           date: "2024.03.05", type: "정기모임" },
  ],
  // 🔧 [기능] 멤버 목록 → API로 교체
  members: [
    { id: 1, name: "김철수", initial: "김", department: "컴퓨터과학과",   role: "리더" },
    { id: 2, name: "이영희", initial: "이", department: "소프트웨어공학과", role: "멤버" },
    { id: 3, name: "박민수", initial: "박", department: "정보통신공학과",  role: "멤버" },
    { id: 4, name: "정지원", initial: "정", department: "컴퓨터과학과",   role: "멤버" },
    { id: 5, name: "최은지", initial: "최", department: "경영학과",       role: "멤버" },
    { id: 6, name: "강민호", initial: "강", department: "산업공학과",     role: "멤버" },
  ],
  // 🔧 [기능] 후기 목록 → API로 교체
  reviews: [
    { id: 1, name: "김민준", initial: "김", rating: 5, date: "2024.03.15", content: "정말 유익한 스터디였습니다! 알고리즘 실력이 많이 늘었어요." },
    { id: 2, name: "박서현", initial: "박", rating: 5, date: "2024.03.10", content: "분위기가 너무 좋고 선배들이 친절하게 가르쳐주셔서 초보자도 쉽게 배울 수 있어요." },
    { id: 3, name: "이준호", initial: "이", rating: 4, date: "2024.03.05", content: "프로젝트 경험을 쌓을 수 있어서 좋았습니다. 포트폴리오에 큰 도움이 되었어요." },
  ],
  memberCount: 24,
  maxMembers: 30,
  meetingDay: "매주 수요일",
  location: "공학관 3층",
  startTime: "19:00",
  rating: 4.8,
  tags: ["#Python", "#JavaScript", "#웹개발", "#알고리즘", "#스터디"],
  joinCondition: "승인 필요",
  activePeriod: "상시 활동",
  leader: { name: "김철수", initial: "김", department: "컴퓨터과학과", grade: "21학번" },
  relatedClubs: [
    { id: 2, name: "알고리즘 스터디", category: "IT/개발", isRecruiting: true },
    { id: 3, name: "웹 개발 동아리",  category: "IT/개발", isRecruiting: true },
  ],
};

const TABS = ["소개", "활동", "멤버", "후기"];

// 활동 탭 컴포넌트
function ActivityTab({ activities }) {
  const TYPE_COLORS = {
    정기모임:  { bg: "#eff6ff", color: "#1d4ed8" },
    특별활동:  { bg: "#fef3c7", color: "#92400e" },
    행사:      { bg: "#d1fae5", color: "#065f46" },
  };

  return (
    <div>
      <h2 className="cd-tab__title">최근 활동</h2>
      <div className="cd-activity-list">
        {activities.map((act) => {
          const color = TYPE_COLORS[act.type] || { bg: "#f3f4f6", color: "#374151" };
          return (
            <div key={act.id} className="cd-activity-item">
              <div className="cd-activity-thumb" />
              <div className="cd-activity-info">
                <div className="cd-activity-title">{act.title}</div>
                <div className="cd-activity-date">{act.date}</div>
              </div>
              <span
                className="cd-activity-type"
                style={{ background: color.bg, color: color.color }}
              >
                {act.type}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 멤버 탭 컴포넌트
function MemberTab({ members }) {
  return (
    <div>
      <div className="cd-tab__header">
        <h2 className="cd-tab__title">멤버</h2>
        <span className="cd-tab__count">총 {members.length}명</span>
      </div>
      <div className="cd-member-grid">
        {members.map((member) => (
          <div key={member.id} className="cd-member-card">
            <div className="cd-member-avatar">{member.initial}</div>
            <div className="cd-member-name">{member.name}</div>
            <div className="cd-member-dept">{member.department}</div>
            <span className={`cd-member-role ${member.role === "리더" ? "cd-member-role--leader" : ""}`}>
              {member.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 후기 탭 컴포넌트
function ReviewTab({ reviews, rating }) {
  return (
    <div>
      <div className="cd-tab__header">
        <h2 className="cd-tab__title">멤버 후기</h2>
        <div className="cd-review-rating">
          <span className="cd-review-star">⭐</span>
          <span className="cd-review-score">{rating}</span>
          <span className="cd-review-count">({reviews.length}개)</span>
        </div>
      </div>
      <div className="cd-review-list">
        {reviews.map((review) => (
          <div key={review.id} className="cd-review-item">
            <div className="cd-review-header">
              <div className="cd-review-user">
                <div className="cd-member-avatar">{review.initial}</div>
                <div>
                  <div className="cd-member-name">{review.name}</div>
                  <div className="cd-review-stars">
                    {"⭐".repeat(review.rating)}
                  </div>
                </div>
              </div>
              <span className="cd-review-date">{review.date}</span>
            </div>
            <p className="cd-review-content">{review.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// 소개 탭 컴포넌트
function IntroTab({ club }) {
  return (
    <div>
      <div className="cd-section">
        <h2 className="cd-tab__title">모임 소개</h2>
        {club.intro.map((text, i) => (
          <p key={i} className="cd-section-text">{text}</p>
        ))}
      </div>
      <div className="cd-section">
        <h3 className="cd-section-subtitle">🎯 주요 활동</h3>
        <ul className="cd-activity-check-list">
          {club.activities.map((act, i) => (
            <li key={i} className="cd-activity-check-item">
              <span className="cd-check">✓</span>
              {act}
            </li>
          ))}
        </ul>
      </div>
      <div className="cd-section">
        <h3 className="cd-section-subtitle">활동 사진</h3>
        {/* 🔧 [기능] 실제 활동 사진 API로 교체 */}
        <div className="cd-photo-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="cd-photo-item" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClubDetailPage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
  onJoin,
  onWishlist,
  onShare,
  onContactLeader,
  onRelatedClick,
  onManageClick,
}) {
  const [activeTab, setActiveTab] = useState("소개");

  // 🔧 [기능] useParams()로 id 받아서 API 호출로 교체
  const club = MOCK_CLUB;

  return (
    <div className="club-detail-page">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={onLoginClick}
      />

      <main className="club-detail-page__main">
        <div className="club-detail-page__layout">

          {/* 왼쪽 - 메인 콘텐츠 */}
          <div className="club-detail-page__content">

            {/* 헤더 이미지 + 기본 정보 */}
            <div className="club-detail__hero">
              <div className="club-detail__hero-img" />
              <div className="club-detail__hero-info">
                <div className="club-detail__badges">
                  <span className="club-detail__badge">{club.type}</span>
                  {club.isRecruiting && (
                    <span className="club-detail__badge club-detail__badge--recruiting">모집중</span>
                  )}
                  <span className="club-detail__badge club-detail__badge--category">{club.categoryLabel}</span>
                </div>
                <h1 className="club-detail__name">{club.name}</h1>
                <p className="club-detail__desc">{club.description}</p>
                <div className="club-detail__meta-row">
                  <span>👥 {club.memberCount}명 활동중</span>
                  <span>⭐ {club.rating} 평점</span>
                  <span>🔥 인기 급상승</span>
                </div>
              </div>
            </div>

            {/* 주요 정보 */}
            <div className="club-detail__info-grid">
              <div className="club-detail__info-item">
                <span className="club-detail__info-icon">👥</span>
                <span className="club-detail__info-value">{club.memberCount}</span>
                <span className="club-detail__info-label">멤버</span>
              </div>
              <div className="club-detail__info-item">
                <span className="club-detail__info-icon">📅</span>
                <span className="club-detail__info-value">{club.meetingDay}</span>
                <span className="club-detail__info-label">정기모임</span>
              </div>
              <div className="club-detail__info-item">
                <span className="club-detail__info-icon">📍</span>
                <span className="club-detail__info-value">{club.location}</span>
                <span className="club-detail__info-label">활동장소</span>
              </div>
              <div className="club-detail__info-item">
                <span className="club-detail__info-icon">⏰</span>
                <span className="club-detail__info-value">{club.startTime}</span>
                <span className="club-detail__info-label">시작시간</span>
              </div>
            </div>

            {/* 태그 */}
            <div className="club-detail__tags">
              {club.tags.map((tag) => (
                <span key={tag} className="club-card__tag">{tag}</span>
              ))}
            </div>

            {/* 탭 버튼 */}
            <div className="club-detail__tabs">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  className={`club-detail__tab ${activeTab === tab ? "club-detail__tab--active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠 */}
            <div className="club-detail__tab-content">
              {activeTab === "소개" && <IntroTab club={club} />}
              {activeTab === "활동" && <ActivityTab activities={club.recentActivities} />}
              {activeTab === "멤버" && <MemberTab members={club.members} />}
              {activeTab === "후기" && <ReviewTab reviews={club.reviews} rating={club.rating} />}
            </div>

          </div>

          {/* 오른쪽 - 사이드바 */}
          <aside className="club-detail-page__sidebar">

            {/* 액션 버튼 */}
            <div className="club-detail__actions">
              <button
                className="btn btn--primary club-detail__join-btn"
                // 🔧 [기능] 로그인 확인 후 가입 신청 API 연결
                onClick={() => onJoin && onJoin(club.id)}
              >
                가입 신청하기
              </button>
              <button
                className="btn btn--outline club-detail__action-btn"
                // 🔧 [기능] 관심 목록 API 연결
                onClick={() => onWishlist && onWishlist(club.id)}
              >
                ♡ 관심 목록 추가
              </button>
              <button
                className="btn btn--outline club-detail__action-btn"
                // 🔧 [기능] 공유 기능 연결
                onClick={() => onShare && onShare(club.id)}
              >
                공유하기
              </button>
              {/* 🔧 [기능] 로그인한 유저가 리더인 경우에만 표시 */}
              {isLoggedIn && (
                <button
                  className="club-detail__manage-btn"
                  onClick={() => onManageClick && onManageClick(club.id)}
                >
                  ⚙️ 모임 관리
                </button>
              )}
            </div>

            {/* 모집 정보 */}
            <div className="club-detail__sidebar-card">
              <h3 className="club-detail__sidebar-title">📋 모집 정보</h3>
              <ul className="club-detail__info-list">
                <li className="club-detail__info-list-item">
                  <span className="club-detail__info-list-label">모집 상태</span>
                  <span className="club-detail__badge club-detail__badge--recruiting">모집중</span>
                </li>
                <li className="club-detail__info-list-item">
                  <span className="club-detail__info-list-label">현재 인원</span>
                  <span>{club.memberCount} / {club.maxMembers}명</span>
                </li>
                <li className="club-detail__info-list-item">
                  <span className="club-detail__info-list-label">가입 조건</span>
                  <span>{club.joinCondition}</span>
                </li>
                <li className="club-detail__info-list-item">
                  <span className="club-detail__info-list-label">활동 기간</span>
                  <span>{club.activePeriod}</span>
                </li>
              </ul>
            </div>

            {/* 리더 정보 */}
            <div className="club-detail__sidebar-card">
              <h3 className="club-detail__sidebar-title">👑 리더 정보</h3>
              <div className="club-detail__leader">
                <div className="club-detail__leader-avatar">{club.leader.initial}</div>
                <div>
                  <div className="club-detail__leader-name">{club.leader.name}</div>
                  <div className="club-detail__leader-info">
                    {club.leader.department} {club.leader.grade}
                  </div>
                </div>
              </div>
              <button
                className="btn btn--outline club-detail__action-btn"
                // 🔧 [기능] 리더에게 메시지 기능 연결
                onClick={() => onContactLeader && onContactLeader(club.leader)}
              >
                문의하기
              </button>
            </div>

            {/* 관련 모임 */}
            <div className="club-detail__sidebar-card">
              <h3 className="club-detail__sidebar-title">관련 모임</h3>
              <div className="club-detail__related-list">
                {club.relatedClubs.map((related) => (
                  <div
                    key={related.id}
                    className="club-detail__related-item"
                    // 🔧 [기능] 해당 소모임 상세 페이지 이동
                    onClick={() => onRelatedClick && onRelatedClick(related.id)}
                  >
                    <div className="club-detail__related-thumb" />
                    <div>
                      <div className="club-detail__related-name">{related.name}</div>
                      <div className="club-detail__related-category">{related.category}</div>
                      {related.isRecruiting && (
                        <span className="club-detail__badge club-detail__badge--recruiting">모집중</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}
