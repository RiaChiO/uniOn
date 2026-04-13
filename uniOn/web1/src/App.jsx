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
import {
  createMeeting,
  createMeetingJoinRequest,
  getMeetings,
  updateMeetingJoinRequest,
} from "./api/meetings";
import { getMeetingTypes } from "./api/meetingTypes";
import { syncUser } from "./api/users";
import "./styles/global.css";
import {
  auth,
  onAuthStateChanged,
  provider,
  signInWithPopup,
  signOut,
} from "./lib/firebase";

const ALLOWED_EMAIL_DOMAIN = "@gnu.ac.kr";

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

function getStoredMeetingTypes() {
  try {
    const stored = localStorage.getItem("meetingTypes");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// 메인 페이지
function MainPage({
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
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
          onBrowseClick={() => (window.location.href = "/search")}
          onCreateClick={() => (window.location.href = "/create")}
        />
        <SearchSection
          meetingTypes={meetingTypes}
          meetingTypesLoading={meetingTypesLoading}
          selectedType={selectedType}
          selectedCategory={selectedCategory}
          onTypeSelect={setSelectedType}
          onCategorySelect={setSelectedCategory}
        />
        <ClubListSection
          clubs={clubs}
          limit={6}
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
  const [joiningMeetingId, setJoiningMeetingId] = useState("");
  const [meetingTypes, setMeetingTypes] = useState(getStoredMeetingTypes);
  const [meetingTypesLoading, setMeetingTypesLoading] = useState(
    meetingTypes.length === 0
  );
  const [meetingTypesError, setMeetingTypesError] = useState("");

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
      typeLabel: meeting.meetingTypeLabel ?? meeting.meetingType,
      description: meeting.description,
      hostUserId: meeting.hostUserId,
      leaderName: meeting.leaderName,
      memberCount: meeting.participantCount,
      tags: (meeting.tags || []).map((tag) => `#${tag}`),
      category: mappedCategory.id,
      categoryLabel: mappedCategory.label,
      meetingDay: "일정 조율중",
      location: "장소 협의 예정",
      isRecruiting: true,
    };
  }

  async function syncFirebaseUser(firebaseUser) {
    const email = String(firebaseUser?.email ?? "").trim().toLowerCase();
    const name = String(firebaseUser?.displayName ?? "").trim();
    const userId = String(firebaseUser?.uid ?? "").trim();

    if (!email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
      throw new Error(`경상국립대 이메일(${ALLOWED_EMAIL_DOMAIN})만 로그인할 수 있습니다.`);
    }

    const data = await syncUser({ userId, name, email });

    return {
      id: data.user.userId,
      userId: data.user.userId,
      name: data.user.name,
      email: data.user.email,
      createdAt: data.user.createdAt,
    };
  }

  useEffect(() => {
    async function loadMeetings() {
      try {
        setLoading(true);
        setLoadError("");

        const meetings = await getMeetings();

        setClubs(meetings.map(mapMeetingToClub));
      } catch (error) {
        setLoadError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadMeetings();
  }, []);

  useEffect(() => {
    async function loadMeetingTypes() {
      try {
        setMeetingTypesLoading(true);
        setMeetingTypesError("");

        const types = await getMeetingTypes();
        setMeetingTypes(types);
        localStorage.setItem("meetingTypes", JSON.stringify(types));
      } catch (error) {
        setMeetingTypesError(error.message);
      } finally {
        setMeetingTypesLoading(false);
      }
    }

    loadMeetingTypes();
  }, []);

  // 로그인 상태 자동 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setIsLoggedIn(false);
        setUser(null);
        return;
      }

      syncFirebaseUser(firebaseUser)
        .then((syncedUser) => {
          setIsLoggedIn(true);
          setUser(syncedUser);
        })
        .catch(async (error) => {
          console.error("사용자 동기화 실패", error);
          await signOut(auth);
          setIsLoggedIn(false);
          setUser(null);
          window.alert(error.message || "로그인 처리 중 오류가 발생했습니다.");
        });
    });

    return () => unsubscribe();
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
      const data = await createMeeting({
        title,
        meetingType,
        tagId,
        description,
        hostUserId,
      });

      const createdMeeting = data.meeting ?? data;
      const createdClub = mapMeetingToClub(createdMeeting);
      setClubs((prev) => [...prev, createdClub]);
      window.location.href = `/clubs/${createdClub.id}`;
    } catch (error) {
      window.alert(error.message || "모임 생성 중 오류가 발생했습니다.");
    }
  }

  async function handleJoinRequest(meetingId) {
    const userId = user?.id ?? user?.userId;

    if (!userId) {
      window.alert("로그인 후 가입 신청할 수 있습니다.");
      return;
    }

    if (!window.confirm("이 모임에 가입 신청하시겠습니까?")) {
      return;
    }

    try {
      setJoiningMeetingId(meetingId);
      const data = await createMeetingJoinRequest(meetingId, userId);

      window.alert(data.message || "가입 신청이 접수되었습니다.");
    } catch (error) {
      window.alert(error.message || "가입 신청 중 오류가 발생했습니다.");
    } finally {
      setJoiningMeetingId("");
    }
  }

  async function handleJoinRequestDecision(meetingId, userId, action) {
    try {
      return await updateMeetingJoinRequest(meetingId, userId, action);
    } catch (error) {
      window.alert(error.message || "가입 신청 처리 중 오류가 발생했습니다.");
      throw error;
    }
  }

  // 구글 로그인
  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const syncedUser = await syncFirebaseUser(result.user);
      setIsLoggedIn(true);
      setUser(syncedUser);
      window.location.href = "/";
    } catch (error) {
      console.error("로그인 실패", error);
      if (error?.code !== "auth/popup-closed-by-user") {
        window.alert(error.message || "로그인 중 오류가 발생했습니다.");
      }
    }
  };

  // 로그아웃
  const handleLogout = async () => {
    await signOut(auth);
    setIsLoggedIn(false);
    setUser(null);
    window.location.href = "/";
  };

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
            meetingTypes={meetingTypes}
            meetingTypesLoading={meetingTypesLoading}
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
            onGoogleLogin={handleGoogleLogin}
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
            meetingTypes={meetingTypes}
            meetingTypesLoading={meetingTypesLoading}
            meetingTypesError={meetingTypesError}
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
            onJoin={handleJoinRequest}
            joiningMeetingId={joiningMeetingId}
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
            clubs={clubs}
            loading={loading}
            error={loadError}
            // 🔧 [기능] 각 관리 기능 API 연결
            onSave={(data) => console.log("TODO: 모임 정보 저장", data)}
            onDelete={(id) => console.log(`TODO: 모임 ${id} 삭제`)}
            onApproveMember={(meetingId, memberId) =>
              handleJoinRequestDecision(meetingId, memberId, "approve")
            }
            onRejectMember={(meetingId, memberId) =>
              handleJoinRequestDecision(meetingId, memberId, "reject")
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
            onLogout={handleLogout}
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
            meetingTypes={meetingTypes}
            meetingTypesLoading={meetingTypesLoading}
            meetingTypesError={meetingTypesError}
            onSubmit={handleCreateMeeting}
            onCancel={() => (window.location.href = "/")}
          />
        }
      />
    </Routes>
  );
}
