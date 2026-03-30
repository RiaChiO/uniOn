import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import HeroSection from "./components/HeroSection";
import SearchSection from "./components/SearchSection";
import ClubListSection from "./components/ClubListSection";
import Footer from "./components/Footer";
import SearchPage from "./pages/SearchPage";
import MyPage from "./pages/MyPage";
import CreatePage from "./pages/CreatePage";
import GoogleLoginPage from "./pages/GoogleLoginPage";
import ClubDetailPage from "./pages/ClubDetailPage";
import ClubManagePage from "./pages/ClubManagePage";
import "./styles/global.css";

// 메인 페이지
function MainPage({ searchQuery, onSearchChange, isLoggedIn, user, onLoginClick }) {
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
          onBrowseClick={() => window.location.href = "/search"}
          onCreateClick={() => window.location.href = "/create"}
        />
        <SearchSection
          selectedType={selectedType}
          selectedCategory={selectedCategory}
          onTypeSelect={setSelectedType}
          onCategorySelect={setSelectedCategory}
        />
        <ClubListSection
          searchQuery={searchQuery}
          selectedType={selectedType}
          selectedCategory={selectedCategory}
          onViewAll={() => window.location.href = "/search"}
        />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");

  // 🔧 [기능] 로그인 상태 - 구글 로그인 연동 후 여기 업데이트
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser]             = useState(null);

  const commonProps = {
    searchQuery,
    onSearchChange: setSearchQuery,
    isLoggedIn,
    user,
    onLoginClick: () => window.location.href = "/login",
  };

  return (
    <Routes>

      {/* 메인 */}
      <Route path="/" element={<MainPage {...commonProps} />} />

      {/* 구글 로그인 */}
      <Route
        path="/login"
        element={
          <GoogleLoginPage
            {...commonProps}
            // 🔧 [기능] 구글 로그인 API 연결 후 setIsLoggedIn(true), setUser(data) 호출
            onGoogleLogin={() => console.log("TODO: 구글 로그인 API 연결")}
          />
        }
      />

      {/* 검색 */}
      <Route
        path="/search"
        element={
          <SearchPage
            {...commonProps}
            onDetailClick={(id) => window.location.href = `/clubs/${id}`}
          />
        }
      />

      {/* 소모임 상세 */}
      <Route
        path="/clubs/:id"
        element={
          <ClubDetailPage
            {...commonProps}
            // 🔧 [기능] 각 버튼 API 연결
            onJoin={(id) => console.log(`TODO: 소모임 ${id} 가입 신청`)}
            onWishlist={(id) => console.log(`TODO: 소모임 ${id} 관심 목록 추가`)}
            onShare={(id) => console.log(`TODO: 소모임 ${id} 공유`)}
            onContactLeader={(leader) => console.log("TODO: 리더 문의", leader)}
            onRelatedClick={(id) => window.location.href = `/clubs/${id}`}
            // 🔧 [기능] 리더 여부 확인 후 모임 관리 페이지 이동
            onManageClick={(id) => window.location.href = `/clubs/${id}/manage`}
          />
        }
      />

      {/* 모임 관리 (리더 전용) */}
      <Route
        path="/clubs/:id/manage"
        element={
          <ClubManagePage
            {...commonProps}
            // 🔧 [기능] 각 관리 기능 API 연결
            onSave={(data) => console.log("TODO: 모임 정보 저장", data)}
            onDelete={(id) => console.log(`TODO: 모임 ${id} 삭제`)}
            onApproveMember={(memberId) => console.log(`TODO: 멤버 ${memberId} 승인`)}
            onRejectMember={(memberId) => console.log(`TODO: 멤버 ${memberId} 거절`)}
            onRemoveMember={(memberId) => console.log(`TODO: 멤버 ${memberId} 내보내기`)}
            onAddActivity={() => console.log("TODO: 활동 추가")}
            onDeleteActivity={(actId) => console.log(`TODO: 활동 ${actId} 삭제`)}
            onToggleRecruit={(id) => console.log(`TODO: 모임 ${id} 모집 상태 변경`)}
            onGoPublic={(id) => window.location.href = `/clubs/${id}`}
          />
        }
      />

      {/* 마이페이지 */}
      <Route
        path="/mypage"
        element={
          <MyPage
            {...commonProps}
            onLogout={() => console.log("TODO: 로그아웃 연결")}
            onEditProfile={() => console.log("TODO: 프로필 수정")}
            onClubClick={(id) => window.location.href = `/clubs/${id}`}
          />
        }
      />

      {/* 모임 만들기 */}
      <Route
        path="/create"
        element={
          <CreatePage
            {...commonProps}
            // 🔧 [기능] API 완료 후 navigate(`/clubs/${newId}`) 로 상세 페이지 이동
            onSubmit={(data) => console.log("TODO: 모임 생성 API", data)}
            onCancel={() => window.location.href = "/"}
          />
        }
      />

    </Routes>
  );
}
