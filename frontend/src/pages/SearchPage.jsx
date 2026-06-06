import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import ClubCard from "../components/ClubCard";
import Footer from "../components/Footer";
import { CATEGORY_OPTIONS } from "../data/categoryOptions";
import { scoreAndSortClubs } from "../lib/recommendationScoring";

const SORT_OPTIONS = [
  { id: "recommend", label: "추천순 ✨" },
  { id: "newest", label: "최신순" },
  { id: "member", label: "멤버 많은순" },
];

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
  meetingTypes = [],
  meetingTypesLoading = false,
  loading = false,
  onDetailClick,
  recommendationsByMeetingId = {},
  userVector = null,
  recommendationsLoading = false,
  recommendationsError = "",
}) {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedMember, setSelectedMember] = useState("all");
  const [sortBy, setSortBy] = useState("recommend");

  const toggleType = (id) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const toggleCategory = (id) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const selectMemberFilter = (id) => {
    setSelectedMember(id);
  };

  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedCategories([]);
    setSelectedMember("all");
  };

  const filteredClubs = useMemo(() => {
    if (!clubs || !Array.isArray(clubs)) return [];

    const filtered = clubs.filter((club) => {
      const matchesSearch =
        !searchQuery ||
        club.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.description?.includes(searchQuery) ||
        club.tags?.some((tag) => tag.includes(searchQuery));
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

    return scoreAndSortClubs({
      clubs: filtered,
      userVector,
      recommendationsByMeetingId,
      sortBy,
    });
  }, [
    clubs,
    searchQuery,
    selectedTypes,
    selectedCategories,
    selectedMember,
    sortBy,
    userVector,
    recommendationsByMeetingId,
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
        <div className="search-page__body">
          <aside className="search-filter">
            <div className="search-filter__header">
              <span className="search-filter__title">🔧 필터</span>
              <button className="search-filter__reset" onClick={resetFilters}>
                초기화
              </button>
            </div>
            <div className="search-filter__group">
              <h4 className="search-filter__group-title">모임 유형</h4>
              {meetingTypesLoading ? (
                <p>로딩 중...</p>
              ) : (
                meetingTypes.map((type) => (
                  <label key={type.id} className="search-filter__check-label">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.id)}
                      onChange={() => toggleType(type.id)}
                    />
                    {type.label}
                  </label>
                ))
              )}
            </div>
            <div className="search-filter__group">
              <h4 className="search-filter__group-title">카테고리</h4>
              {CATEGORY_OPTIONS.map((cat) => (
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
            <div className="search-filter__group">
              <h4 className="search-filter__group-title">인원</h4>
              {MEMBER_OPTIONS.map((opt) => (
                <label key={opt.id} className="search-filter__check-label">
                  <input
                    type="radio"
                    name="memberFilter"
                    checked={selectedMember === opt.id}
                    onChange={() => selectMemberFilter(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </aside>
          <div className="search-results">
            <div className="search-results__header">
              <div>
                <h2 className="search-results__title">검색 결과</h2>
                <p className="search-results__count">
                  총 {filteredClubs.length}개의 모임
                  {recommendationsLoading ? " · 추천 계산 반영 중" : ""}
                </p>
              </div>
              <select
                className="search-results__sort"
                value={sortBy}
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
                <p>데이터를 불러오는 중입니다...</p>
              </div>
            ) : filteredClubs.length === 0 ? (
              <div className="search-results__empty">
                <p>조건에 맞는 검색 결과가 없습니다.</p>
              </div>
            ) : (
              <div className="search-results__grid">
                {filteredClubs.map((club, index) => (
                  <ClubCard
                    key={club.id || club.meetingId || `club-${index}`}
                    club={club}
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
