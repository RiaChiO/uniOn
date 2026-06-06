import { useState } from "react";
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
  meetingTypes,
  meetingTypesLoading,
  loading,
  error,
}) {
  const [selectedType, setSelectedType] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <div className="app">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={onLoginClick}
      />
      <main>
        <HeroSection
          onBrowseClick={onBrowseClick}
          onCreateClick={onCreateClick}
        />
        {/* 🔧 [기능] Gemini 자기소개서 키워드 매칭 기반 추천 */}
        <IntroRecommendSection onDetailClick={onDetailClick} />
        <ClubListSection
          clubs={clubs}
          limit={6}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          selectedType={selectedType}
          selectedCategory={selectedCategory}
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
    handleRemoveMeetingMember,
    handleSaveMeeting,
    handleToggleMeetingRecruitment,
    handleTransferLeader,
    joiningMeetingId,
  } = useMeetingActions({ navigate, setClubs, user });

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
            meetingTypes={meetingTypes}
            meetingTypesLoading={meetingTypesLoading}
            loading={loading}
            error={loadError}
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
