import { useEffect, useState } from "react";
import {
  auth,
  onAuthStateChanged,
  provider,
  signInWithPopup,
  signOut,
} from "../lib/firebase";
import { syncUser } from "../api/users";

const ALLOWED_EMAIL_DOMAIN = "@gnu.ac.kr";
const ALLOW_TEST_LOGIN = import.meta.env.VITE_ALLOW_TEST_LOGIN === "true";

async function syncFirebaseUser(firebaseUser) {
  const email = String(firebaseUser?.email ?? "").trim().toLowerCase();
  const name = String(firebaseUser?.displayName ?? "").trim();
  const userId = String(firebaseUser?.uid ?? "").trim();

  if (!ALLOW_TEST_LOGIN && !email.endsWith(ALLOWED_EMAIL_DOMAIN)) {
    throw new Error(`경상국립대 이메일(${ALLOWED_EMAIL_DOMAIN})만 로그인할 수 있습니다.`);
  }

  const data = await syncUser({ userId, name, email });

  return {
    id: data.user.userId,
    userId: data.user.userId,
    name: data.user.name,
    email: data.user.email,
    department: data.user.department,
    grade: data.user.grade,
    createdAt: data.user.createdAt,
  };
}

export function useAuthSession() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        setIsLoggedIn(false);
        setUser(null);
        setAuthLoading(false);
        return;
      }

      syncFirebaseUser(firebaseUser)
        .then((syncedUser) => {
          setIsLoggedIn(true);
          setUser(syncedUser);
          setAuthLoading(false);
        })
        .catch(async (error) => {
          console.error("사용자 동기화 실패", error);
          await signOut(auth);
          setIsLoggedIn(false);
          setUser(null);
          setAuthLoading(false);
          window.alert(error.message || "로그인 처리 중 오류가 발생했습니다.");
        });
    });

    return () => unsubscribe();
  }, []);

  async function loginWithGoogle() {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("로그인 실패", error);
      if (error?.code !== "auth/popup-closed-by-user") {
        window.alert(error.message || "로그인 중 오류가 발생했습니다.");
      }
      throw error;
    }
  }

  async function logout() {
    await signOut(auth);
    setIsLoggedIn(false);
    setUser(null);
  }

  function updateUser(partialUser) {
    setUser((prev) => (prev ? { ...prev, ...partialUser } : prev));
  }

  return {
    authLoading,
    isLoggedIn,
    loginWithGoogle,
    logout,
    updateUser,
    user,
  };
}
