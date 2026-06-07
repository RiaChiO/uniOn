// Role: submit intro text and render DB-backed recommendation results.
// Gemini parsing is intentionally isolated behind the backend API.

import { useState } from "react";
import { getIntroRecommendations } from "../api/introRecommendations";
import { mapMeetingToClub } from "../lib/meetingMapper";
import ClubCard from "./ClubCard";

const MAX_LENGTH = 500;

function mapIntroRecommendationToClub(meeting, index) {
  return {
    ...mapMeetingToClub(meeting),
    rank: index + 1,
    matchCount: meeting.matchCount ?? 0,
    matchScore: meeting.matchScore ?? 0,
    matchReason: meeting.matchReason ?? "",
    matchedKeywords: meeting.matchedKeywords ?? [],
    categoryTag: meeting.tagId ?? meeting.displayCategory ?? "",
  };
}

export default function IntroRecommendSection({ user, onDetailClick }) {
  const [introText, setIntroText] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleFindMatch = async () => {
    if (!introText.trim()) return;

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      setHasSearched(false);

      const result = await getIntroRecommendations({
        introText,
        userId: user?.userId ?? null,
        limit: 6,
      });
      setKeywords(result.keywords ?? []);
      setRecommendations(
        (result.recommendations ?? []).map(mapIntroRecommendationToClub)
      );
      setHasSearched(true);
    } catch (error) {
      setKeywords([]);
      setRecommendations([]);
      setErrorMessage(error.message);
      setHasSearched(true);
    } finally {
      setIsSubmitting(false);
    }
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
            aria-label="자기소개서 입력"
            maxLength={MAX_LENGTH}
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
            disabled={!introText.trim() || isSubmitting}
          >
            <span aria-hidden="true">🎯</span>
            {isSubmitting ? "자기소개를 바탕으로 어울리는 소모임을 찾는 중입니다..." : "나의 맞춤 소모임 찾기"}
          </button>
        </div>

        {errorMessage && (
          <div className="intro-result-card">
            <p className="form-field__error">{errorMessage}</p>
          </div>
        )}

        {hasSearched && !errorMessage && recommendations.length === 0 && (
          <div className="intro-result-card">
            <p className="intro-card__subtitle">
              조건에 맞는 추천 모임을 찾지 못했습니다.
            </p>
          </div>
        )}

        {(keywords.length > 0 || recommendations.length > 0) && (
          <>
            {/* 분석된 키워드 */}
            <div className="intro-result-card">
              <h3 className="intro-result-card__title">
                <span aria-hidden="true">🔍</span>
                분석된 상위 핵심 태그 키워드
              </h3>
              <div className="intro-keyword-list">
                {keywords.map((kw) => (
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

              <div className="intro-rec-grid">
                {recommendations.map((club) => (
                  <div key={club.id} className="intro-rec-card">
                    <div className="intro-rec-card__summary">
                      <span className="intro-rec-card__rank">
                        {club.rank}위 추천
                      </span>
                      <span className="intro-rec-item__meta-item">
                        <span aria-hidden="true">🏷️</span>
                        대표 분류 태그:
                        <span className="intro-rec-item__category">{club.categoryTag}</span>
                      </span>
                    </div>
                    <ClubCard club={club} onDetailClick={onDetailClick} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </section>
  );
}
