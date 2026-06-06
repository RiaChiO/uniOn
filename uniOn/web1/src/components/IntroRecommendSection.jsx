// 📌 IntroRecommendSection - 자기소개서 기반 AI 추천 (데이터 모니터링 버전)
import { useState } from "react";

const MAX_LENGTH = 500;

// 데모용 목업 데이터 (백엔드 통신 실패 시 백업용)
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
  
  const [isLoading, setIsLoading] = useState(false);
  const [apiKeywords, setApiKeywords] = useState([]);
  const [apiRecommendations, setApiRecommendations] = useState([]);

  const handleFindMatch = async () => {
    if (!introText.trim() || isLoading) return;
    
    setIsLoading(true);
    setShowResults(false);

    console.log("================ 🚀 AI 추천 요청 시작 ================");
    console.log("입력된 자기소개 데이터:", introText);

    try {
      const response = await fetch("api/recommend/clubs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ introduction: introText }),
      });

      if (!response.ok) {
        throw new Error(`서버 에러 발생! 상태코드: ${response.status}`);
      }

      const data = await response.json();
      
      // 🔍 [확인 1] 백엔드에서 받아온 날 것 그대로의 원본 데이터 구조 확인
      console.log("📦 [1] 백엔드 수신 원본 데이터 (data):", data);

      const { user_extracted_keywords = [], recommended_meetings = [] } = data;

      // 🔍 [확인 2] 구조 분해 할당이 정상적으로 쪼개졌는지 확인
      console.log("🔑 [2] 추출된 관심 키워드 원본:", user_extracted_keywords);
      console.log("🤝 [3] 추천된 소모임 데이터 원본:", recommended_meetings);

      // 1) API 키워드 데이터 서식 포맷팅
      const formattedKeywords = user_extracted_keywords.map((kw) =>
        kw.startsWith("#") ? kw : `#${kw}`
      );
      
      // 🔍 [확인 3] 샵(#) 기호가 예쁘게 붙었는지 가공 결과 확인
      console.log("🎨 [4] #포맷팅 완료된 키워드:", formattedKeywords);

      // 2) API 소모임 목록 매칭 데이터를 UI 규격에 맞게 변환
      const formattedRecommendations = recommended_meetings.map((club, index) => ({
        rank: club.meeting_id, 
        displayRank: index + 1, 
        name: club.title,
        description: club.description,
        matchCount: club.match_score, 
        location: club.location || "미지정",
        categoryTag: club.tag_id,
      }));

      // 🔍 [확인 4] 컴포넌트 내부 State에 주입되기 직전의 최종 배열 상태 확인
      console.log("✨ [5] UI 규격으로 변환 완료된 소모임 리스트:", formattedRecommendations);

      if (formattedRecommendations.length > 0) {
        setApiKeywords(formattedKeywords);
        setApiRecommendations(formattedRecommendations);
        console.log("✅ 성공적으로 실제 서버 데이터를 화면에 반영했습니다.");
      } else {
        console.warn("⚠️ 추천 결과가 비어있어 목업 데이터로 대체합니다.");
        useMockFallback();
      }

    } catch (error) {
      console.error("❌ 백엔드 연결 실패 또는 AI 분석 에러 발생:", error.message);
      alert("서버 연결에 실패하여 데모 데이터를 표시합니다.");
      useMockFallback();
    } finally {
      setIsLoading(false);
      setShowResults(true);
      console.log("================ 🏁 AI 추천 프로세스 종료 ================");
    }
  };

  const useMockFallback = () => {
    console.log("📌 [Fallback] 미리 정의된 MOCK 데이터를 주입합니다.");
    setApiKeywords(MOCK_KEYWORDS);
    const mappedMocks = MOCK_RECOMMENDATIONS.map((mock) => ({
      ...mock,
      displayRank: mock.rank, 
    }));
    setApiRecommendations(mappedMocks);
    console.log("목업 데이터 변환 완료:", mappedMocks);
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
            disabled={isLoading}
          />

          <div className="intro-card__counter">
            {introText.length} / {MAX_LENGTH}자
          </div>

          <button
            type="button"
            className="intro-card__submit"
            onClick={handleFindMatch}
            disabled={!introText.trim() || isLoading}
          >
            <span aria-hidden="true">🎯</span>
            {isLoading ? "분석 중..." : "나의 맞춤 소모임 찾기"}
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
                {apiKeywords.map((kw) => (
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
                {apiRecommendations.map((club) => (
                  <article
                    key={club.rank}
                    className="intro-rec-item"
                    onClick={() => onDetailClick && onDetailClick(club.rank)}
                  >
                    <div className="intro-rec-item__top">
                      <h4 className="intro-rec-item__name">
                        {club.displayRank}. {club.name}
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