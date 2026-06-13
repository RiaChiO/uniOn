// 📌 SearchDropdown - 네비바 검색바 드롭다운 자동완성
// 🔧 [동작]
//   - 검색어 입력 시 clubs 리스트에서 클라이언트 필터링 (name·description·tags·category)
//   - 모임 이미지 + 제목(검색어 하이라이트) + 카테고리/멤버수 표시
//   - 상위 5개 + "전체 결과 보기" 푸터
//   - 외부 클릭 / ESC 키로 닫힘
//   - 새 API 없이 기존 clubs 데이터 재사용

import { useEffect, useMemo, useRef } from "react";

const CATEGORY_FALLBACK = {
  culture: { emoji: "🎨", gradient: "linear-gradient(135deg, #FBBF24, #F59E0B)" },
  study: { emoji: "📚", gradient: "linear-gradient(135deg, #60A5FA, #3B82F6)" },
  sport: { emoji: "⚽", gradient: "linear-gradient(135deg, #34D399, #10B981)" },
  exercise: { emoji: "💪", gradient: "linear-gradient(135deg, #34D399, #10B981)" },
  hobby: { emoji: "🎮", gradient: "linear-gradient(135deg, #A78BFA, #7C3AED)" },
  food: { emoji: "🍽️", gradient: "linear-gradient(135deg, #F87171, #EF4444)" },
  travel: { emoji: "✈️", gradient: "linear-gradient(135deg, #60A5FA, #2563EB)" },
  default: { emoji: "🎯", gradient: "linear-gradient(135deg, #A78BFA, #7C3AED)" },
};

function getFallback(club) {
  return (
    CATEGORY_FALLBACK[club.category] ||
    CATEGORY_FALLBACK[club.algorithmCategory] ||
    CATEGORY_FALLBACK.default
  );
}

function highlightMatch(text, query) {
  if (!text || !query) return text;
  const idx = String(text).toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="search-dropdown__highlight">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchDropdown({
  searchQuery,
  clubs = [],
  onClose,
  onSelectClub,
  onViewAll,
}) {
  const containerRef = useRef(null);

  const q = (searchQuery ?? "").trim();
  const isOpen = q.length > 0;

  const matches = useMemo(() => {
    if (!isOpen) return [];
    const ql = q.toLowerCase();
    return clubs.filter(
      (club) =>
        club.name?.toLowerCase().includes(ql) ||
        club.description?.includes(q) ||
        club.tags?.some((tag) => tag.includes(q)) ||
        club.categoryLabel?.includes(q),
    );
  }, [clubs, q, isOpen]);

  const topMatches = matches.slice(0, 5);
  const totalCount = matches.length;

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.();
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={containerRef} className="search-dropdown" role="listbox">
      {topMatches.length > 0 ? (
        <>
          <div className="search-dropdown__header">
            모임 {totalCount}개 발견
            {totalCount > topMatches.length && (
              <span className="search-dropdown__header-more">
                (상위 {topMatches.length}개 표시)
              </span>
            )}
          </div>

          {topMatches.map((club) => {
            const fb = getFallback(club);
            return (
              <button
                key={club.id}
                type="button"
                className="search-dropdown__item"
                onClick={() => {
                  onSelectClub?.(club.id);
                  onClose?.();
                }}
              >
                <div
                  className="search-dropdown__thumb"
                  style={{ background: fb.gradient }}
                >
                  {club.imageUrl ? (
                    <img
                      src={club.imageUrl}
                      alt=""
                      className="search-dropdown__thumb-img"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="search-dropdown__thumb-emoji">
                      {fb.emoji}
                    </span>
                  )}
                </div>
                <div className="search-dropdown__body">
                  <div className="search-dropdown__title">
                    {highlightMatch(club.name, q)}
                  </div>
                  <div className="search-dropdown__meta">
                    {club.categoryLabel && (
                      <span className="search-dropdown__badge">
                        {club.categoryLabel}
                      </span>
                    )}
                    <span className="search-dropdown__meta-text">
                      👥 {club.memberCount ?? 0}명
                      {club.meetingTime ? ` · ${club.meetingTime}` : ""}
                    </span>
                  </div>
                </div>
                <span className="search-dropdown__arrow" aria-hidden="true">→</span>
              </button>
            );
          })}

          <button
            type="button"
            className="search-dropdown__footer"
            onClick={() => {
              onViewAll?.(q);
              onClose?.();
            }}
          >
            🔍 "{q}" 전체 결과 보기
            <span aria-hidden="true">→</span>
          </button>
        </>
      ) : (
        <div className="search-dropdown__empty">
          <div className="search-dropdown__empty-icon">🔍</div>
          <div className="search-dropdown__empty-title">
            "{q}"에 해당하는 모임이 없어요
          </div>
          <div className="search-dropdown__empty-sub">
            새로운 모임을 직접 만들어보는 건 어때요?
          </div>
        </div>
      )}
    </div>
  );
}
