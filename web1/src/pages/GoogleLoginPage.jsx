// 📌 GoogleLoginPage - 구글 로그인 화면
// 🔧 [기능 포인트]
//   - onGoogleLogin : 구글 로그인 버튼 클릭 → Firebase 또는 OAuth 연결
//                    예시: Firebase → signInWithPopup(auth, googleProvider)
//                    예시: OAuth    → window.location.href = "/auth/google"

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function GoogleLoginPage({
  onGoogleLogin,
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
}) {
  return (
    <div className="login-page">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={onLoginClick}
      />

      <main className="login-page__main">
        <div className="login-box">

          {/* 로고 */}
          <div className="login-box__logo">
            <div className="navbar__logo-badge">경</div>
            <div className="login-box__logo-title">경상대 소모임</div>
            <p className="login-box__subtitle">로그인하고 소모임을 시작하세요</p>
          </div>

          {/* 구글 로그인 버튼 */}
          <div className="login-box__form">
            <button
              className="google-login-btn"
              // 🔧 [기능] 구글 로그인 API 연결
              onClick={() => onGoogleLogin && onGoogleLogin()}
            >
              <img
                className="google-login-btn__icon"
                src="https://www.google.com/favicon.ico"
                alt="Google"
              />
              구글로 로그인
            </button>

            <p className="google-login-btn__desc">
              경상국립대학교 학생 대상 서비스입니다
            </p>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
