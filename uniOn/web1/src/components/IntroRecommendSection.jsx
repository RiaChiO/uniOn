// 📌 IntroRecommendSection - 자기소개서 기반 AI 추천 (UI 전용)
// 🔧 [디자인 담당 - 기능은 백엔드/AI 담당이 추후 연결]
//   - 자기소개서 textarea 는 useState 로 입력 표시만 (실제 Gemini 호출 없음)
//   - "나의 맞춤 소모임 찾기" 버튼 누르면 시각적으로 결과 영역 표시 (목업 데이터)
//   - 키워드 추출(Gemini API)/매칭 알고리즘은 백엔드 담당이 별도 연결
//   - MOCK_KEYWORDS, MOCK_RECOMMENDATIONS 는 디자인 미리보기용 — 실제로는 API 응답으로 교체

import { useState } from "react";

const MAX_LENGTH = 500;

// 데모용 목업 데이터 (UI 미리보기용)
const MOCK_KEYWORDS = ["#게임"];

const MOCK_RECOMMENDATIONS = [
  {
    rank: 1,
    name: "롤 내전 스쿼드",
    description: "실력보다 매너를 우선으로 하는 리그 오브 레전드 내전 모임입니다. 주 1회 팀을 나눠 진행합니다.",
    matchCount: 100,
    location: "미지정",
    categoryTag: "game",
  },
  {
    rank: 2,
    name: "신입생 환영 보드게임 밤",
    description: "처음 만나는 학생들도 부담 없이 참여할 수 있도록 쉬운 보드게임 위주로 진행하는 저녁 모임입니다.",
    matchCount: 95,
    location: "미지정",
    categoryTag: "culture",
  },
  {
    rank: 3,
    name: "경상바둑회(돌밭)",
    description: "문화분과 관련 활동 - 위치: 학생회관(513호)",
    matchCount: 90,
    location: "미지정",
    categoryTag: "culture",
  },
];

export default function IntroRecommendSection({ onDetailClick }) {
  const [introText, setIntroText] = useState("");
  const [showResults, setShowResults] = useState(false);

  const handleFindMatch = () => {
    if (!introText.trim()) return;
    // 🔧 [기능] 여기에 Gemini API 호출 + 매칭 로직 연결 예정
    setShowResults(true);
  };

  const handleTextChange = (e) => {
    setIntroText(e.target.value.slice(0, MAX_LENGTH));
  };

  return (
    <section className="intro-recommend">
      <div className="intro-recommend__inner">

        {/* 자기소개서 입력 카드 */}
        <div className="intro-card">
          <div className="intro-card__header">
            <h2 className="intro-card__title">
              <span className="intro-card__icon" aria-hidden="true">✏️</span>
              Gemini 기반 자기소개서 핵심 키워드 매칭
            </h2>
            <p className="intro-card__subtitle">
              나의 관심사, 전공 역량 또는 소모임에서 함께 즐기고 싶은 활동 성향을 자유롭게 줄글로 기재하세요.
            </p>
          </div>

          <textarea
            className="intro-card__textarea"
            value={introText}
            onChange={handleTextChange}
            placeholder="예: 다른 사람들과 게임을 하고 싶어요"
            rows={5}
          />

          <div className="intro-card__counter">
            {introText.length} / {MAX_LENGTH}자
          </div>

          <button
            type="button"
            className="intro-card__submit"
            onClick={handleFindMatch}
            disabled={!introText.trim()}
          >
            <span aria-hidden="true">🎯</span>
            나의 맞춤 소모임 찾기
          </button>
        </div>

        {/* 결과 영역 — 버튼 클릭 후 표시 */}
        {showResults && (
          <>
            {/* 분석된 키워드 */}
            <div className="intro-result-card">
              <h3 className="intro-result-card__title">
                <span aria-hidden="true">🔍</span>
                분석된 상위 핵심 태그 키워드
              </h3>
              <div className="intro-keyword-list">
                {MOCK_KEYWORDS.map((kw) => (
                  <span key={kw} className="intro-keyword">{kw}</span>
                ))}
              </div>
            </div>

            {/* 추천 소모임 목록 */}
            <div className="intro-result-card">
              <h3 className="intro-result-card__title">
                <span aria-hidden="true">🏆</span>
                추천 매칭된 소모임 목록
              </h3>

              <div className="intro-rec-list">
                {MOCK_RECOMMENDATIONS.map((club) => (
                  <article
                    key={club.rank}
                    className="intro-rec-item"
                    onClick={() => onDetailClick && onDetailClick(club.rank)}
                  >
                    <div className="intro-rec-item__top">
                      <h4 className="intro-rec-item__name">
                        {club.rank}. {club.name}
                      </h4>
                      <span className="intro-rec-item__match">
                        <span aria-hidden="true">🍅</span>
                        일치 단어 수: {club.matchCount}개
                      </span>
                    </div>

                    <p className="intro-rec-item__desc">{club.description}</p>

                    <div className="intro-rec-item__meta">
                      <span className="intro-rec-item__meta-item">
                        <span aria-hidden="true">📍</span>
                        위치: {club.location}
                      </span>
                      <span className="intro-rec-item__meta-item">
                        <span aria-hidden="true">🏷</span>
                        대표 분류 태그:
                        <span className="intro-rec-item__category">{club.categoryTag}</span>
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </section>
  );
}
