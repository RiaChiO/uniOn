// 📌 ProfileEditPage - 프로필 수정 + 관심 분야 설정

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  deleteUserAccount,
  getUserInterestVectors,
  updateUserInterestVector,
  updateUserProfile,
} from "../api/users";

const INTEREST_LABELS = {
  study: "학술/교육",
  exercise: "운동/스포츠",
  culture: "문화/취미",
  game: "게임/e스포츠",
  religion: "종교",
  volunteer: "봉사/사회",
};

// 시안 기본값 (피그마와 동일)
const DEFAULT_INTERESTS = {
  study: 5,
  exercise: 3,
  culture: 7,
  game: 4,
  religion: 2,
  volunteer: 6,
};

const INTEREST_KEYS = Object.keys(DEFAULT_INTERESTS);

function normalizeGrade(value) {
  const grade = String(value ?? "").trim();
  if (!grade) return "";
  return /^[1-4]$/.test(grade) ? `${grade}학년` : grade;
}

function normalizeInterestVector(vector) {
  return Object.fromEntries(
    INTEREST_KEYS.map((key) => {
      const score = Number(vector?.[key]);
      const normalizedScore = Number.isFinite(score)
        ? Math.min(10, Math.max(0, Math.round(score)))
        : DEFAULT_INTERESTS[key];

      return [key, normalizedScore];
    }),
  );
}

// 인라인 SVG 아이콘 (lucide-react 대체)
function IconX(props) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconUser(props) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconChevronDown(props) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconSave(props) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}

export default function ProfileEditPage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
  onUserUpdate,
  onAccountDeleted,
}) {
  const navigate = useNavigate();
  const currentUserId = user?.userId ?? user?.id;

  const [name, setName] = useState(user?.name ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [grade, setGrade] = useState(normalizeGrade(user?.grade));
  const [savingProfile, setSavingProfile] = useState(false);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [initialInterests, setInitialInterests] = useState(DEFAULT_INTERESTS);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  // 슬라이더 시각적 상태 (0~10)
  const [interests, setInterests] = useState(DEFAULT_INTERESTS);

  useEffect(() => {
    if (!currentUserId) {
      setName("");
      setDepartment("");
      setGrade("");
      return;
    }

    setName(user?.name ?? "");
    setDepartment(user?.department ?? "");
    setGrade(normalizeGrade(user?.grade));
    setProfileError("");
  }, [currentUserId, user?.name, user?.department, user?.grade]);

  useEffect(() => {
    if (!currentUserId) {
      setInterests(DEFAULT_INTERESTS);
      setInitialInterests(DEFAULT_INTERESTS);
      return;
    }

    let cancelled = false;

    async function loadInterests() {
      try {
        setLoadingInterests(true);
        const vector = await getUserInterestVectors(currentUserId);

        if (cancelled || !vector) return;

        const normalizedVector = normalizeInterestVector(vector);
        setInterests(normalizedVector);
        setInitialInterests(normalizedVector);
      } catch (error) {
        if (!cancelled) {
          setProfileError(error.message);
        }
      } finally {
        if (!cancelled) {
          setLoadingInterests(false);
        }
      }
    }

    loadInterests();

    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const handleInterestChange = (field, value) => {
    setInterests((prev) => ({ ...prev, [field]: Number(value) }));
  };

  const hasInterestChanges = INTEREST_KEYS.some(
    (key) => interests[key] !== initialInterests[key],
  );

  async function handleSaveProfile() {
    if (!currentUserId) {
      window.alert("로그인 후 프로필을 수정할 수 있습니다.");
      return;
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      setProfileError("이름은 필수입니다.");
      return;
    }

    if (!window.confirm("프로필과 관심 분야 설정을 저장하시겠습니까?")) {
      return;
    }

    try {
      setSavingProfile(true);
      setProfileError("");
      const data = await updateUserProfile(currentUserId, {
        name: trimmedName,
        department: department.trim(),
        grade,
      });

      if (hasInterestChanges) {
        const vectorData = await updateUserInterestVector(currentUserId, interests);
        const savedVector = normalizeInterestVector(vectorData.vector);
        setInterests(savedVector);
        setInitialInterests(savedVector);
      }

      const profile = data.user;
      onUserUpdate?.({
        id: profile.userId,
        userId: profile.userId,
        name: profile.name,
        email: profile.email,
        department: profile.department,
        grade: profile.grade,
        createdAt: profile.createdAt,
      });
      navigate("/mypage");
    } catch (error) {
      setProfileError(error.message);
    } finally {
      setSavingProfile(false);
    }
  }

  function closeDeleteModal() {
    if (deletingAccount) return;
    setShowDeleteModal(false);
    setDeleteError("");
  }

  async function handleDeleteAccount() {
    if (!currentUserId) return;

    try {
      setDeletingAccount(true);
      setDeleteError("");
      await deleteUserAccount(currentUserId);
      await onAccountDeleted?.();
    } catch (error) {
      setDeleteError(error.message || "회원 탈퇴 중 오류가 발생했습니다.");
    } finally {
      setDeletingAccount(false);
    }
  }

  return (
    <div className="profile-edit-page">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={onLoginClick}
      />

      <main className="profile-edit-page__main">
        <div className="profile-edit-page__inner">
          {/* 상단 헤더 */}
          <div className="profile-edit-page__header">
            <h1 className="profile-edit-page__title">프로필 수정</h1>
            <button
              type="button"
              className="profile-edit-page__close"
              aria-label="닫기"
              onClick={() => navigate("/mypage")}
            >
              <IconX />
            </button>
          </div>

          {/* 프로필 카드 */}
          <div className="profile-edit-card">
            <div className="profile-edit-card__avatar-wrap">
              <div className="profile-edit-card__avatar">
                <IconUser stroke="#ffffff" />
              </div>
            </div>

            <div className="profile-edit-card__form">
              <div className="form-field">
                <label className="form-field__label">이름</label>
                <input
                  className="form-field__input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력하세요"
                />
              </div>

              <div className="form-field">
                <label className="form-field__label">학과</label>
                <input
                  className="form-field__input"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="학과를 입력하세요"
                />
              </div>

              <div className="form-field">
                <label className="form-field__label">학년</label>
                <div className="profile-edit-card__select-wrap">
                  <select
                    className="form-field__input form-field__select profile-edit-card__select"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  >
                    <option value="">학년을 선택하세요</option>
                    <option value="1학년">1학년</option>
                    <option value="2학년">2학년</option>
                    <option value="3학년">3학년</option>
                    <option value="4학년">4학년</option>
                  </select>
                </div>
              </div>
            </div>
            {profileError && (
              <p className="form-field__error">{profileError}</p>
            )}
          </div>

          {/* 관심 분야 설정 카드 */}
          <div className="recommend-pref-card">
            <div className="recommend-pref-card__header">
              <h2 className="recommend-pref-card__title">관심 분야 설정</h2>
              <p className="recommend-pref-card__subtitle">
                각 분야별 관심도를 조절하여 맞춤 추천을 받아보세요 (0-10)
              </p>
            </div>

            <div className="recommend-pref-card__list">
              {loadingInterests && (
                <p className="form-field__hint">관심도 정보를 불러오는 중입니다.</p>
              )}
              {Object.entries(INTEREST_LABELS).map(([field, label]) => {
                const value = interests[field];
                return (
                  <div key={field} className="recommend-pref-item">
                    <div className="recommend-pref-item__header">
                      <span className="recommend-pref-item__label">
                        {label}
                      </span>
                      <span className="recommend-pref-item__value">
                        {value}
                      </span>
                    </div>
                    <div className="recommend-pref-item__track-wrap">
                      <div className="recommend-pref-item__track-bg" />
                      <div
                        className="recommend-pref-item__track-fill"
                        style={{ width: `${value * 10}%` }}
                      />
                      <input
                        className="recommend-pref-item__range"
                        type="range"
                        min="0"
                        max="10"
                        step="1"
                        value={value}
                        onChange={(e) =>
                          handleInterestChange(field, e.target.value)
                        }
                      />
                    </div>
                    <div className="recommend-pref-item__scale">
                      <span>0</span>
                      <span>10</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="profile-edit-page__actions">
            <button
              type="button"
              className="btn-action btn-action--cancel"
              onClick={() => navigate("/mypage")}
            >
              취소
            </button>
            <button
              type="button"
              className="btn-action btn-action--save"
              disabled={savingProfile}
              onClick={handleSaveProfile}
            >
              <IconSave />
              {savingProfile ? "저장 중..." : "저장하기"}
            </button>
          </div>

          <section className="profile-edit-page__danger">
            <div>
              <h2 className="profile-edit-page__danger-title">회원 탈퇴</h2>
              <p className="profile-edit-page__danger-description">
                프로필과 관심 정보, 참여 기록이 삭제되며 복구할 수 없습니다.
              </p>
            </div>
            <button
              type="button"
              className="profile-edit-page__delete-btn"
              onClick={() => {
                setDeleteError("");
                setShowDeleteModal(true);
              }}
            >
              탈퇴하기
            </button>
          </section>
        </div>
      </main>

      <Footer />

      {showDeleteModal && (
        <div
          className="manage-page__modal-overlay"
          role="presentation"
          onClick={closeDeleteModal}
        >
          <div
            className="manage-page__modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-delete-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="manage-page__modal-close"
              aria-label="닫기"
              disabled={deletingAccount}
              onClick={closeDeleteModal}
            >
              <IconX />
            </button>

            <div className="profile-edit-page__delete-icon" aria-hidden="true">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v5M14 11v5" />
              </svg>
            </div>
            <h2
              id="profile-delete-modal-title"
              className="manage-page__modal-title"
            >
              정말 탈퇴하시겠습니까?
            </h2>
            <p className="manage-page__modal-warn">
              회원 정보와 관심 데이터, 참여 기록이 영구 삭제됩니다. 운영 중인
              모임이 있다면 리더 위임 또는 모임 삭제 후 탈퇴할 수 있습니다.
            </p>

            {deleteError && (
              <p className="manage-page__modal-error">{deleteError}</p>
            )}

            <div className="manage-page__modal-actions">
              <button
                type="button"
                className="manage-page__modal-btn manage-page__modal-btn--cancel"
                disabled={deletingAccount}
                onClick={closeDeleteModal}
              >
                취소
              </button>
              <button
                type="button"
                className="manage-page__modal-btn manage-page__modal-btn--leave"
                disabled={deletingAccount}
                onClick={handleDeleteAccount}
              >
                {deletingAccount ? "탈퇴 처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
