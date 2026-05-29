// 📌 RecommendationPreferencePage - 관심 분야 설정 페이지 (UI 전용 / 피그마 시안 반영)
// 🔧 [디자인 담당이 추후 기능 연결 예정]
//   - 6분야(study, exercise, culture, game, religion, volunteer) 0~10 막대바
//   - .recommend-pref-item__fill 의 width(%) 를 슬라이더 값에 맞게 갱신하면 트랙이 채워짐
//   - 저장/취소 동작은 별도 연결

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";

const PREFERENCE_FIELDS = [
  { key: "study",     label: "학술/교육" },
  { key: "exercise",  label: "운동/스포츠" },
  { key: "culture",   label: "문화/취미" },
  { key: "game",      label: "게임/e스포츠" },
  { key: "religion",  label: "종교" },
  { key: "volunteer", label: "봉사/사회" },
];

export default function RecommendationPreferencePage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
}) {
  const navigate = useNavigate();

  function handleSaveClick() {
    if (
      window.confirm(
        "관심 분야 설정은 프로필 수정 페이지에서 저장됩니다. 프로필 수정 페이지로 이동하시겠습니까?",
      )
    ) {
      navigate("/mypage/edit");
    }
  }

  return (
    <div className="recommend-pref-page">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={onLoginClick}
      />

      <main className="recommend-pref-page__main">
        <div className="recommend-pref-page__inner">

          {/* 메인 카드 */}
          <div className="recommend-pref-card">
            <div className="recommend-pref-card__header">
              <h1 className="recommend-pref-card__title">관심 분야 설정</h1>
              <p className="recommend-pref-card__subtitle">
                각 분야별 관심도를 조절하여 맞춤 추천을 받아보세요 (0-10)
              </p>
            </div>

            <div className="recommend-pref-card__list">
              {PREFERENCE_FIELDS.map((field) => (
                <div key={field.key} className="recommend-pref-item">

                  <div className="recommend-pref-item__header">
                    <span className="recommend-pref-item__label">
                      {field.label}
                    </span>
                    <span className="recommend-pref-item__value">0</span>
                  </div>

                  {/* 트랙 (배경 + 채움 + 슬라이더) */}
                  <div className="recommend-pref-item__track-wrap">
                    <div className="recommend-pref-item__track-bg" />
                    <div
                      className="recommend-pref-item__track-fill"
                      style={{ width: "0%" }}
                    />
                    <input
                      className="recommend-pref-item__range"
                      type="range"
                      min="0"
                      max="10"
                      step="1"
                      defaultValue="0"
                    />
                  </div>

                  {/* 양 끝 눈금 (0, 10) */}
                  <div className="recommend-pref-item__scale">
                    <span>0</span>
                    <span>10</span>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* 액션 버튼 (기능 없음 - UI만) */}
          <div className="recommend-pref-page__actions">
            <button className="btn-action btn-action--cancel">취소</button>
            <button className="btn-action btn-action--save" onClick={handleSaveClick}>
              <span className="btn-action__icon" aria-hidden="true">💾</span>
              저장하기
            </button>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
