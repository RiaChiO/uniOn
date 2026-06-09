export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <div className="footer__logo">
            <div className="navbar__logo-badge">U</div>
            <div className="navbar__logo-text">
              <span className="navbar__logo-title">uniOn</span>
              <span className="navbar__logo-sub">모임 매칭</span>
            </div>
          </div>
          <p className="footer__tagline">
            경상국립대학교 학생들을 위한
            <br />
            모임 매칭 플랫폼
          </p>
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
        © 2026 uniOn. All rights reserved.
      </div>
    </footer>
  );
}
