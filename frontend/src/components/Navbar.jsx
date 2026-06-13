import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchDropdown from "./SearchDropdown";

export default function Navbar({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
  // 🔧 [추가] 검색 드롭다운 props
  searchClubs = [],
  onSearchSelect,
  onSearchViewAll,
}) {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", saved);
    setIsDark(saved === "dark");
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.setAttribute(
      "data-theme",
      next ? "dark" : "light",
    );
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // 🔧 [검색 드롭다운] 검색어 있으면 열림, 비면 닫힘
  const handleSearchChange = (e) => {
    const value = e.target.value;
    onSearchChange(value);
    setIsSearchOpen(value.trim().length > 0);
  };

  const handleSearchFocus = () => {
    if (searchQuery && searchQuery.trim().length > 0) {
      setIsSearchOpen(true);
    }
  };

  // 🔧 [검색 드롭다운] Enter 시 전체 결과 페이지로
  const handleSearchKey = (e) => {
    if (e.key === "Enter" && searchQuery && searchQuery.trim().length > 0) {
      e.preventDefault();
      onSearchViewAll?.(searchQuery);
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__logo">
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
            }}
          >
            <img
              src="/favicon-32x32.png"
              alt="uniOn 로고"
              style={{ width: "40px", height: "40px", borderRadius: "8px" }}
            />
            <div className="navbar__logo-text">
              <span className="navbar__logo-title">uniOn</span>
              <span className="navbar__logo-sub">모임 매칭</span>
            </div>
          </Link>
        </div>
        <div className="navbar__search">
          <span className="navbar__search-icon">🔍</span>
          <input
            className="navbar__search-input"
            type="text"
            placeholder="모임을 검색해보세요"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onKeyDown={handleSearchKey}
          />
          {/* 🔧 [드롭다운] 입력 시에만 표시 */}
          {isSearchOpen && (
            <SearchDropdown
              searchQuery={searchQuery}
              clubs={searchClubs}
              onClose={() => setIsSearchOpen(false)}
              onSelectClub={onSearchSelect}
              onViewAll={onSearchViewAll}
            />
          )}
        </div>
        <nav className="navbar__nav">
          <Link to="/search" className="navbar__nav-link">
            모임 찾기
          </Link>
          <Link to="/create" className="navbar__nav-link">
            모임 개설
          </Link>
          {isLoggedIn ? (
            <button
              className="navbar__btn navbar__btn--profile"
              onClick={() => navigate("/mypage")}
            >
              {user?.name ?? "마이페이지"}
            </button>
          ) : (
            <button
              className="navbar__btn navbar__btn--login"
              onClick={onLoginClick}
            >
              로그인
            </button>
          )}
          <button
            onClick={toggleDark}
            style={{ fontSize: "20px", padding: "4px 8px" }}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </nav>
      </div>
    </header>
  );
}
