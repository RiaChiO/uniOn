import { useEffect, useMemo, useState } from "react";
import ClubCard from "./ClubCard";
import { scoreAndSortClubs } from "../lib/recommendationScoring";

export default function ClubListSection({
  clubs = [],
  limit = 6,
  loading = false,
  error = "",
  searchQuery,
  selectedType,
  selectedCategory,
  userVector = null,
  recommendationsByMeetingId = {},
  recommendationsLoading = false,
  onViewAll,
  onDetailClick,
}) {
  const [displayLimit, setDisplayLimit] = useState(limit);

  const filteredClubs = useMemo(() => {
    if (!Array.isArray(clubs)) {
      return [];
    }

    const matchedClubs = clubs.filter((club) => {
      const matchesSearch =
        !searchQuery ||
        club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.description.includes(searchQuery) ||
        club.tags.some((tag) => tag.includes(searchQuery));

      const matchesType = !selectedType || club.type === selectedType;

      const matchesCategory =
        !selectedCategory || club.category === selectedCategory;

      return matchesSearch && matchesType && matchesCategory;
    });

    return scoreAndSortClubs({
      clubs: matchedClubs,
      userVector,
      recommendationsByMeetingId,
      sortBy: "recommend",
    });
  }, [
    clubs,
    searchQuery,
    selectedType,
    selectedCategory,
    userVector,
    recommendationsByMeetingId,
  ]);
  const visibleClubs = filteredClubs.slice(0, displayLimit);
  const hiddenClubCount = Math.max(
    filteredClubs.length - visibleClubs.length,
    0,
  );
  const nextVisibleCount = Math.min(limit, hiddenClubCount);

  useEffect(() => {
    setDisplayLimit(limit);
  }, [limit, searchQuery, selectedType, selectedCategory]);

  return (
    <section className="club-list-section">
      <div className="club-list-section__inner">
        <div className="club-list-section__header">
          <div>
            <h2 className="club-list-section__title">인기 모임</h2>
            <p className="club-list-section__subtitle">
              추천 알고리즘이 맞춤 점수를 반영해 먼저 보여드려요
              {recommendationsLoading ? " · 계산 반영 중" : ""}
            </p>
          </div>
          <button className="btn btn--text" onClick={onViewAll}>
            전체보기 →
          </button>
        </div>
        {loading ? (
          <div className="club-list-section__empty">
            <p>모임 목록을 불러오는 중입니다.</p>
          </div>
        ) : error ? (
          <div className="club-list-section__empty">
            <p>{error}</p>
          </div>
        ) : filteredClubs.length === 0 ? (
          <div className="club-list-section__empty">
            <p>조건에 맞는 모임이 없습니다.</p>
          </div>
        ) : (
          <>
            <div className="club-list-section__grid">
              {visibleClubs.map((club) => (
                <ClubCard
                  key={club.id}
                  club={club}
                  onDetailClick={(id) => onDetailClick && onDetailClick(id)}
                />
              ))}
            </div>
            {hiddenClubCount > 0 && (
              <div className="club-list-section__more">
                <button
                  className="btn btn--primary"
                  onClick={() => setDisplayLimit((prev) => prev + limit)}
                >
                  {nextVisibleCount}개 더 보기
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
