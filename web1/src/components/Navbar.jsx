export default function Navbar({ searchQuery, onSearchChange, isLoggedIn, user, onLoginClick }) {
  return (
    <header className="navbar">
      <div className="navbar__inner">
        <div className="navbar__logo">
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
            <img 
              src="/favicon-32x32.png" 
              alt="경상대 소모임 로고" 
              style={{ width: "40px", height: "40px", borderRadius: "8px" }}
            />
            <div className="navbar__logo-text">
              <span className="navbar__logo-title">경상대 소모임</span>
              <span className="navbar__logo-sub">GNU Club Matching</span>
            </div>
          </a>
        </div>
        <div className="navbar__search">
          <span className="navbar__search-icon">🔍</span>
          <input
            className="navbar__search-input"
            type="text"
            placeholder="소모임을 검색해보세요"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <nav className="navbar__nav">
          <a href="#search" className="navbar__nav-link">소모임 찾기</a>
          <a href="#create" className="navbar__nav-link">소모임 개설</a>
          {isLoggedIn ? (
            <button className="navbar__btn navbar__btn--profile">
              {user?.name ?? "마이페이지"}
            </button>
          ) : (
            <button className="navbar__btn navbar__btn--login" onClick={onLoginClick}>
              로그인
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
