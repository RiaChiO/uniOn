// 📌 ClubManagePage - 모임 관리 (리더 전용)
// 🔧 [기능 포인트]
//   - 접근 제한     : 로그인 + 리더인 경우만 접근 가능하도록 팀원이 구현
//                     비로그인 또는 일반 멤버 접근 시 상세 페이지로 리다이렉트
//   - onSave        : 변경사항 저장 → 수정 API 연결
//   - onDelete      : 모임 삭제 → 삭제 API 연결 후 메인으로 이동
//   - onApproveMember  : 멤버 승인 → 승인 API 연결
//   - onRejectMember   : 멤버 거절 → 거절 API 연결
//   - onRemoveMember   : 멤버 내보내기 → 내보내기 API 연결
//   - 활동 관리       : 활동 추가 / 수정 / 삭제 API 연결
//   - onToggleRecruit  : 모집 상태 변경 → 상태 변경 API 연결
//   - onGoPublic       : 돌아가기 → 상세 페이지 이동

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  createMeetingActivity,
  deleteMeetingActivity,
  getMeetingActivities,
  getMeetingJoinRequests,
  getMeetingMembers,
  updateMeetingActivity,
} from "../api/meetings";

const ACTIVITY_TYPE_COLORS = {
  정기모임:  { bg: "#eff6ff",  color: "#1d4ed8" },
  특별활동:  { bg: "#fef3c7",  color: "#92400e" },
  행사:      { bg: "#d1fae5",  color: "#065f46" },
};

const ACTIVITY_TYPES = Object.keys(ACTIVITY_TYPE_COLORS);
function getEmptyActivityForm() {
  return {
    title: "",
    type: "정기모임",
    date: new Date().toISOString().slice(0, 10),
  };
}

const TABS = ["기본 정보", "멤버 관리", "활동 관리", "모집 설정"];

function formatUserMeta(department, grade) {
  const parts = [department, grade]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);

  return parts.length > 0 ? parts.join(" ") : "정보 없음";
}

function mapJoinRequest(request) {
  return {
    id: request.userId,
    name: request.name,
    initial: (request.name || "?").slice(0, 1),
    department: formatUserMeta(request.department, request.grade),
  };
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

function normalizeActivityDate(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatActivityDate(value) {
  return normalizeActivityDate(value).replace(/-/g, ".");
}

function mapActivity(activity) {
  return {
    id: activity.activityId,
    title: activity.title,
    type: activity.activityType,
    date: normalizeActivityDate(activity.activityDate),
  };
}

export default function ClubManagePage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  authLoading = false,
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
  onTransferLeader,
  onToggleRecruit,
  onGoPublic,
  onTransferLeadershipAndLeave,
}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("기본 정보");
  // 🔧 [모임 떠나기] 모달 상태
  const [leaveStep, setLeaveStep] = useState(null); // null | 'choice' | 'transfer' | 'delete'
  const [transferTargetId, setTransferTargetId] = useState("");
  const [isLeaving, setIsLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState("");
  const matchedClub = clubs.find((item) => String(item.id) === String(id));
  const club = matchedClub
    ? {
        meetingTime: matchedClub.meetingDay || "일정 조율중",
        maxMembers: matchedClub.maxMembers ?? null,
        joinCondition: matchedClub.joinCondition ?? "등록된 조건 없음",
        ...matchedClub,
      }
    : null;
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [pendingMembers, setPendingMembers] = useState([]);
  const [pendingMembersLoading, setPendingMembersLoading] = useState(false);
  const [pendingMembersError, setPendingMembersError] = useState("");
  const [activities, setActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState("");
  const [activityForm, setActivityForm] = useState(getEmptyActivityForm);
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [activitySaving, setActivitySaving] = useState(false);

  // 기본 정보 수정 상태
  const [name,        setName]        = useState("");
  const [description, setDescription] = useState("");
  const [location,    setLocation]    = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [maxMembers,  setMaxMembers]  = useState("");
  const [joinCondition, setJoinCondition] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [tags,        setTags]        = useState([]);
  const [tagInput,    setTagInput]    = useState("");
  const currentUserId = user?.id ?? user?.userId;
  const isLeader = Boolean(
    club && currentUserId && String(currentUserId) === String(club.hostUserId)
  );

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
    setMaxMembers(club.maxMembers ?? "");
    setJoinCondition(club.joinCondition ?? "");
    setImage(null);
    setImagePreviewUrl(club.imageUrl ?? "");
    setTags(club.tags || []);
  }, [matchedClub]);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (loading || authLoading || !club) return;

    if (!isLoggedIn || !isLeader) {
      navigate(`/clubs/${id}`, { replace: true });
    }
  }, [authLoading, club, id, isLeader, isLoggedIn, loading, navigate]);

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

    if (id && isLeader) {
      loadMembers();
    }
  }, [id, isLeader]);

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

    if (id && isLeader) {
      loadPendingMembers();
    }
  }, [id, isLeader]);

  useEffect(() => {
    async function loadActivities() {
      try {
        setActivitiesLoading(true);
        setActivitiesError("");

        const data = await getMeetingActivities(id);
        setActivities(data.map(mapActivity));
      } catch (error) {
        setActivitiesError(error.message);
      } finally {
        setActivitiesLoading(false);
      }
    }

    if (id && isLeader) {
      loadActivities();
    }
  }, [id, isLeader]);

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

  const handleRemoveMember = async (memberId) => {
    const removed = await onRemoveMember?.(id, memberId);
    if (!removed) return;

    setMembers((prev) => prev.filter((member) => member.id !== memberId));
  };

  const handleTransferLeader = async (memberId) => {
    const targetMember = members.find((member) => member.id === memberId);
    const transferred = await onTransferLeader?.(id, memberId, targetMember?.name);
    if (!transferred) return;

    setMembers((prev) =>
      prev.map((member) => {
        if (member.id === memberId) {
          return { ...member, role: "리더" };
        }
        if (member.role === "리더") {
          return { ...member, role: "멤버" };
        }
        return member;
      })
    );
  };

  const transferableMembers = members.filter((member) => member.role !== "리더");

  const closeLeaveModal = () => {
    if (isLeaving) return;
    setLeaveStep(null);
    setTransferTargetId("");
    setLeaveError("");
  };

  const handleTransferAndLeave = async () => {
    if (!transferTargetId) {
      setLeaveError("리더를 위임할 멤버를 선택하세요.");
      return;
    }

    const targetMember = transferableMembers.find(
      (member) => String(member.id) === String(transferTargetId)
    );

    try {
      setIsLeaving(true);
      setLeaveError("");
      const completed = await onTransferLeadershipAndLeave?.(
        club.id,
        transferTargetId,
        targetMember?.name
      );

      if (!completed) {
        setLeaveError("리더 위임 및 탈퇴를 완료하지 못했습니다.");
      }
    } catch (error) {
      setLeaveError(error.message || "리더 위임 및 탈퇴 중 오류가 발생했습니다.");
    } finally {
      setIsLeaving(false);
    }
  };

  const handleDeleteFromLeaveModal = () => {
    setLeaveStep(null);
    onDelete?.(club.id);
  };

  const handleActivityFormChange = (field, value) => {
    setActivityForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetActivityForm = () => {
    setActivityForm(getEmptyActivityForm());
    setEditingActivityId(null);
  };

  const handleSubmitActivity = async (event) => {
    event.preventDefault();

    const title = activityForm.title.trim();
    const activityType = activityForm.type.trim();
    const activityDate = activityForm.date;

    if (!title || !activityType || !activityDate) {
      window.alert("활동 제목, 유형, 날짜는 필수입니다.");
      return;
    }

    try {
      setActivitySaving(true);

      if (editingActivityId) {
        const data = await updateMeetingActivity(id, editingActivityId, {
          title,
          activityType,
          activityDate,
        });
        const updatedActivity = mapActivity(data.activity ?? data);
        setActivities((prev) =>
          prev.map((activity) =>
            String(activity.id) === String(editingActivityId)
              ? updatedActivity
              : activity
          )
        );
      } else {
        const data = await createMeetingActivity(id, {
          title,
          activityType,
          activityDate,
        });
        const createdActivity = mapActivity(data.activity ?? data);
        setActivities((prev) => [createdActivity, ...prev]);
      }

      resetActivityForm();
    } catch (error) {
      window.alert(error.message || "활동 내역 저장 중 오류가 발생했습니다.");
    } finally {
      setActivitySaving(false);
    }
  };

  const handleEditActivity = (activity) => {
    setEditingActivityId(activity.id);
    setActivityForm({
      title: activity.title,
      type: activity.type,
      date: normalizeActivityDate(activity.date),
    });
    setActiveTab("활동 관리");
  };

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("이 활동 내역을 삭제하시겠습니까?")) {
      return;
    }

    try {
      await deleteMeetingActivity(id, activityId);
      setActivities((prev) => prev.filter((activity) => activity.id !== activityId));
      if (String(editingActivityId) === String(activityId)) {
        resetActivityForm();
      }
    } catch (error) {
      window.alert(error.message || "활동 삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading || authLoading) {
    return <div>불러오는 중...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  if (!club) {
    return <div>해당 모임을 찾을 수 없습니다.</div>;
  }

  if (!isLeader) {
    return <div>접근 권한을 확인하는 중입니다.</div>;
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
              돌아가기
            </button>
            <button
              className="btn btn--primary"
              // 🔧 [기능] 수정 API 연결
              onClick={() => onSave && onSave(club.id, { name, description, location, meetingTime, maxMembers, joinCondition, image, imageUrl: imagePreviewUrl || club.imageUrl || null, tags, tagId: club.tagId, displayCategory: club.displayCategory })}
            >
              변경사항 저장
            </button>
            <button
              className="manage-page__leave-btn"
              // 🔧 [기능] 모임 떠나기 모달 열기
              onClick={() => {
                setLeaveError("");
                setLeaveStep("choice");
              }}
            >
              🚪 모임 떠나기
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
                <div
                  className="manage-card__image-upload"
                  onClick={() => document.getElementById("manageImageInput").click()}
                >
                  <input
                    id="manageImageInput"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const selectedImage = e.target.files?.[0] ?? null;
                      setImage(selectedImage);
                      if (selectedImage) {
                        setImagePreviewUrl(URL.createObjectURL(selectedImage));
                      }
                    }}
                  />
                  {imagePreviewUrl ? (
                    <img className="manage-card__image-preview" src={imagePreviewUrl} alt="" />
                  ) : (
                    "+ 대표 이미지 변경"
                  )}
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
                <div className="create-box__two-col">
                  <div className="form-field">
                    <label className="form-field__label">최대 인원</label>
                    <input className="form-field__input" type="number" value={maxMembers} onChange={(e) => setMaxMembers(e.target.value)} />
                  </div>
                  <div className="form-field">
                    <label className="form-field__label">가입 조건</label>
                    <input className="form-field__input" value={joinCondition} onChange={(e) => setJoinCondition(e.target.value)} />
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
                              onClick={() => handleTransferLeader(member.id)}
                            >
                              위임
                            </button>
                            <button
                              className="manage-btn manage-btn--danger"
                              // 🔧 [기능] 내보내기 API 연결
                              onClick={() => handleRemoveMember(member.id)}
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
                  {editingActivityId && (
                    <button
                      className="btn btn--secondary manage-add-btn"
                      onClick={resetActivityForm}
                    >
                      새 활동 입력
                    </button>
                  )}
                </div>

                <form className="manage-activity-form" onSubmit={handleSubmitActivity}>
                  <div className="form-field">
                    <label className="form-field__label">활동 제목</label>
                    <input
                      className="form-field__input"
                      value={activityForm.title}
                      onChange={(event) =>
                        handleActivityFormChange("title", event.target.value)
                      }
                      placeholder="예: 알고리즘 스터디 Week 12"
                    />
                  </div>
                  <div className="create-box__two-col">
                    <div className="form-field">
                      <label className="form-field__label">활동 유형</label>
                      <select
                        className="form-field__input form-field__select"
                        value={activityForm.type}
                        onChange={(event) =>
                          handleActivityFormChange("type", event.target.value)
                        }
                      >
                        {ACTIVITY_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label className="form-field__label">활동 날짜</label>
                      <input
                        className="form-field__input"
                        type="date"
                        value={activityForm.date}
                        onChange={(event) =>
                          handleActivityFormChange("date", event.target.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="manage-activity-form__actions">
                    <button
                      className="btn btn--primary manage-add-btn"
                      type="submit"
                      disabled={activitySaving}
                    >
                      {activitySaving
                        ? "저장 중..."
                        : editingActivityId
                          ? "활동 수정"
                          : "+ 활동 추가"}
                    </button>
                    {editingActivityId && (
                      <button
                        className="btn btn--outline"
                        type="button"
                        onClick={resetActivityForm}
                      >
                        취소
                      </button>
                    )}
                  </div>
                </form>

                {activitiesLoading ? (
                  <p>활동 내역을 불러오는 중입니다.</p>
                ) : activitiesError ? (
                  <p>{activitiesError}</p>
                ) : activities.length === 0 ? (
                  <p>등록된 활동 내역이 없습니다.</p>
                ) : (
                  activities.map((act) => {
                    const color = ACTIVITY_TYPE_COLORS[act.type] || { bg: "#f3f4f6", color: "#374151" };
                    return (
                      <div key={act.id} className="manage-activity-item">
                        <div className="manage-activity-thumb" />
                        <div className="manage-activity-info">
                          <div className="manage-activity-title">{act.title}</div>
                          <div className="manage-activity-date">{formatActivityDate(act.date)}</div>
                        </div>
                        <span
                          className="manage-activity-type"
                          style={{ background: color.bg, color: color.color }}
                        >
                          {act.type}
                        </span>
                        <div className="manage-member-actions">
                          <button
                            className="manage-btn"
                            onClick={() => handleEditActivity(act)}
                          >
                            수정
                          </button>
                          <button
                            className="manage-btn manage-btn--danger"
                            onClick={() => handleDeleteActivity(act.id)}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
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
                      <span
                        className={
                          club.isRecruiting
                            ? "club-detail__badge club-detail__badge--recruiting"
                            : "club-detail__badge club-detail__badge--closed"
                        }
                      >
                        {club.isRecruiting ? "모집중" : "모집 마감"}
                      </span>
                    </li>
                    <li className="manage-recruit-item">
                      <span className="manage-recruit-label">현재 인원</span>
                      <span>{members.length}{maxMembers ? ` / ${maxMembers}` : ""}명</span>
                    </li>
                    <li className="manage-recruit-item">
                      <span className="manage-recruit-label">가입 조건</span>
                      <span>{joinCondition || "등록된 조건 없음"}</span>
                    </li>
                  </ul>
                  <button
                    className="manage-recruit-close-btn"
                    // 🔧 [기능] 모집 상태 변경 API 연결
                    onClick={() => onToggleRecruit && onToggleRecruit(club.id, !club.isRecruiting)}
                  >
                    {club.isRecruiting ? "모집 마감하기" : "모집 재개하기"}
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
                      <span className="manage-stat-value">{pendingMembers.length}</span>
                      <span className="manage-stat-label">가입 대기</span>
                    </div>
                    <div className="manage-stat-item">
                      <span className="manage-stat-value">{activities.length}</span>
                      <span className="manage-stat-label">총 활동</span>
                    </div>
                    <div className="manage-stat-item">
                      <span className="manage-stat-value">
                        {club.isRecruiting ? "진행" : "마감"}
                      </span>
                      <span className="manage-stat-label">모집 상태</span>
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
                  <span className="manage-stat-value">{activities.length}</span>
                  <span className="manage-stat-label">활동</span>
                </div>
                <div className="manage-stat-item">
                  <span className="manage-stat-value">
                    {club.isRecruiting ? "진행" : "마감"}
                  </span>
                  <span className="manage-stat-label">모집</span>
                </div>
              </div>
            </div>

          </aside>

        </div>
      </main>

      <Footer />

      {leaveStep && (
        <div
          className="manage-page__modal-overlay"
          role="presentation"
          onClick={closeLeaveModal}
        >
          <div
            className="manage-page__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-leave-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="manage-page__modal-close"
              aria-label="닫기"
              disabled={isLeaving}
              onClick={closeLeaveModal}
            >
              ✕
            </button>

            <div className="manage-page__modal-icon" aria-hidden="true">🚪</div>
            <h2 id="manage-leave-modal-title" className="manage-page__modal-title">
              모임 떠나기
            </h2>
            <p className="manage-page__modal-club">{club.name}</p>

            {leaveStep === "choice" && (
              <>
                <p className="manage-page__modal-warn">
                  리더는 바로 탈퇴할 수 없습니다. 다른 멤버에게 리더를
                  위임하거나 모임을 삭제해야 합니다.
                </p>
                <div className="manage-page__modal-opts">
                  {transferableMembers.length > 0 ? (
                    <button
                      type="button"
                      className="manage-page__modal-opt"
                      onClick={() => setLeaveStep("transfer")}
                    >
                      <span className="manage-page__modal-opt-icon">👑</span>
                      <span className="manage-page__modal-opt-body">
                        <span className="manage-page__modal-opt-t">
                          리더 위임 후 탈퇴
                        </span>
                        <span className="manage-page__modal-opt-d">
                          다른 멤버를 새 리더로 지정하고 모임에서 나갑니다.
                        </span>
                      </span>
                    </button>
                  ) : (
                    <p className="manage-page__modal-empty">
                      리더를 위임할 다른 멤버가 없습니다.
                    </p>
                  )}
                  <button
                    type="button"
                    className="manage-page__modal-opt"
                    onClick={() => setLeaveStep("delete")}
                  >
                    <span className="manage-page__modal-opt-icon">🗑</span>
                    <span className="manage-page__modal-opt-body">
                      <span className="manage-page__modal-opt-t">모임 삭제</span>
                      <span className="manage-page__modal-opt-d">
                        모임과 관련 데이터를 삭제합니다.
                      </span>
                    </span>
                  </button>
                </div>
                <div className="manage-page__modal-actions">
                  <button
                    type="button"
                    className="manage-page__modal-btn manage-page__modal-btn--cancel"
                    onClick={closeLeaveModal}
                  >
                    취소
                  </button>
                </div>
              </>
            )}

            {leaveStep === "transfer" && (
              <>
                <p className="manage-page__modal-warn">
                  새 리더를 선택하면 위임과 현재 리더의 탈퇴가 함께 처리됩니다.
                </p>
                <div className="manage-page__modal-members">
                  {transferableMembers.map((member) => (
                    <label
                      key={member.id}
                      className={`manage-page__modal-member ${
                        String(transferTargetId) === String(member.id)
                          ? "is-selected"
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name="transferLeader"
                        value={member.id}
                        checked={String(transferTargetId) === String(member.id)}
                        onChange={(event) => {
                          setTransferTargetId(event.target.value);
                          setLeaveError("");
                        }}
                      />
                      <span className="manage-page__modal-member-avatar">
                        {member.initial}
                      </span>
                      <span className="manage-page__modal-member-info">
                        <span className="manage-page__modal-member-name">
                          {member.name}
                        </span>
                        <span className="manage-page__modal-member-dept">
                          {member.department}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
                {leaveError && (
                  <p className="manage-page__modal-error">{leaveError}</p>
                )}
                <div className="manage-page__modal-actions">
                  <button
                    type="button"
                    className="manage-page__modal-btn manage-page__modal-btn--cancel"
                    disabled={isLeaving}
                    onClick={() => setLeaveStep("choice")}
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    className="manage-page__modal-btn manage-page__modal-btn--leave"
                    disabled={!transferTargetId || isLeaving}
                    onClick={handleTransferAndLeave}
                  >
                    {isLeaving ? "처리 중..." : "위임 후 탈퇴"}
                  </button>
                </div>
              </>
            )}

            {leaveStep === "delete" && (
              <>
                <p className="manage-page__modal-warn">
                  모임을 삭제하면 멤버, 가입 신청, 활동 내역을 복구할 수 없습니다.
                </p>
                <div className="manage-page__modal-actions">
                  <button
                    type="button"
                    className="manage-page__modal-btn manage-page__modal-btn--cancel"
                    onClick={() => setLeaveStep("choice")}
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    className="manage-page__modal-btn manage-page__modal-btn--leave"
                    onClick={handleDeleteFromLeaveModal}
                  >
                    모임 삭제
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
