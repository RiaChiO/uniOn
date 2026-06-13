import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import IntroRecommendSection from "./components/IntroRecommendSection";
import ClubListSection from "./components/ClubListSection";
import Footer from "./components/Footer";
import SearchPage from "./pages/SearchPage";
import MyPage from "./pages/MyPage";
import CreatePage from "./pages/CreatePage";
import GoogleLoginPage from "./pages/GoogleLoginPage";
import ClubDetailPage from "./pages/ClubDetailPage";
import ClubManagePage from "./pages/ClubManagePage";
import ProfileEditPage from "./pages/ProfileEditPage";
import WelcomePage from "./pages/WelcomePage";
import { useAuthSession } from "./hooks/useAuthSession";
import { useMeetingActions } from "./hooks/useMeetingActions";
import { useMeetingCatalog } from "./hooks/useMeetingCatalog";
import { useRecommendations } from "./hooks/useRecommendations";
import { useUserVector } from "./hooks/useUserVector";
import { useWishlist } from "./hooks/useWishlist";
import "./styles/global.css";

function MainPage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
  onBrowseClick,
  onCreateClick,
  onViewAll,
  onDetailClick,
  clubs,
  loading,
  error,
  userVector,
  recommendationsByMeetingId,
  recommendationsLoading,
}) {
  return (
    <div className="app">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={onLoginClick}
        searchClubs={clubs}
        onSearchSelect={onDetailClick}
        onSearchViewAll={onViewAll}
      />
      <main>
        <HeroSection
          onBrowseClick={onBrowseClick}
          onCreateClick={onCreateClick}
        />
        {/* 🔧 [기능] Gemini 자기소개서 키워드 매칭 기반 추천 */}
        <IntroRecommendSection user={user} onDetailClick={onDetailClick} />
        <ClubListSection
          clubs={clubs}
          limit={6}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          userVector={userVector}
          recommendationsByMeetingId={recommendationsByMeetingId}
          recommendationsLoading={recommendationsLoading}
          onViewAll={onViewAll}
          onDetailClick={onDetailClick}
        />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const {
    authLoading,
    isLoggedIn,
    loginWithGoogle,
    logout,
    updateUser,
    user,
  } = useAuthSession();
  const userVector = useUserVector({ isLoggedIn, user });
  const {
    recommendationsByMeetingId,
    recommendationsError,
    recommendationsLoading,
  } = useRecommendations({ isLoggedIn, user });
  const {
    clubs,
    loading,
    loadError,
    meetingTypes,
    meetingTypesError,
    meetingTypesLoading,
    setClubs,
  } = useMeetingCatalog();
  const {
    toggleWishlist,
    wishlistMeetingIds,
    wishlistUpdatingMeetingId,
  } = useWishlist({ isLoggedIn, user });
  const {
    handleCreateMeeting,
    handleDeleteMeeting,
    handleJoinRequest,
    handleJoinRequestDecision,
    handleLeaveMeeting,
    handleRemoveMeetingMember,
    handleSaveMeeting,
    handleToggleMeetingRecruitment,
    handleTransferLeader,
    handleTransferLeadershipAndLeave,
    joiningMeetingId,
  } = useMeetingActions({ navigate, setClubs, user });

  // 🔧 [신규 사용자 감지] name·department·grade 중 하나라도 비면 /welcome 으로
  useEffect(() => {
    if (authLoading) return;
    if (!isLoggedIn) return;
    if (!user) return;
    // 이미 welcome 페이지면 다시 redirect 하지 않음
    if (window.location.pathname === "/welcome") return;
    if (window.location.pathname === "/login") return;

    const hasName = String(user?.name ?? "").trim().length > 0;
    const hasDept = String(user?.department ?? "").trim().length > 0;
    const hasGrade = String(user?.grade ?? "").trim().length > 0;
    const needsOnboarding =
      user?.onboardingCompleted === false ||
      (user?.onboardingCompleted == null && (!hasName || !hasDept || !hasGrade));

    if (needsOnboarding) {
      navigate("/welcome", { replace: true });
    }
  }, [authLoading, isLoggedIn, user, navigate]);

  async function handleGoogleLogin() {
    try {
      await loginWithGoogle();
      navigate("/");
    } catch {
      // The auth hook already shows the user-facing error.
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const commonProps = {
    searchQuery,
    onSearchChange: setSearchQuery,
    isLoggedIn,
    authLoading,
    user,
    onLoginClick: () => navigate("/login"),
    onUserUpdate: updateUser,
    // 🔧 [검색 드롭다운] 모든 페이지의 Navbar에서 동일하게 동작
    searchClubs: clubs,
    onSearchSelect: (id) => navigate(`/clubs/${id}`),
    onSearchViewAll: () => navigate("/search"),
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          <MainPage
            {...commonProps}
            onBrowseClick={() => navigate("/search")}
            onCreateClick={() => navigate("/create")}
            onViewAll={() => navigate("/search")}
            onDetailClick={(id) => navigate(`/clubs/${id}`)}
            clubs={clubs}
            loading={loading}
            error={loadError}
            userVector={userVector}
            recommendationsByMeetingId={recommendationsByMeetingId}
            recommendationsLoading={recommendationsLoading}
          />
        }
      />

      <Route
        path="/login"
        element={
          <GoogleLoginPage
            {...commonProps}
            onGoogleLogin={handleGoogleLogin}
          />
        }
      />

      <Route
        path="/welcome"
        element={<WelcomePage {...commonProps} />}
      />

      <Route
        path="/search"
        element={
          <SearchPage
            {...commonProps}
            clubs={clubs}
            meetingTypes={meetingTypes}
            meetingTypesLoading={meetingTypesLoading}
            meetingTypesError={meetingTypesError}
            loading={loading}
            error={loadError}
            userVector={userVector}
            recommendationsByMeetingId={recommendationsByMeetingId}
            recommendationsError={recommendationsError}
            recommendationsLoading={recommendationsLoading}
            onDetailClick={(id) => navigate(`/clubs/${id}`)}
          />
        }
      />

      <Route
        path="/clubs/:id"
        element={
          <ClubDetailPage
            {...commonProps}
            clubs={clubs}
            loading={loading}
            error={loadError}
            onJoin={handleJoinRequest}
            onLeave={handleLeaveMeeting}
            joiningMeetingId={joiningMeetingId}
            onWishlist={toggleWishlist}
            wishlistMeetingIds={wishlistMeetingIds}
            wishlistUpdatingMeetingId={wishlistUpdatingMeetingId}
            onRelatedClick={(id) => navigate(`/clubs/${id}`)}
            onManageClick={(id) => navigate(`/clubs/${id}/manage`)}
          />
        }
      />

      <Route
        path="/clubs/:id/manage"
        element={
          <ClubManagePage
            {...commonProps}
            clubs={clubs}
            loading={loading}
            error={loadError}
            onSave={handleSaveMeeting}
            onDelete={handleDeleteMeeting}
            onApproveMember={(meetingId, memberId) =>
              handleJoinRequestDecision(meetingId, memberId, "approve")
            }
            onRejectMember={(meetingId, memberId) =>
              handleJoinRequestDecision(meetingId, memberId, "reject")
            }
            onRemoveMember={handleRemoveMeetingMember}
            onTransferLeader={handleTransferLeader}
            onToggleRecruit={handleToggleMeetingRecruitment}
            onGoPublic={(id) => navigate(`/clubs/${id}`)}
            onTransferLeadershipAndLeave={handleTransferLeadershipAndLeave}
          />
        }
      />

      <Route
        path="/mypage"
        element={
          <MyPage
            {...commonProps}
            onLogout={handleLogout}
            onEditProfile={() => navigate("/mypage/edit")}
            onClubClick={(id) => navigate(`/clubs/${id}`)}
            onManageClick={(id) => navigate(`/clubs/${id}/manage`)}
            wishlistCount={wishlistMeetingIds.length}
          />
        }
      />

      <Route
        path="/mypage/edit"
        element={<ProfileEditPage {...commonProps} />}
      />

      <Route
        path="/create"
        element={
          <CreatePage
            {...commonProps}
            meetingTypes={meetingTypes}
            meetingTypesLoading={meetingTypesLoading}
            meetingTypesError={meetingTypesError}
            onSubmit={handleCreateMeeting}
            onCancel={() => navigate("/")}
          />
        }
      />
    </Routes>
  );
}
