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
import { CLUB_TYPES, CATEGORIES } from "../data/mockData";

// 🔧 [기능] 정렬 옵션 - 필요 시 추가/수정
const SORT_OPTIONS = [
  { id: "newest", label: "최신순" },
  { id: "member", label: "멤버 많은순" },
];

// 🔧 [기능] 인원 필터 옵션
const MEMBER_OPTIONS = [
  { id: "all", label: "전체" },
  { id: "small", label: "10명 이하" },
  { id: "medium", label: "10-30명" },
  { id: "large", label: "30명 이상" },
];

export default function SearchPage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
  clubs = [],
  loading = false,
  error = "",
  onDetailClick,
}) {
  // 🔧 [기능] 필터 상태
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedMember, setSelectedMember] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // 타입 토글
  const toggleType = (id) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  // 카테고리 토글
  const toggleCategory = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const filteredClubs = useMemo(() => {
    const filtered = clubs.filter((club) => {
      const matchesSearch =
        !searchQuery ||
        club.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.description.includes(searchQuery) ||
        club.tags.some((tag) => tag.includes(searchQuery));

      const matchesType =
        selectedTypes.length === 0 || selectedTypes.includes(club.type);

      const matchesCategory =
        selectedCategories.length === 0 ||
        selectedCategories.includes(club.category);

      const matchesMember =
        selectedMember === "all" ||
        (selectedMember === "small" && club.memberCount <= 10) ||
        (selectedMember === "medium" &&
          club.memberCount > 10 &&
          club.memberCount <= 30) ||
        (selectedMember === "large" && club.memberCount > 30);

      return matchesSearch && matchesType && matchesCategory && matchesMember;
    });

    const extractNumericId = (id) => {
      const matched = String(id).match(/\d+/);
      return matched ? Number(matched[0]) : 0;
    };

    return [...filtered].sort((a, b) => {
      if (sortBy === "newest") {
        return extractNumericId(b.id) - extractNumericId(a.id);
      }

      if (sortBy === "member") {
        return b.memberCount - a.memberCount;
      }

      return 0;
    });
  }, [
    clubs,
    searchQuery,
    selectedTypes,
    selectedCategories,
    selectedMember,
    sortBy,
  ]);

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
        {/*
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
        */}

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
                <p className="search-results__count">
                  총 {filteredClubs.length}개의 모임
                </p>
              </div>
              <select
                className="search-results__sort"
                value={sortBy}
                // 🔧 [기능] 정렬 로직 연결
                onChange={(e) => setSortBy(e.target.value)}
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="search-results__empty">
                <p>모임 목록을 불러오는 중입니다.</p>
              </div>
            ) : error ? (
              <div className="search-results__empty">
                <p>{error}</p>
              </div>
            ) : filteredClubs.length === 0 ? (
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
