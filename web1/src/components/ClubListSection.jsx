import { useMemo } from "react";
import ClubCard from "./ClubCard";

export default function ClubListSection({
  clubs = [],
  loading = false,
  error = "",
  searchQuery,
  selectedType,
  selectedCategory,
  onViewAll,
  onDetailClick,
}) {
  const filteredClubs = useMemo(() => {
    return clubs.filter((club) => {
      const matchesSearch =
        !searchQuery ||
        club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.description.includes(searchQuery) ||
        club.tags.some((tag) => tag.includes(searchQuery));

      const matchesType = !selectedType || club.type === selectedType;

      const matchesCategory =
        !selectedCategory || club.categoryLabel === selectedCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [clubs, searchQuery, selectedType, selectedCategory]);

  return (
    <section className="club-list-section">
      <div className="club-list-section__inner">
        <div className="club-list-section__header">
          <div>
            <h2 className="club-list-section__title">인기 소모임</h2>
            <p className="club-list-section__subtitle">
              지금 가장 활발하게 활동 중인 소모임들이에요
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
          <div className="club-list-section__grid">
            {filteredClubs.map((club) => (
              <ClubCard
                key={club.id}
                club={club}
                onDetailClick={(id) => onDetailClick && onDetailClick(id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
