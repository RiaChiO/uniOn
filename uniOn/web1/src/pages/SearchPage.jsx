import { useState, useMemo, useEffect, useRef } from "react";
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

const VECTOR_KEYS = ["study", "exercise", "culture", "game", "religion", "volunteer"];
const DEFAULT_USER_VECTOR = { study: 9, exercise: 2, culture: 4, game: 1, religion: 0, volunteer: 2 };

export default function SearchPage({
  searchQuery, onSearchChange, isLoggedIn, user, onLoginClick,
  clubs = [], meetingTypes = [], meetingTypesLoading = false,
  loading = false, onDetailClick, recommendationsByMeetingId = {}, 
  userVector = null, recommendationsLoading = false, recommendationsError = "",
}) {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedMember, setSelectedMember] = useState("all");
  const [appliedTypes, setAppliedTypes] = useState([]);
  const [appliedCategories, setAppliedCategories] = useState([]);
  const [appliedMember, setAppliedMember] = useState("all");
  const [sortBy, setSortBy] = useState("recommend");
  
  // 로그 중복 방지를 위한 ref
  const hasLogged = useRef(false);

  const toggleType = (id) => setSelectedTypes((prev) => prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]);
  const toggleCategory = (id) => setSelectedCategories((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  
  const applyFilters = () => {
    setAppliedTypes(selectedTypes);
    setAppliedCategories(selectedCategories);
    setAppliedMember(selectedMember);
    hasLogged.current = false; // 필터 적용 시 로그 초기화
  };

  const resetFilters = () => {
    setSelectedTypes([]); setSelectedCategories([]); setSelectedMember("all");
    setAppliedTypes([]); setAppliedCategories([]); setAppliedMember("all");
    hasLogged.current = false;
  };

  const getCosine = (vA, vB) => {
    const dot = vA.reduce((a, b, i) => a + b * vB[i], 0);
    const magA = Math.sqrt(vA.reduce((a, b) => a + b ** 2, 0));
    const magB = Math.sqrt(vB.reduce((a, b) => a + b ** 2, 0));
    return magA && magB ? dot / (magA * magB) : 0;
  };

  const getJaccard = (vA, vB) => {
    let inter = 0, uni = 0;
    for (let i = 0; i < vA.length; i++) {
      inter += Math.min(vA[i], vB[i]);
      uni += Math.max(vA[i], vB[i]);
    }
    return uni ? inter / uni : 0;
  };

  const filteredClubs = useMemo(() => {
    if (!clubs || !Array.isArray(clubs)) return [];

    const filtered = clubs.filter((club) => {
      const matchesSearch = !searchQuery || club.name?.toLowerCase().includes(searchQuery.toLowerCase()) || club.description?.includes(searchQuery) || club.tags?.some((tag) => tag.includes(searchQuery));
      const matchesType = appliedTypes.length === 0 || appliedTypes.includes(club.type);
      const matchesCategory = appliedCategories.length === 0 || appliedCategories.includes(club.category);
      const matchesMember = appliedMember === "all" || (appliedMember === "small" && club.memberCount <= 10) || (appliedMember === "medium" && club.memberCount > 10 && club.memberCount <= 30) || (appliedMember === "large" && club.memberCount > 30);
      return matchesSearch && matchesType && matchesCategory && matchesMember;
    });

    const activeUserVector = userVector ?? DEFAULT_USER_VECTOR;
    const uV = VECTOR_KEYS.map((k) => Number(activeUserVector[k]) || 0);

    const scoredData = filtered.map((item) => {
      const rawCat = (item.algorithmCategory || item.tagId || item.category || "").toLowerCase();
      const matchedOption = CATEGORY_OPTIONS.find(opt => opt.id === rawCat || opt.label === rawCat || opt.algorithmCategory === rawCat);
      const algoCat = matchedOption ? matchedOption.algorithmCategory : rawCat;

      const pAvgV = (item.avg_participant_vector && Array.isArray(item.avg_participant_vector)) 
        ? item.avg_participant_vector.map(Number) 
        : [0, 0, 0, 0, 0, 0];

      const rawCos = getCosine(uV, pAvgV);
      const mTagV = VECTOR_KEYS.map((k) => (k === algoCat ? 10.0 : 0.0));
      const rawJac = getJaccard(uV, mTagV);
      
      const finalScore = Math.round(((rawCos + 1) + (rawJac * 2)) * 25);

      return { 
        ...item, 
        recommendationScore: finalScore, 
        tagWeightScore: Math.round(rawJac * 2 * 25),
        recommendationSource: "hybrid_engine" 
      };
    });

    return [...scoredData].sort((a, b) => b.recommendationScore - a.recommendationScore);
  }, [clubs, searchQuery, appliedTypes, appliedCategories, appliedMember, sortBy, userVector, recommendationsByMeetingId]);

  useEffect(() => {
    // 1. 서버 데이터가 완전히 로드되었는지 확인 (recommendationsByMeetingId가 비어있지 않아야 함)
    const isServerDataReady = Object.keys(recommendationsByMeetingId).length > 0;
    
    // 2. 서버 데이터가 준비되었고, 정렬된 결과가 존재할 때만 딱 한 번 실행
    if (sortBy === "recommend" && filteredClubs.length > 5 && isServerDataReady) {
      if (!hasLogged.current) {
        console.log(`🎯 [최종 알고리즘 분석] 서버 데이터까지 모두 통합 완료:`);
        
        filteredClubs.slice(0, 5).forEach((c, i) => {
          console.log(
            `${i + 1}위: [${c.name}] 총점: ${c.recommendationScore}점 (태그점수: ${c.tagWeightScore})`
          );
        });

        hasLogged.current = true; // 여기서 잠금
      }
    }
  }, [filteredClubs, sortBy, recommendationsByMeetingId]); // 의존성에 서버 데이터 추가

  return (
    <div className="search-page">
      <Navbar searchQuery={searchQuery} onSearchChange={onSearchChange} isLoggedIn={isLoggedIn} user={user} onLoginClick={onLoginClick} />
      <main className="search-page__main">
        <div className="search-page__body">
          <aside className="search-filter">
            <div className="search-filter__header">
              <span className="search-filter__title">🔧 필터</span>
              <button className="search-filter__reset" onClick={resetFilters}>초기화</button>
            </div>
            <div className="search-filter__group">
              <h4 className="search-filter__group-title">모임 유형</h4>
              {meetingTypesLoading ? <p>로딩 중...</p> : meetingTypes.map((type) => (
                <label key={type.id} className="search-filter__check-label">
                  <input type="checkbox" checked={selectedTypes.includes(type.id)} onChange={() => toggleType(type.id)} />
                  {type.label}
                </label>
              ))}
            </div>
            <div className="search-filter__group">
              <h4 className="search-filter__group-title">관심 분야</h4>
              {CATEGORY_OPTIONS.map((cat) => (
                <label key={cat.id} className="search-filter__check-label">
                  <input type="checkbox" checked={selectedCategories.includes(cat.id)} onChange={() => toggleCategory(cat.id)} />
                  {cat.icon} {cat.label}
                </label>
              ))}
            </div>
            <div className="search-filter__group">
              <h4 className="search-filter__group-title">인원</h4>
              {MEMBER_OPTIONS.map((opt) => (
                <label key={opt.id} className="search-filter__check-label">
                  <input type="radio" name="memberFilter" checked={selectedMember === opt.id} onChange={() => setSelectedMember(opt.id)} />
                  {opt.label}
                </label>
              ))}
            </div>
            <button className="btn btn--primary search-filter__apply" onClick={applyFilters}>필터 적용</button>
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
              <select className="search-results__sort" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                {SORT_OPTIONS.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
              </select>
            </div>
            {loading ? <div className="search-results__empty"><p>데이터를 불러오는 중입니다...</p></div> : filteredClubs.length === 0 ? <div className="search-results__empty"><p>조건에 맞는 검색 결과가 없습니다.</p></div> : (
              <div className="search-results__grid">
                {filteredClubs.map((club, index) => (
                  <ClubCard key={club.id || club.meetingId || `club-${index}`} club={club} onDetailClick={(id) => onDetailClick && onDetailClick(id)} />
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