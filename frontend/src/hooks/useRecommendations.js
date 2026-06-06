import { useEffect, useMemo, useState } from "react";
import { getRecommendations } from "../api/recommendations";

export function useRecommendations({ isLoggedIn, user }) {
  const [recommendations, setRecommendations] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");

  useEffect(() => {
    const userId = user?.id ?? user?.userId;

    if (!isLoggedIn || !userId) {
      setRecommendations([]);
      setRecommendationsError("");
      return;
    }

    async function loadRecommendations() {
      try {
        setRecommendationsLoading(true);
        setRecommendationsError("");

        const data = await getRecommendations(userId);
        setRecommendations(data);
      } catch (error) {
        setRecommendations([]);
        setRecommendationsError(error.message);
      } finally {
        setRecommendationsLoading(false);
      }
    }

    loadRecommendations();
  }, [isLoggedIn, user]);

  const recommendationsByMeetingId = useMemo(
    () =>
      Object.fromEntries(
        recommendations.map((recommendation) => [
          String(recommendation.meetingId),
          recommendation,
        ])
      ),
    [recommendations]
  );

  return {
    recommendations,
    recommendationsByMeetingId,
    recommendationsError,
    recommendationsLoading,
  };
}
