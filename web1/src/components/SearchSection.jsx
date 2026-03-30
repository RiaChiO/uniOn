import { CLUB_TYPES, CATEGORIES } from "../data/mockData";

export default function SearchSection({ selectedType, selectedCategory, onTypeSelect, onCategorySelect }) {
  return (
    <section className="search-section" id="search">
      <div className="search-section__inner">
        <div className="search-section__header">
          <h2 className="search-section__title">모임 찾기</h2>
          <p className="search-section__subtitle">태그를 선택하여 원하는 모임을 찾아보세요</p>
        </div>
        <div className="filter-group">
          <h3 className="filter-group__title">모임 유형</h3>
          <div className="filter-group__options">
            {CLUB_TYPES.map((type) => (
              <button
                key={type.id}
                className={`filter-card ${selectedType === type.id ? "filter-card--active" : ""}`}
                onClick={() => onTypeSelect(selectedType === type.id ? null : type.id)}
              >
                <span className="filter-card__label">{type.label}</span>
                <span className="filter-card__desc">{type.description}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="filter-group">
          <h3 className="filter-group__title">관심 분야</h3>
          <div className="filter-group__categories">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`category-chip ${selectedCategory === cat.id ? "category-chip--active" : ""}`}
                onClick={() => onCategorySelect(selectedCategory === cat.id ? null : cat.id)}
              >
                <span className="category-chip__icon">{cat.icon}</span>
                <span className="category-chip__label">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
