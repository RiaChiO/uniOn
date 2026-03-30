// 📌 SearchPage - 소모임 검색 화면
// 🔧 [기능 포인트]
//   - onFilterApply  : 필터 적용 버튼 클릭 → 필터링 API 또는 클라이언트 로직 연결
//   - onFilterReset  : 초기화 버튼 클릭 → 필터 상태 초기화
//   - onSortChange   : 정렬 드롭다운 변경 → 정렬 로직 연결
//   - onDetailClick  : 카드 클릭 → 소모임 상세 페이지 이동
//   - clubs          : 현재 mockData 사용 → API 응답으로 교체

import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import ClubCard from "../components/ClubCard";
import Footer from "../components/Footer";
import { CLUBS, CLUB_TYPES, CATEGORIES } from "../data/mockData";

// 🔧 [기능] 정렬 옵션 - 필요 시 추가/수정
const SORT_OPTIONS = [
  { id: "popular", label: "인기순" },
  { id: "newest",  label: "최신순" },
  { id: "member",  label: "멤버 많은순" },
];

// 🔧 [기능] 인원 필터 옵션
const MEMBER_OPTIONS = [
  { id: "all",    label: "전체" },
  { id: "small",  label: "10명 이하" },
  { id: "medium", label: "10-30명" },
  { id: "large",  label: "30명 이상" },
];

export default function SearchPage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
  onDetailClick,
}) {
  // 🔧 [기능] 필터 상태
  const [selectedTypes,      setSelectedTypes]      = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedMember,     setSelectedMember]     = useState("all");
  const [sortBy,             setSortBy]             = useState("popular");

  // 타입 토글
  const toggleType = (id) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  // 카테고리 토글
  const toggleCategory = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  // 🔧 [기능] 클라이언트 필터링 → API 연동 시 useEffect + fetch로 교체
  const filteredClubs = useMemo(() => {
    return CLUBS.filter((club) => {
      const matchesSearch =
        !searchQuery ||
        club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.tags.some((tag) => tag.includes(searchQuery));

      const matchesType =
        selectedTypes.length === 0 || selectedTypes.includes(club.type);

      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(club.category);

      const matchesMember =
        selectedMember === "all" ||
        (selectedMember === "small"  && club.memberCount <= 10) ||
        (selectedMember === "medium" && club.memberCount > 10 && club.memberCount <= 30) ||
        (selectedMember === "large"  && club.memberCount > 30);

      return matchesSearch && matchesType && matchesCategory && matchesMember;
    });
  }, [searchQuery, selectedTypes, selectedCategories, selectedMember]);

  return (
    <div className="search-page">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={onLoginClick}
      />

      <main className="search-page__main">

        {/* 검색 헤더 */}
        <div className="search-page__header">
          <div className="search-page__header-inner">
            <div className="search-page__search-bar">
              <span className="search-page__search-icon">🔍</span>
              <input
                className="search-page__search-input"
                type="text"
                placeholder="모임 이름, 태그로 검색"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="search-page__body">

          {/* 사이드바 필터 */}
          <aside className="search-filter">

            <div className="search-filter__header">
              <span className="search-filter__title">🔧 필터</span>
              <button
                className="search-filter__reset"
                // 🔧 [기능] 필터 초기화
                onClick={() => {
                  setSelectedTypes([]);
                  setSelectedCategories([]);
                  setSelectedMember("all");
                }}
              >
                초기화
              </button>
            </div>

            {/* 모임 유형 */}
            <div className="search-filter__group">
              <h4 className="search-filter__group-title">모임 유형</h4>
              {CLUB_TYPES.map((type) => (
                <label key={type.id} className="search-filter__check-label">
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type.id)}
                    onChange={() => toggleType(type.id)}
                  />
                  {type.label}
                </label>
              ))}
            </div>

            {/* 관심 분야 */}
            <div className="search-filter__group">
              <h4 className="search-filter__group-title">관심 분야</h4>
              {CATEGORIES.map((cat) => (
                <label key={cat.id} className="search-filter__check-label">
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => toggleCategory(cat.id)}
                  />
                  {cat.icon} {cat.label}
                </label>
              ))}
            </div>

            {/* 인원 */}
            <div className="search-filter__group">
              <h4 className="search-filter__group-title">인원</h4>
              {MEMBER_OPTIONS.map((opt) => (
                <label key={opt.id} className="search-filter__check-label">
                  <input
                    type="radio"
                    name="memberFilter"
                    checked={selectedMember === opt.id}
                    onChange={() => setSelectedMember(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <button
              className="btn btn--primary search-filter__apply"
              // 🔧 [기능] API 연동 시 여기서 fetch 호출
              onClick={() => console.log("TODO: 필터 적용")}
            >
              필터 적용
            </button>

          </aside>

          {/* 검색 결과 */}
          <div className="search-results">
            <div className="search-results__header">
              <div>
                <h2 className="search-results__title">검색 결과</h2>
                <p className="search-results__count">총 {filteredClubs.length}개의 모임</p>
              </div>
              <select
                className="search-results__sort"
                value={sortBy}
                // 🔧 [기능] 정렬 로직 연결
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>

            {filteredClubs.length === 0 ? (
              <div className="search-results__empty">
                <p>검색 결과가 없습니다.</p>
              </div>
            ) : (
              <div className="search-results__grid">
                {filteredClubs.map((club) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    // 🔧 [기능] 상세 페이지 이동
                    onDetailClick={(id) => onDetailClick && onDetailClick(id)}
                  />
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
