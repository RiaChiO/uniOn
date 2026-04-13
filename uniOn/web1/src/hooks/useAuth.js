import { useState, useEffect } from "react";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth, provider } from "../lib/firebase";

const ALLOWED_DOMAIN = "@gnu.ac.kr"; // 허용할 이메일 도메인

export function useAuth() {
  const [user, setUser]       = useState(null);  // 로그인한 유저
  const [loading, setLoading] = useState(true);  // 초기 로딩 여부
  const [error, setError]     = useState("");    // 에러 메시지

  // 앱 시작 시 로그인 상태 복원 (새로고침해도 유지)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe; // 컴포넌트 언마운트 시 구독 해제
  }, []);

  // 구글 로그인
  async function login() {
    setError("");
    try {
      const result = await signInWithPopup(auth, provider);
      const email  = result.user.email;

      // 경상국립대 이메일만 허용
      if (!email.endsWith(ALLOWED_DOMAIN)) {
        await signOut(auth); // 즉시 로그아웃
        setError(`경상국립대 이메일(${ALLOWED_DOMAIN})만 로그인할 수 있습니다.`);
        setUser(null);
        return;
      }

      setUser(result.user);
    } catch (e) {
      // 유저가 팝업을 닫은 경우 에러 무시
      if (e.code !== "auth/popup-closed-by-user") {
        setError("로그인 중 오류가 발생했습니다. 다시 시도해 주세요.");
      }
    }
  }

  // 로그아웃
  async function logout() {
    await signOut(auth);
    setUser(null);
  }

  return { user, loading, error, login, logout };
}
