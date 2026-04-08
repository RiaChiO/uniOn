import { useEffect, useState } from "react";
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

const CATEGORY_TO_TAG_ID = {
  academic: "study",
  music: "culture",
  sports: "exercise",
  art: "culture",
  it: "study",
  volunteer: "volunteer",
  photo: "culture",
  language: "study",
  networking: "culture",
  startup: "study",
  culture: "culture",
  game: "game",
};

const TAG_ID_TO_CATEGORY = {
  study: { id: "academic", label: "학술/교육" },
  exercise: { id: "sports", label: "운동/스포츠" },
  culture: { id: "culture", label: "문화/취미" },
  game: { id: "game", label: "게임/e스포츠" },
  religion: { id: "culture", label: "문화/취미" },
  volunteer: { id: "volunteer", label: "봉사/사회" },
};

const MEETING_TYPE_LABELS = {
  club: "동아리",
  "small-group": "소모임",
  "one-time": "일회성 모임",
};

// 메인 페이지
function MainPage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
  clubs,
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
          onBrowseClick={() => (window.location.href = "/search")}
          onCreateClick={() => (window.location.href = "/create")}
        />
        <SearchSection
          selectedType={selectedType}
          selectedCategory={selectedCategory}
          onTypeSelect={setSelectedType}
          onCategorySelect={setSelectedCategory}
        />
        <ClubListSection
          clubs={clubs}
          loading={loading}
          error={error}
          searchQuery={searchQuery}
          selectedType={selectedType}
          selectedCategory={selectedCategory}
          onViewAll={() => (window.location.href = "/search")}
          onDetailClick={(id) => (window.location.href = `/clubs/${id}`)}
        />
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // 🔧 [기능] 로그인 상태 - 구글 로그인 연동 후 여기 업데이트
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);

  function mapMeetingToClub(meeting) {
    const mappedCategory = TAG_ID_TO_CATEGORY[meeting.tagId] ?? {
      id: "culture",
      label: meeting.tagId || "기타",
    };

    return {
      id: meeting.meetingId,
      name: meeting.title,
      type: meeting.meetingType,
      typeLabel: MEETING_TYPE_LABELS[meeting.meetingType] ?? meeting.meetingType,
      description: meeting.description,
      memberCount: meeting.participantCount,
      tags: (meeting.tags || []).map((tag) => `#${tag}`),
      category: mappedCategory.id,
      categoryLabel: mappedCategory.label,
      meetingDay: "일정 조율중",
      location: "장소 협의 예정",
      isRecruiting: true,
    };
  }

  useEffect(() => {
    async function loadMeetings() {
      try {
        setLoading(true);
        setLoadError("");

        const res = await fetch("/api/meetings");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "모임 목록을 불러오지 못했습니다.");
        }

        setClubs(data.map(mapMeetingToClub));
      } catch (error) {
        setLoadError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadMeetings();
  }, []);

  async function handleCreateMeeting(formData) {
    const title = String(formData?.name ?? "").trim();
    const meetingType = String(formData?.type ?? "").trim();
    const categoryId = String(formData?.category ?? "").trim();
    const tagId = CATEGORY_TO_TAG_ID[categoryId] ?? "";
    const description = String(formData?.description ?? "").trim();
    const hostUserId = user?.id ?? user?.userId ?? "user1";

    if (!title || !meetingType || !tagId || !description) {
      window.alert("모임명, 모임 유형, 관심 분야, 소개는 필수입니다.");
      return;
    }

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          meetingType,
          tagId,
          description,
          hostUserId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "모임 생성에 실패했습니다.");
      }

      const createdMeeting = data.meeting ?? data;
      const createdClub = mapMeetingToClub(createdMeeting);
      setClubs((prev) => [...prev, createdClub]);
      window.location.href = `/clubs/${createdClub.id}`;
    } catch (error) {
      window.alert(error.message || "모임 생성 중 오류가 발생했습니다.");
    }
  }

  const commonProps = {
    searchQuery,
    onSearchChange: setSearchQuery,
    isLoggedIn,
    user,
    onLoginClick: () => (window.location.href = "/login"),
  };

  return (
    <Routes>
      {/* 메인 */}
      <Route
        path="/"
        element={
          <MainPage
            {...commonProps}
            clubs={clubs}
            loading={loading}
            error={loadError}
          />
        }
      />

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
            clubs={clubs}
            loading={loading}
            error={loadError}
            onDetailClick={(id) => (window.location.href = `/clubs/${id}`)}
          />
        }
      />

      {/* 소모임 상세 */}
      <Route
        path="/clubs/:id"
        element={
          <ClubDetailPage
            {...commonProps}
            clubs={clubs}
            loading={loading}
            error={loadError}
            // 🔧 [기능] 각 버튼 API 연결
            onJoin={(id) => console.log(`TODO: 소모임 ${id} 가입 신청`)}
            onWishlist={(id) =>
              console.log(`TODO: 소모임 ${id} 관심 목록 추가`)
            }
            onShare={(id) => console.log(`TODO: 소모임 ${id} 공유`)}
            onContactLeader={(leader) => console.log("TODO: 리더 문의", leader)}
            onRelatedClick={(id) => (window.location.href = `/clubs/${id}`)}
            // 🔧 [기능] 리더 여부 확인 후 모임 관리 페이지 이동
            onManageClick={(id) =>
              (window.location.href = `/clubs/${id}/manage`)
            }
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
            onApproveMember={(memberId) =>
              console.log(`TODO: 멤버 ${memberId} 승인`)
            }
            onRejectMember={(memberId) =>
              console.log(`TODO: 멤버 ${memberId} 거절`)
            }
            onRemoveMember={(memberId) =>
              console.log(`TODO: 멤버 ${memberId} 내보내기`)
            }
            onAddActivity={() => console.log("TODO: 활동 추가")}
            onDeleteActivity={(actId) =>
              console.log(`TODO: 활동 ${actId} 삭제`)
            }
            onToggleRecruit={(id) =>
              console.log(`TODO: 모임 ${id} 모집 상태 변경`)
            }
            onGoPublic={(id) => (window.location.href = `/clubs/${id}`)}
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
            onClubClick={(id) => (window.location.href = `/clubs/${id}`)}
          />
        }
      />

      {/* 모임 만들기 */}
      <Route
        path="/create"
        element={
          <CreatePage
            {...commonProps}
            onSubmit={handleCreateMeeting}
            onCancel={() => (window.location.href = "/")}
          />
        }
      />
    </Routes>
  );
}
