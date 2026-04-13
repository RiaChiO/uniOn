// 📌 ClubManagePage - 모임 관리 (리더 전용)
// 🔧 [기능 포인트]
//   - 접근 제한     : 로그인 + 리더인 경우만 접근 가능하도록 팀원이 구현
//                     비로그인 또는 일반 멤버 접근 시 상세 페이지로 리다이렉트
//   - onSave        : 변경사항 저장 → 수정 API 연결
//   - onDelete      : 모임 삭제 → 삭제 API 연결 후 메인으로 이동
//   - onApproveMember  : 멤버 승인 → 승인 API 연결
//   - onRejectMember   : 멤버 거절 → 거절 API 연결
//   - onRemoveMember   : 멤버 내보내기 → 내보내기 API 연결
//   - onAddActivity    : 활동 추가 → 활동 생성 API 연결
//   - onDeleteActivity : 활동 삭제 → 활동 삭제 API 연결
//   - onToggleRecruit  : 모집 상태 변경 → 상태 변경 API 연결
//   - onGoPublic       : 공개 페이지 보기 → 상세 페이지 이동

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  getMeetingJoinRequests,
  getMeetingMembers,
} from "../api/meetings";

const MOCK_ACTIVITIES = [
  { id: 1, title: "알고리즘 스터디 Week 12", date: "2024.03.20", type: "정기모임" },
  { id: 2, title: "해커톤 참가",             date: "2024.03.15", type: "특별활동" },
  { id: 3, title: "신입생 환영회",            date: "2024.03.10", type: "행사" },
  { id: 4, title: "코드 리뷰 세션",           date: "2024.03.05", type: "정기모임" },
];

const ACTIVITY_TYPE_COLORS = {
  정기모임:  { bg: "#eff6ff",  color: "#1d4ed8" },
  특별활동:  { bg: "#fef3c7",  color: "#92400e" },
  행사:      { bg: "#d1fae5",  color: "#065f46" },
};

const TABS = ["기본 정보", "멤버 관리", "활동 관리", "모집 설정"];

function mapJoinRequest(request) {
  return {
    id: request.userId,
    name: request.name,
    initial: (request.name || "?").slice(0, 1),
    department: "정보 없음",
  };
}

function mapMember(member) {
  return {
    id: member.userId,
    name: member.name,
    initial: (member.name || "?").slice(0, 1),
    department: "정보 없음",
    role: member.role,
  };
}

export default function ClubManagePage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
  clubs = [],
  loading = false,
  error = "",
  onSave,
  onDelete,
  onApproveMember,
  onRejectMember,
  onRemoveMember,
  onAddActivity,
  onDeleteActivity,
  onToggleRecruit,
  onGoPublic,
}) {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("기본 정보");
  const matchedClub = clubs.find((item) => String(item.id) === String(id));
  const club = matchedClub
    ? {
        meetingTime: matchedClub.meetingDay || "일정 조율중",
        maxMembers: matchedClub.maxMembers ?? null,
        joinCondition: matchedClub.joinCondition ?? "등록된 조건 없음",
        rating: matchedClub.rating ?? "-",
        activityCount: matchedClub.activityCount ?? 0,
        reviewCount: matchedClub.reviewCount ?? 0,
        ...matchedClub,
      }
    : null;
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [pendingMembers, setPendingMembers] = useState([]);
  const [pendingMembersLoading, setPendingMembersLoading] = useState(false);
  const [pendingMembersError, setPendingMembersError] = useState("");

  // 기본 정보 수정 상태
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [location,    setLocation]    = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [tags,        setTags]        = useState([]);
  const [tagInput,    setTagInput]    = useState("");

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      const newTag = tagInput.startsWith("#") ? tagInput.trim() : `#${tagInput.trim()}`;
      setTags((prev) => [...prev, newTag]);
      setTagInput("");
    }
  };
  const removeTag = (index) => setTags((prev) => prev.filter((_, i) => i !== index));

  useEffect(() => {
    if (!club) return;

    setName(club.name);
    setDescription(club.description);
    setLocation(club.location);
    setMeetingTime(club.meetingTime);
    setTags(club.tags || []);
  }, [matchedClub]);

  useEffect(() => {
    async function loadMembers() {
      try {
        setMembersLoading(true);
        setMembersError("");

        const data = await getMeetingMembers(id);
        setMembers(data.map(mapMember));
      } catch (error) {
        setMembersError(error.message);
      } finally {
        setMembersLoading(false);
      }
    }

    if (id) {
      loadMembers();
    }
  }, [id]);

  useEffect(() => {
    async function loadPendingMembers() {
      try {
        setPendingMembersLoading(true);
        setPendingMembersError("");

        const data = await getMeetingJoinRequests(id);
        setPendingMembers(data.map(mapJoinRequest));
      } catch (error) {
        setPendingMembersError(error.message);
      } finally {
        setPendingMembersLoading(false);
      }
    }

    if (id) {
      loadPendingMembers();
    }
  }, [id]);

  const handleApproveMember = async (memberId) => {
    await onApproveMember?.(id, memberId);
    const approvedMember = pendingMembers.find((member) => member.id === memberId);
    setPendingMembers((prev) => prev.filter((member) => member.id !== memberId));
    if (approvedMember) {
      setMembers((prev) => [...prev, { ...approvedMember, role: "멤버" }]);
    }
  };

  const handleRejectMember = async (memberId) => {
    await onRejectMember?.(id, memberId);
    setPendingMembers((prev) => prev.filter((member) => member.id !== memberId));
  };

  if (loading) {
    return <div>불러오는 중...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!club) {
    return <div>해당 모임을 찾을 수 없습니다.</div>;
  }

  return (
    <div className="manage-page">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={onLoginClick}
      />

      <main className="manage-page__main">

        {/* 헤더 */}
        <div className="manage-page__header">
          <div>
            <h1 className="manage-page__title">모임 관리</h1>
            <p className="manage-page__subtitle">{club.name} · 리더만 볼 수 있는 페이지예요</p>
          </div>
          <div className="manage-page__header-btns">
            <button
              className="btn btn--secondary"
              // 🔧 [기능] 상세 페이지로 이동
              onClick={() => onGoPublic && onGoPublic(club.id)}
            >
              공개 페이지 보기
            </button>
            <button
              className="btn btn--primary"
              // 🔧 [기능] 수정 API 연결
              onClick={() => onSave && onSave({ name, description, location, meetingTime, tags })}
            >
              변경사항 저장
            </button>
            <button
              className="manage-page__delete-btn"
              // 🔧 [기능] 삭제 API 연결 후 메인으로 이동
              onClick={() => onDelete && onDelete(club.id)}
            >
              모임 삭제
            </button>
          </div>
        </div>

        <div className="manage-page__layout">

          {/* 왼쪽 - 탭 콘텐츠 */}
          <div className="manage-page__content">

            {/* 탭 버튼 */}
            <div className="manage-page__tabs">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  className={`manage-page__tab ${activeTab === tab ? "manage-page__tab--active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 기본 정보 탭 */}
            {activeTab === "기본 정보" && (
              <div className="manage-card">
                <div className="manage-card__image-upload">
                  + 대표 이미지 변경
                </div>
                <div className="form-field">
                  <label className="form-field__label">모임명</label>
                  <input className="form-field__input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-field">
                  <label className="form-field__label">소개</label>
                  <textarea className="form-field__textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                <div className="create-box__two-col">
                  <div className="form-field">
                    <label className="form-field__label">활동 장소</label>
                    <input className="form-field__input" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label className="form-field__label">정기 모임 시간</label>
                    <input className="form-field__input" value={meetingTime} onChange={(e) => setMeetingTime(e.target.value)} />
                  </div>
                </div>
                <div className="form-field">
                  <label className="form-field__label">태그</label>
                  <input
                    className="form-field__input"
                    placeholder="태그 입력 후 Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                  />
                  <div className="create-box__tags" style={{ marginTop: "10px" }}>
                    {tags.map((tag, index) => (
                      <span key={index} className="create-box__tag">
                        {tag}
                        <button className="create-box__tag-remove" onClick={() => removeTag(index)}>✕</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 멤버 관리 탭 */}
            {activeTab === "멤버 관리" && (
              <div className="manage-card">

                <div className="manage-section">
                  <h3 className="manage-section__title">가입 대기 <span className="manage-section__count">{pendingMembers.length}명</span></h3>
                  {pendingMembersLoading ? (
                    <p>가입 신청 목록을 불러오는 중입니다.</p>
                  ) : pendingMembersError ? (
                    <p>{pendingMembersError}</p>
                  ) : pendingMembers.length === 0 ? (
                    <p>가입 대기 중인 멤버가 없습니다.</p>
                  ) : (
                    pendingMembers.map((member) => (
                      <div key={member.id} className="manage-member-item">
                        <div className="manage-avatar manage-avatar--pending">{member.initial}</div>
                        <div>
                          <div className="manage-member-name">{member.name}</div>
                          <div className="manage-member-dept">{member.department}</div>
                        </div>
                        <div className="manage-member-actions">
                          <button
                            className="manage-btn manage-btn--approve"
                            // 🔧 [기능] 승인 API 연결
                            onClick={() => handleApproveMember(member.id)}
                          >
                            승인
                          </button>
                          <button
                            className="manage-btn manage-btn--danger"
                            // 🔧 [기능] 거절 API 연결
                            onClick={() => handleRejectMember(member.id)}
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* 활동 멤버 */}
                <div className="manage-section">
                  <h3 className="manage-section__title">활동 멤버 <span className="manage-section__count">{members.length}명</span></h3>
                  {membersLoading ? (
                    <p>활동 멤버를 불러오는 중입니다.</p>
                  ) : membersError ? (
                    <p>{membersError}</p>
                  ) : members.length === 0 ? (
                    <p>활동 멤버가 없습니다.</p>
                  ) : (
                    members.map((member) => (
                      <div key={member.id} className="manage-member-item">
                        <div className={`manage-avatar ${member.role === "리더" ? "manage-avatar--leader" : ""}`}>{member.initial}</div>
                        <div>
                          <div className="manage-member-name">{member.name}</div>
                          <div className="manage-member-dept">{member.department}</div>
                        </div>
                        <span className={`manage-role-badge ${member.role === "리더" ? "manage-role-badge--leader" : ""}`}>
                          {member.role}
                        </span>
                        {member.role !== "리더" && (
                          <div className="manage-member-actions">
                            <button
                              className="manage-btn"
                              // 🔧 [기능] 리더 위임 API 연결
                              onClick={() => console.log("TODO: 리더 위임")}
                            >
                              위임
                            </button>
                            <button
                              className="manage-btn manage-btn--danger"
                              // 🔧 [기능] 내보내기 API 연결
                              onClick={() => onRemoveMember && onRemoveMember(member.id)}
                            >
                              내보내기
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 활동 관리 탭 */}
            {activeTab === "활동 관리" && (
              <div className="manage-card">
                <div className="manage-section__header">
                  <h3 className="manage-section__title">활동 내역</h3>
                  <button
                    className="btn btn--primary manage-add-btn"
                    // 🔧 [기능] 활동 추가 폼 열기 또는 API 연결
                    onClick={() => onAddActivity && onAddActivity()}
                  >
                    + 활동 추가
                  </button>
                </div>
                {MOCK_ACTIVITIES.map((act) => {
                  const color = ACTIVITY_TYPE_COLORS[act.type] || { bg: "#f3f4f6", color: "#374151" };
                  return (
                    <div key={act.id} className="manage-activity-item">
                      <div className="manage-activity-thumb" />
                      <div className="manage-activity-info">
                        <div className="manage-activity-title">{act.title}</div>
                        <div className="manage-activity-date">{act.date}</div>
                      </div>
                      <span
                        className="manage-activity-type"
                        style={{ background: color.bg, color: color.color }}
                      >
                        {act.type}
                      </span>
                      <div className="manage-member-actions">
                        <button className="manage-btn">수정</button>
                        <button
                          className="manage-btn manage-btn--danger"
                          // 🔧 [기능] 활동 삭제 API 연결
                          onClick={() => onDeleteActivity && onDeleteActivity(act.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 모집 설정 탭 */}
            {activeTab === "모집 설정" && (
              <div className="manage-card">
                <div className="manage-section">
                  <h3 className="manage-section__title">모집 상태</h3>
                  <ul className="manage-recruit-list">
                    <li className="manage-recruit-item">
                      <span className="manage-recruit-label">모집 상태</span>
                      <span className="club-detail__badge club-detail__badge--recruiting">모집중</span>
                    </li>
                    <li className="manage-recruit-item">
                      <span className="manage-recruit-label">현재 인원</span>
                      <span>{members.length}{club.maxMembers ? ` / ${club.maxMembers}` : ""}명</span>
                    </li>
                    <li className="manage-recruit-item">
                      <span className="manage-recruit-label">가입 조건</span>
                      <span>{club.joinCondition}</span>
                    </li>
                  </ul>
                  <button
                    className="manage-recruit-close-btn"
                    // 🔧 [기능] 모집 상태 변경 API 연결
                    onClick={() => onToggleRecruit && onToggleRecruit(club.id)}
                  >
                    모집 마감하기
                  </button>
                </div>

                {/* 통계 */}
                <div className="manage-section">
                  <h3 className="manage-section__title">모임 통계</h3>
                  <div className="manage-stat-grid">
                    <div className="manage-stat-item">
                      <span className="manage-stat-value">{members.length}</span>
                      <span className="manage-stat-label">멤버 수</span>
                    </div>
                    <div className="manage-stat-item">
                      <span className="manage-stat-value">{club.rating}</span>
                      <span className="manage-stat-label">평균 평점</span>
                    </div>
                    <div className="manage-stat-item">
                      <span className="manage-stat-value">{club.activityCount}</span>
                      <span className="manage-stat-label">총 활동</span>
                    </div>
                    <div className="manage-stat-item">
                      <span className="manage-stat-value">{club.reviewCount}</span>
                      <span className="manage-stat-label">후기 수</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽 사이드바 */}
          <aside className="manage-page__sidebar">
            <div className="manage-sidebar-card">
              <h3 className="manage-sidebar-title">빠른 통계</h3>
              <div className="manage-stat-grid">
                <div className="manage-stat-item">
                  <span className="manage-stat-value">{members.length}</span>
                  <span className="manage-stat-label">멤버</span>
                </div>
                <div className="manage-stat-item">
                  <span className="manage-stat-value">{pendingMembers.length}</span>
                  <span className="manage-stat-label">대기중</span>
                </div>
                <div className="manage-stat-item">
                  <span className="manage-stat-value">{club.activityCount}</span>
                  <span className="manage-stat-label">활동</span>
                </div>
                <div className="manage-stat-item">
                  <span className="manage-stat-value">{club.rating}</span>
                  <span className="manage-stat-label">평점</span>
                </div>
              </div>
            </div>

            <div className="manage-sidebar-card">
              <h3 className="manage-sidebar-title">공개 페이지</h3>
              <p className="manage-sidebar-desc">일반 사용자에게 보이는 페이지를 확인해보세요</p>
              <button
                className="btn btn--outline"
                onClick={() => onGoPublic && onGoPublic(club.id)}
              >
                공개 페이지 보기 →
              </button>
            </div>
          </aside>

        </div>
      </main>

      <Footer />
    </div>
  );
}
