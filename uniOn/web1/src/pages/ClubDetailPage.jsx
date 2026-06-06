// 📌 ClubDetailPage - 모임 상세 페이지 (소개 / 활동 / 멤버 탭 포함)
// 🔧 [기능 포인트]
//   - club            : 더미 데이터 → API 응답으로 교체 (useParams로 id 받아서 fetch)
//   - onJoin          : 가입 신청하기 → 가입 신청 API 연결
//   - onWishlist      : 관심 목록 추가 → 관심 목록 API 연결
//   - onRelatedClick  : 관련 모임 클릭 → 해당 소모임 상세 페이지 이동

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { getMeetingActivities, getMeetingMembers } from "../api/meetings";

const DEFAULT_DETAIL_INFO = {
  meetingDay: "일정 조율중",
  location: "장소 협의 예정",
  startTime: "시간 협의 예정",
  joinCondition: "등록된 조건 없음",
  activePeriod: "등록된 기간 없음",
};

const TABS = ["소개", "활동", "멤버"];

function EmptyTabMessage({ children }) {
  return <p className="cd-section-text">{children}</p>;
}

function formatUserMeta(department, grade) {
  const parts = [department, grade]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : "정보 없음";
}

function mapMember(member) {
  return {
    id: member.userId,
    name: member.name,
    initial: (member.name || "?").slice(0, 1),
    department: formatUserMeta(member.department, member.grade),
    role: member.role,
  };
}

function formatActivityDate(value) {
  if (!value) return "날짜 미정";
  return String(value).slice(0, 10).replace(/-/g, ".");
}

function mapActivity(activity) {
  return {
    id: activity.activityId,
    title: activity.title,
    date: formatActivityDate(activity.activityDate),
    type: activity.activityType,
  };
}

// 활동 탭 컴포넌트
function ActivityTab({ activities }) {
  const TYPE_COLORS = {
    정기모임: { bg: "#eff6ff", color: "#1d4ed8" },
    특별활동: { bg: "#fef3c7", color: "#92400e" },
    행사: { bg: "#d1fae5", color: "#065f46" },
  };

  return (
    <div>
      <h2 className="cd-tab__title">최근 활동</h2>
      {activities.length === 0 && (
        <EmptyTabMessage>등록된 최근 활동이 없습니다.</EmptyTabMessage>
      )}
      <div className="cd-activity-list">
        {activities.map((act) => {
          const color = TYPE_COLORS[act.type] || {
            bg: "#f3f4f6",
            color: "#374151",
          };
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
      {members.length === 0 && (
        <EmptyTabMessage>등록된 멤버 정보가 없습니다.</EmptyTabMessage>
      )}
      <div className="cd-member-grid">
        {members.map((member) => (
          <div key={member.id} className="cd-member-card">
            <div className="cd-member-avatar">{member.initial}</div>
            <div className="cd-member-name">{member.name}</div>
            <div className="cd-member-dept">{member.department}</div>
            <span
              className={`cd-member-role ${member.role === "리더" ? "cd-member-role--leader" : ""}`}
            >
              {member.role}
            </span>
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
          <p key={i} className="cd-section-text">
            {text}
          </p>
        ))}
      </div>
      <div className="cd-section">
        <h3 className="cd-section-subtitle">관심 태그</h3>
        {club.activities.length === 0 ? (
          <EmptyTabMessage>등록된 태그가 없습니다.</EmptyTabMessage>
        ) : (
          <ul className="cd-activity-check-list">
            {club.activities.map((act, i) => (
              <li key={i} className="cd-activity-check-item">
                <span className="cd-check">✓</span>
                {act}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="cd-section">
        <h3 className="cd-section-subtitle">활동 사진</h3>
        <EmptyTabMessage>등록된 활동 사진이 없습니다.</EmptyTabMessage>
      </div>
    </div>
  );
}

export default function ClubDetailPage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  authLoading = false,
  user,
  onLoginClick,
  clubs = [],
  loading = false,
  error = "",
  onJoin,
  joiningMeetingId = "",
  onWishlist,
  wishlistMeetingIds = [],
  wishlistUpdatingMeetingId = "",
  onRelatedClick,
  onManageClick,
}) {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("소개");
  const [members, setMembers] = useState([]);
  const [membersError, setMembersError] = useState("");
  const [activities, setActivities] = useState([]);
  const [activitiesError, setActivitiesError] = useState("");
  const matchedClub = clubs.find(
    (item) => String(item.id) === String(id)
  );
  const currentUserId = user?.id ?? user?.userId;

  useEffect(() => {
    async function loadMembers() {
      try {
        setMembersError("");

        const data = await getMeetingMembers(id);
        setMembers(data.map(mapMember));
      } catch (error) {
        setMembers([]);
        setMembersError(error.message);
      }
    }

    if (id) {
      loadMembers();
    }
  }, [id]);

  useEffect(() => {
    async function loadActivities() {
      try {
        setActivitiesError("");

        const data = await getMeetingActivities(id);
        setActivities(data.map(mapActivity));
      } catch (error) {
        setActivities([]);
        setActivitiesError(error.message);
      }
    }

    if (id) {
      loadActivities();
    }
  }, [id]);

  const club = matchedClub
    ? (() => {
        const isCurrentUserLeader =
          currentUserId && String(currentUserId) === String(matchedClub.hostUserId);
        const leaderName =
          matchedClub.leaderName ||
          (isCurrentUserLeader ? user?.name : "") ||
          "등록된 리더 정보 없음";
        const leaderDepartment =
          matchedClub.leaderDepartment ||
          (isCurrentUserLeader ? user?.department : "");
        const leaderGrade =
          matchedClub.leaderGrade ||
          (isCurrentUserLeader ? user?.grade : "");

        return {
        ...DEFAULT_DETAIL_INFO,
        ...matchedClub,
        intro: [matchedClub.description || "등록된 소개가 없습니다."],
        activities: matchedClub.tags || [],
        recentActivities: activities,
        members,
        leader: {
          name: leaderName,
          initial: leaderName.slice(0, 1),
          meta: formatUserMeta(leaderDepartment, leaderGrade),
        },
        relatedClubs: clubs
          .filter(
            (item) =>
              item.id !== matchedClub.id && item.category === matchedClub.category
          )
          .slice(0, 2)
          .map((item) => ({
            id: item.id,
            name: item.name,
            category: item.categoryLabel,
            isRecruiting: item.isRecruiting,
          })),
      };
    })()
    : null;

  if (loading) {
    return <div>불러오는 중...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!club) {
    return <div>해당 모임을 찾을 수 없습니다.</div>;
  }

  const isJoining = String(joiningMeetingId) === String(club.id);
  const isLeader = Boolean(
    currentUserId && String(currentUserId) === String(club.hostUserId)
  );
  const isWishlisted = wishlistMeetingIds
    .map((meetingId) => String(meetingId))
    .includes(String(club.id));
  const isWishlistUpdating = String(wishlistUpdatingMeetingId) === String(club.id);
  const isJoinDisabled = isJoining || !club.isRecruiting;
  const recruitBadgeClass = club.isRecruiting
    ? "club-detail__badge club-detail__badge--recruiting"
    : "club-detail__badge club-detail__badge--closed";

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
                  <span className="club-detail__badge">
                    {club.typeLabel ?? club.type}
                  </span>
                  <span className={recruitBadgeClass}>
                    {club.isRecruiting ? "모집중" : "모집 마감"}
                  </span>
                  <span className="club-detail__badge club-detail__badge--category">
                    {club.categoryLabel}
                  </span>
                </div>
                <h1 className="club-detail__name">{club.name}</h1>
                <p className="club-detail__desc">{club.description}</p>
                <div className="club-detail__meta-row">
                  <span>👥 {club.memberCount}명 활동중</span>
                  <span>📌 {club.recentActivities.length}개 활동</span>
                </div>
              </div>
            </div>

            {/* 주요 정보 */}
            <div className="club-detail__info-grid">
              <div className="club-detail__info-item">
                <span className="club-detail__info-icon">👥</span>
                <span className="club-detail__info-value">
                  {club.memberCount}
                </span>
                <span className="club-detail__info-label">멤버</span>
              </div>
              <div className="club-detail__info-item">
                <span className="club-detail__info-icon">📅</span>
                <span className="club-detail__info-value">
                  {club.meetingDay}
                </span>
                <span className="club-detail__info-label">정기모임</span>
              </div>
              <div className="club-detail__info-item">
                <span className="club-detail__info-icon">📍</span>
                <span className="club-detail__info-value">{club.location}</span>
                <span className="club-detail__info-label">활동장소</span>
              </div>
              <div className="club-detail__info-item">
                <span className="club-detail__info-icon">⏰</span>
                <span className="club-detail__info-value">
                  {club.startTime}
                </span>
                <span className="club-detail__info-label">시작시간</span>
              </div>
            </div>

            {/* 태그 */}
            <div className="club-detail__tags">
              {club.tags.map((tag) => (
                <span key={tag} className="club-card__tag">
                  {tag}
                </span>
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
              {activeTab === "활동" && (
                activitiesError ? (
                  <EmptyTabMessage>{activitiesError}</EmptyTabMessage>
                ) : (
                  <ActivityTab activities={club.recentActivities} />
                )
              )}
              {activeTab === "멤버" &&
                (membersError ? (
                  <EmptyTabMessage>{membersError}</EmptyTabMessage>
                ) : (
                  <MemberTab members={club.members} />
                ))}
            </div>
          </div>

          {/* 오른쪽 - 사이드바 */}
          <aside className="club-detail-page__sidebar">
            {/* 액션 버튼 */}
            <div className="club-detail__actions">
              <button
                className="btn btn--primary club-detail__join-btn"
                disabled={isJoinDisabled}
                // 🔧 [기능] 로그인 확인 후 가입 신청 API 연결
                onClick={() => onJoin && onJoin(club.id)}
              >
                {isJoining
                  ? "가입 신청 중..."
                  : club.isRecruiting
                    ? "가입 신청하기"
                    : "모집 마감"}
              </button>
              <button
                className="btn btn--outline club-detail__action-btn"
                disabled={isWishlistUpdating}
                // 🔧 [기능] 관심 목록 API 연결
                onClick={() => onWishlist && onWishlist(club.id)}
              >
                {isWishlistUpdating
                  ? "처리 중..."
                  : isWishlisted
                    ? "♥ 관심 목록에서 제거"
                    : "♡ 관심 목록 추가"}
              </button>
              {/* 🔧 [기능] 로그인한 유저가 리더인 경우에만 표시 */}
              {!authLoading && isLoggedIn && isLeader && (
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
                  <span className="club-detail__info-list-label">
                    모집 상태
                  </span>
                  <span className={recruitBadgeClass}>
                    {club.isRecruiting ? "모집중" : "모집 마감"}
                  </span>
                </li>
                <li className="club-detail__info-list-item">
                  <span className="club-detail__info-list-label">
                    현재 인원
                  </span>
                  <span>
                    {club.memberCount}
                    {club.maxMembers ? ` / ${club.maxMembers}` : ""}명
                  </span>
                </li>
                <li className="club-detail__info-list-item">
                  <span className="club-detail__info-list-label">
                    가입 조건
                  </span>
                  <span>{club.joinCondition}</span>
                </li>
                <li className="club-detail__info-list-item">
                  <span className="club-detail__info-list-label">
                    활동 기간
                  </span>
                  <span>{club.activePeriod}</span>
                </li>
              </ul>
            </div>

            {/* 리더 정보 */}
            <div className="club-detail__sidebar-card">
              <h3 className="club-detail__sidebar-title">👑 리더 정보</h3>
              <div className="club-detail__leader">
                <div className="club-detail__leader-avatar">
                  {club.leader.initial}
                </div>
                <div>
                  <div className="club-detail__leader-name">
                    {club.leader.name}
                  </div>
                  <div className="club-detail__leader-info">
                    {club.leader.meta}
                  </div>
                </div>
              </div>
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
                      <div className="club-detail__related-name">
                        {related.name}
                      </div>
                      <div className="club-detail__related-category">
                        {related.category}
                      </div>
                      <span
                        className={
                          related.isRecruiting
                            ? "club-detail__badge club-detail__badge--recruiting"
                            : "club-detail__badge club-detail__badge--closed"
                        }
                      >
                        {related.isRecruiting ? "모집중" : "모집 마감"}
                      </span>
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
