import { useState, useMemo } from "react";
import Navbar from "../components/Navbar";
import ClubCard from "../components/ClubCard";
import Footer from "../components/Footer";
import { CATEGORY_OPTIONS } from "../data/categoryOptions";

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

const VECTOR_KEYS = [
  "study",
  "exercise",
  "culture",
  "game",
  "religion",
  "volunteer",
];
const DEFAULT_USER_VECTOR = {
  study: 9,
  exercise: 2,
  culture: 4,
  game: 1,
  religion: 0,
  volunteer: 2,
};

export default function SearchPage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
  clubs = [],
  meetingTypes = [],
  meetingTypesLoading = false,
  meetingTypesError = "",
  loading = false,
  error = "",
  onDetailClick,
  recommendationsByMeetingId = {},
  recommendationsError = "",
  recommendationsLoading = false,
  // 기본 유저 벡터 (로그인 안 했을 때나 데이터 없을 때 대비)
  userVector = DEFAULT_USER_VECTOR,
}) {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedMember, setSelectedMember] = useState("all");
  const [appliedTypes, setAppliedTypes] = useState([]);
  const [appliedCategories, setAppliedCategories] = useState([]);
  const [appliedMember, setAppliedMember] = useState("all");
  const [sortBy, setSortBy] = useState("recommend");

  // --- [필터 핸들러] ---
  const toggleType = (id) =>
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  const toggleCategory = (id) =>
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  const applyFilters = () => {
    setAppliedTypes(selectedTypes);
    setAppliedCategories(selectedCategories);
    setAppliedMember(selectedMember);
  };
  const resetFilters = () => {
    setSelectedTypes([]);
    setSelectedCategories([]);
    setSelectedMember("all");
    setAppliedTypes([]);
    setAppliedCategories([]);
    setAppliedMember("all");
  };

  // --- [유사도 계산 함수] ---
  const getCosine = (vA, vB) => {
    const dot = vA.reduce((a, b, i) => a + b * vB[i], 0);
    const magA = Math.sqrt(vA.reduce((a, b) => a + b ** 2, 0));
    const magB = Math.sqrt(vB.reduce((a, b) => a + b ** 2, 0));
    return magA && magB ? dot / (magA * magB) : 0;
  };

  const getJaccard = (vA, vB) => {
    let inter = 0,
      uni = 0;
    for (let i = 0; i < vA.length; i++) {
      inter += Math.min(vA[i], vB[i]);
      uni += Math.max(vA[i], vB[i]);
    }
    return uni ? inter / uni : 0;
  };

  // --- [핵심: 필터링 + 추천 계산 통합 로직] ---
  const filteredClubs = useMemo(() => {
    if (!clubs || !Array.isArray(clubs)) return [];

    // 1. 먼저 필터링 수행
    const filtered = clubs.filter((club) => {
      // 검색어 (이름, 설명, 태그)
      const matchesSearch =
        !searchQuery ||
        club.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        club.description?.includes(searchQuery) ||
        club.tags?.some((tag) => tag.includes(searchQuery));

      // 모임 유형
      const matchesType =
        appliedTypes.length === 0 || appliedTypes.includes(club.type);

      // 관심 분야 (카테고리)
      const matchesCategory =
        appliedCategories.length === 0 ||
        appliedCategories.includes(club.category);

      // 인원
      const matchesMember =
        appliedMember === "all" ||
        (appliedMember === "small" && club.memberCount <= 10) ||
        (appliedMember === "medium" &&
          club.memberCount > 10 &&
          club.memberCount <= 30) ||
        (appliedMember === "large" && club.memberCount > 30);

      return matchesSearch && matchesType && matchesCategory && matchesMember;
    });

    // 2. 필터링된 결과에 추천 점수 매기기
    const safeUserVector = userVector ?? DEFAULT_USER_VECTOR;
    const uV = VECTOR_KEYS.map((k) => Number(safeUserVector[k]) || 0);

    const scoredData = filtered.map((item) => {
      const serverRecommendation =
        recommendationsByMeetingId[String(item.id)] ??
        recommendationsByMeetingId[String(item.meetingId)];

      if (serverRecommendation) {
        return {
          ...item,
          cosSim: Number(serverRecommendation.cosine) || 0,
          finalScore: Number(serverRecommendation.finalScore) || 0,
          hybridScore: Number(serverRecommendation.hybrid) || 0,
          jaccardScore: Number(serverRecommendation.jaccard) || 0,
          recommendationScore: Number(serverRecommendation.finalScore) || 0,
          recommendationSource: "server",
        };
      }

      const avgVec = item.avg_participant_vector || [];
      const tagId = (item.algorithmCategory || item.tagId || item.category || "").toLowerCase();

      const pAvgV =
        Array.isArray(avgVec) && avgVec.length === 6
          ? avgVec.map(Number)
          : [0, 0, 0, 0, 0, 0];

      const cosSim = getCosine(uV, pAvgV);
      const isStudy = ["study", "academic", "it", "startup"].includes(tagId);
      const mTagV = VECTOR_KEYS.map((k) =>
        (isStudy && k === "study") || tagId === k ? 10.0 : 0.0,
      );
      const jacSim = getJaccard(uV, mTagV);

      const finalScore = Math.round((cosSim + 1 + jacSim * 2) * 25);

      return {
        ...item,
        recommendationScore: finalScore,
        recommendationSource: "local",
        cosSim,
      };
    });

    // 3. 정렬 수행
    const sorted = [...scoredData].sort((a, b) => {
      if (sortBy === "recommend") {
        if (b.recommendationScore !== a.recommendationScore)
          return b.recommendationScore - a.recommendationScore;
        return b.cosSim - a.cosSim;
      }
      if (sortBy === "newest") {
        const getNum = (id) => Number(String(id).match(/\d+/)?.[0]) || 0;
        return getNum(b.id) - getNum(a.id);
      }
      if (sortBy === "member")
        return (b.memberCount || 0) - (a.memberCount || 0);
      return 0;
    });

    // 🌟 로그 출력 (반드시 return 보다 위에 있어야 함!)
    if (sortBy === "recommend" && sorted.length > 0) {
      console.log(
        `%c 🎯 현재 유저를 위한 추천 Top 5 `,
        "background: #222; color: #bada55; font-size: 12px; font-weight: bold; padding: 4px;",
      );

      sorted.slice(0, 5).forEach((club, i) => {
        console.log(
          `${i + 1}위: [%c${club.name || club.displayTitle}%c] - %c${club.recommendationScore}점 %c(Cos: ${club.cosSim.toFixed(3)})`,
          "color: #3b82f6; font-weight: bold;",
          "color: inherit;",
          "color: #ef4444; font-weight: bold;",
          "color: #888; font-size: 11px;",
        );
      });
      console.log("-----------------------------------------");
    }

    // 🌟 마지막에 반환
    return sorted;
  }, [
    clubs,
    searchQuery,
    appliedTypes,
    appliedCategories,
    appliedMember,
    sortBy,
    JSON.stringify(userVector ?? DEFAULT_USER_VECTOR),
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
          {/* 사이드바 필터 */}
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
              <h4 className="search-filter__group-title">관심 분야</h4>
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
                    onChange={() => setSelectedMember(opt.id)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <button
              className="btn btn--primary search-filter__apply"
              onClick={applyFilters}
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
                  {recommendationsLoading ? " · 추천 계산 반영 중" : ""}
                  {!recommendationsLoading && recommendationsError
                    ? " · 기본 추천 기준 적용"
                    : ""}
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
