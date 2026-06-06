import { useEffect, useState } from "react";
import { getUserInterestVectors } from "../api/users";

export function useUserVector({ isLoggedIn, user }) {
  const [userVector, setUserVector] = useState(null);

  useEffect(() => {
    const userId = user?.userId ?? user?.id;

    if (!isLoggedIn || !userId) {
      setUserVector(null);
      return;
    }

    async function loadUserVector() {
      try {
        const vectorData = await getUserInterestVectors(userId);
        setUserVector(vectorData);
      } catch (error) {
        console.error("유저 벡터 로드 실패:", error);
        setUserVector(null);
      }
    }

    loadUserVector();
  }, [isLoggedIn, user]);

  return userVector;
}
