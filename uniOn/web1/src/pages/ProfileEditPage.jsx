// 📌 ProfileEditPage - 프로필 수정 + 관심 분야 설정 (UI 전용 / Figma 시안)
// 🔧 [디자인 담당이 추후 기능 연결 예정]
//   - 슬라이더 useState 는 시각적 표시(채움 너비 + 값)를 위한 UI 상태일 뿐, 저장 로직 없음
//   - 취소/저장하기 클릭 시 /mypage 로 단순 이동만 함 (실제 저장 API 는 별도 연결)
//   - 우측 상단 X 클릭 시에도 /mypage 로 이동

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const INTEREST_LABELS = {
  study:     "학술/교육",
  exercise:  "운동/스포츠",
  culture:   "문화/예술",
  game:      "게임/오락",
  religion:  "종교/봉사",
  volunteer: "자원봉사",
};

// 시안 기본값 (피그마와 동일)
const DEFAULT_INTERESTS = {
  study:     5,
  exercise:  3,
  culture:   7,
  game:      4,
  religion:  2,
  volunteer: 6,
};

// 인라인 SVG 아이콘 (lucide-react 대체)
function IconX(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconUser(props) {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconChevronDown(props) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" {...props}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconSave(props) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" {...props}>
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
}) {
  const navigate = useNavigate();

  // 슬라이더 시각적 상태 (0~10)
  const [interests, setInterests] = useState(DEFAULT_INTERESTS);

  const handleInterestChange = (field, value) => {
    setInterests((prev) => ({ ...prev, [field]: Number(value) }));
  };

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
                  defaultValue="김경상"
                  placeholder="이름을 입력하세요"
                />
              </div>

              <div className="form-field">
                <label className="form-field__label">학과</label>
                <input
                  className="form-field__input"
                  type="text"
                  defaultValue="컴퓨터과학과"
                  placeholder="학과를 입력하세요"
                />
              </div>

              <div className="form-field">
                <label className="form-field__label">학년</label>
                <div className="profile-edit-card__select-wrap">
                  <select
                    className="form-field__input form-field__select profile-edit-card__select"
                    defaultValue="3"
                  >
                    <option value="1">1학년</option>
                    <option value="2">2학년</option>
                    <option value="3">3학년</option>
                    <option value="4">4학년</option>
                  </select>
                  <span className="profile-edit-card__select-icon">
                    <IconChevronDown />
                  </span>
                </div>
              </div>

            </div>
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
              {Object.entries(INTEREST_LABELS).map(([field, label]) => {
                const value = interests[field];
                return (
                  <div key={field} className="recommend-pref-item">
                    <div className="recommend-pref-item__header">
                      <span className="recommend-pref-item__label">{label}</span>
                      <span className="recommend-pref-item__value">{value}</span>
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
                        onChange={(e) => handleInterestChange(field, e.target.value)}
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
              onClick={() => navigate("/mypage")}
            >
              <IconSave />
              저장하기
            </button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
