import { useMemo } from "react";
import { CLUBS } from "../data/mockData";
import ClubCard from "./ClubCard";

export default function ClubListSection({ searchQuery, selectedType, selectedCategory, onViewAll }) {
  const filteredClubs = useMemo(() => {
    return CLUBS.filter((club) => {
      const matchesSearch =
        !searchQuery ||
        club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.description.includes(searchQuery) ||
        club.tags.some((tag) => tag.includes(searchQuery));
      const matchesType     = !selectedType     || club.type     === selectedType;
      const matchesCategory = !selectedCategory || club.category === selectedCategory;
      return matchesSearch && matchesType && matchesCategory;
    });
  }, [searchQuery, selectedType, selectedCategory]);

  return (
    <section className="club-list-section">
      <div className="club-list-section__inner">
        <div className="club-list-section__header">
          <div>
            <h2 className="club-list-section__title">인기 소모임</h2>
            <p className="club-list-section__subtitle">지금 가장 활발하게 활동 중인 소모임들이에요</p>
          </div>
          <button className="btn btn--text" onClick={onViewAll}>전체보기 →</button>
        </div>
        {filteredClubs.length === 0 ? (
          <div className="club-list-section__empty">
            <p>조건에 맞는 소모임이 없습니다.</p>
          </div>
        ) : (
          <div className="club-list-section__grid">
            {filteredClubs.map((club) => (
              <ClubCard
                key={club.id}
                club={club}
                onDetailClick={(id) => console.log(`TODO: 소모임 ${id} 상세 페이지 이동`)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
