export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="footer__logo">
            <div className="navbar__logo-badge">경</div>
            <div className="navbar__logo-text">
              <span className="navbar__logo-title">경상대 소모임</span>
              <span className="navbar__logo-sub">GNU Club Matching</span>
            </div>
          </div>
          <p className="footer__tagline">
            경상국립대학교 학생들을 위한<br />
            소모임 매칭 플랫폼
          </p>
          <div className="footer__social">
            <a href="#" className="footer__social-link" aria-label="인스타그램">📷</a>
            <a href="#" className="footer__social-link" aria-label="카카오">💬</a>
            <a href="#" className="footer__social-link" aria-label="유튜브">▶️</a>
          </div>
        </div>
        <div className="footer__links">
          <h4 className="footer__links-title">바로가기</h4>
          <ul className="footer__links-list">
            <li><a href="#search">소모임 찾기</a></li>
            <li><a href="#create">소모임 개설</a></li>
            <li><a href="#categories">카테고리</a></li>
            <li><a href="#guide">이용가이드</a></li>
          </ul>
        </div>
        <div className="footer__contact">
          <h4 className="footer__links-title">문의하기</h4>
          <ul className="footer__links-list">
            <li>📧 gnu1234 </li>
            <li>📞 010-1234-7893</li>
          </ul>
        </div>
      </div>
      <div className="footer__bottom">
        © 2026 경상국립대학교 소모임 매칭. All rights reserved.
      </div>
    </footer>
  );
}
