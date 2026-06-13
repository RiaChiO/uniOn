// 📌 WelcomePage - 최초 로그인 신규 사용자 온보딩 페이지
// 🔧 [동작]
//   - 구글 로그인 직후 name·department·grade 미설정 사용자가 자동 진입
//   - 이름·학과·학년 입력 → PATCH /api/users/:userId/profile
//   - 성공 시 메인 페이지로 이동
//   - "나중에 설정" 클릭 시 메인 페이지로 이동 (필수 아님)

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  completeUserOnboarding,
  updateUserProfile,
} from "../api/users";

export default function WelcomePage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  authLoading = false,
  user,
  onLoginClick,
  onUserUpdate,
}) {
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [grade, setGrade] = useState(user?.grade ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // 비로그인 사용자 또는 이미 프로필 완료된 사용자는 진입 차단
  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) {
      navigate("/login", { replace: true });
      return;
    }
    if (user?.onboardingCompleted) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isLoggedIn, user, navigate]);

  const userId = user?.userId ?? user?.id;

  const isValid =
    name.trim().length > 0 &&
    department.trim().length > 0 &&
    String(grade).trim().length > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || !userId) return;

    try {
      setIsSaving(true);
      setErrorMessage("");
      const updated = await updateUserProfile(userId, {
        name: name.trim(),
        department: department.trim(),
        grade,
      });
      onUserUpdate?.(updated.user);
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(
        error.message || "프로필 저장 중 오류가 발생했습니다."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!userId) return;

    try {
      setIsSaving(true);
      setErrorMessage("");
      const result = await completeUserOnboarding(userId);
      onUserUpdate?.(result.user);
      navigate("/", { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "온보딩 상태 저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="welcome-page">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={onLoginClick}
      />

      <main className="welcome-page__main">
        <div className="welcome-page__card">
          <div className="welcome-page__avatar" aria-hidden="true">👋</div>
          <h1 className="welcome-page__title">환영합니다!</h1>
          <p className="welcome-page__subtitle">
            맞춤 추천을 받으려면 아래 정보를 입력해주세요.<br />
            1분이면 끝나요.
          </p>

          <form className="welcome-page__form" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-field__label">
                이름 <span className="welcome-page__required">*</span>
              </label>
              <input
                className="form-field__input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름을 입력하세요"
                autoFocus
                required
              />
            </div>

            <div className="form-field">
              <label className="form-field__label">
                학과 <span className="welcome-page__required">*</span>
              </label>
              <input
                className="form-field__input"
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="예: 컴퓨터과학과"
                required
              />
            </div>

            <div className="form-field">
              <label className="form-field__label">
                학년 <span className="welcome-page__required">*</span>
              </label>
              <select
                className="form-field__input form-field__select"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
              >
                <option value="">학년 선택</option>
                <option value="1">1학년</option>
                <option value="2">2학년</option>
                <option value="3">3학년</option>
                <option value="4">4학년</option>
              </select>
              <p className="welcome-page__help">
                관심 분야 설정은 마이페이지에서 가능해요
              </p>
            </div>

            {errorMessage && (
              <p className="welcome-page__error">{errorMessage}</p>
            )}

            <button
              type="submit"
              className="welcome-page__submit"
              disabled={!isValid || isSaving}
            >
              {isSaving ? "저장 중..." : "uniOn 시작하기 →"}
            </button>
            <button
              type="button"
              className="welcome-page__skip"
              onClick={handleSkip}
              disabled={isSaving}
            >
              나중에 설정할게요 (메인 페이지로)
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
