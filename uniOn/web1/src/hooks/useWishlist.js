import { useEffect, useState } from "react";
import {
  addUserWishlistMeeting,
  getUserWishlistMeetings,
  removeUserWishlistMeeting,
} from "../api/users";

export function useWishlist({ isLoggedIn, user }) {
  const [wishlistMeetingIds, setWishlistMeetingIds] = useState([]);
  const [wishlistUpdatingMeetingId, setWishlistUpdatingMeetingId] = useState("");

  useEffect(() => {
    const userId = user?.id ?? user?.userId;

    if (!isLoggedIn || !userId) {
      setWishlistMeetingIds([]);
      return;
    }

    async function loadWishlist() {
      try {
        const wishlist = await getUserWishlistMeetings(userId);
        setWishlistMeetingIds(wishlist.map((item) => String(item.meetingId)));
      } catch (error) {
        console.error("관심 목록 로드 실패", error);
        setWishlistMeetingIds([]);
      }
    }

    loadWishlist();
  }, [isLoggedIn, user]);

  async function toggleWishlist(meetingId) {
    const userId = user?.id ?? user?.userId;
    const normalizedMeetingId = String(meetingId);

    if (!userId) {
      window.alert("로그인 후 관심 목록에 추가할 수 있습니다.");
      return;
    }

    const isWishlisted = wishlistMeetingIds.includes(normalizedMeetingId);

    try {
      setWishlistUpdatingMeetingId(normalizedMeetingId);

      if (isWishlisted) {
        const data = await removeUserWishlistMeeting(userId, normalizedMeetingId);
        setWishlistMeetingIds((prev) =>
          prev.filter((id) => id !== normalizedMeetingId)
        );
        window.alert(data.message || "관심 목록에서 제거했습니다.");
        return;
      }

      const data = await addUserWishlistMeeting(userId, normalizedMeetingId);
      setWishlistMeetingIds((prev) =>
        prev.includes(normalizedMeetingId) ? prev : [...prev, normalizedMeetingId]
      );
      window.alert(data.message || "관심 목록에 추가했습니다.");
    } catch (error) {
      window.alert(error.message || "관심 목록 처리 중 오류가 발생했습니다.");
    } finally {
      setWishlistUpdatingMeetingId("");
    }
  }

  return {
    toggleWishlist,
    wishlistMeetingIds,
    wishlistUpdatingMeetingId,
  };
}
