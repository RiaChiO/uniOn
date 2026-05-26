import { useEffect, useMemo, useState } from "react";
import ClubCard from "./ClubCard";

export default function ClubListSection({
  clubs = [],
  limit = 6,
  loading = false,
  error = "",
  searchQuery,
  selectedType,
  selectedCategory,
  onViewAll,
  onDetailClick,
}) {
  const [displayLimit, setDisplayLimit] = useState(limit);

  const filteredClubs = useMemo(() => {
    if (!Array.isArray(clubs)) {
      return [];
    }

    return clubs.filter((club) => {
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
  }, [clubs, searchQuery, selectedType, selectedCategory]);
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
            <h2 className="club-list-section__title">인기 소모임</h2>
            <p className="club-list-section__subtitle">
              지금 가장 활발하게 활동 중인 소모임을 먼저 보여드려요
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
            <p>조건에 맞는 소모임이 없습니다.</p>
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
