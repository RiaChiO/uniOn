import { CATEGORY_OPTIONS } from "../data/categoryOptions";

export const VECTOR_KEYS = [
  "study",
  "exercise",
  "culture",
  "game",
  "religion",
  "volunteer",
];

export const DEFAULT_USER_VECTOR = {
  study: 9,
  exercise: 2,
  culture: 4,
  game: 1,
  religion: 0,
  volunteer: 2,
};

function getCosine(vA, vB) {
  const dot = vA.reduce((sum, value, index) => sum + value * vB[index], 0);
  const magA = Math.sqrt(vA.reduce((sum, value) => sum + value ** 2, 0));
  const magB = Math.sqrt(vB.reduce((sum, value) => sum + value ** 2, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

function getJaccard(vA, vB) {
  let intersection = 0;
  let union = 0;

  for (let index = 0; index < vA.length; index += 1) {
    intersection += Math.min(vA[index], vB[index]);
    union += Math.max(vA[index], vB[index]);
  }

  return union ? intersection / union : 0;
}

function resolveAlgorithmCategory(item) {
  const rawCategory = (
    item.algorithmCategory ||
    item.tagId ||
    item.category ||
    ""
  ).toLowerCase();

  const matchedOption = CATEGORY_OPTIONS.find(
    (option) =>
      option.id === rawCategory ||
      option.label === rawCategory ||
      option.algorithmCategory === rawCategory,
  );

  return matchedOption ? matchedOption.algorithmCategory : rawCategory;
}

export function scoreClubRecommendation({
  club,
  userVector = null,
  recommendationsByMeetingId = {},
}) {
  const serverRecommendation = recommendationsByMeetingId[String(club.id)];
  const activeUserVector = userVector ?? DEFAULT_USER_VECTOR;
  const userVectorArray = VECTOR_KEYS.map(
    (key) => Number(activeUserVector[key]) || 0,
  );
  
  const participantAverageVector =
    club.avg_participant_vector && Array.isArray(club.avg_participant_vector)
      ? club.avg_participant_vector.map(Number)
      : [0, 0, 0, 0, 0, 0];
      
  const algorithmCategory = resolveAlgorithmCategory(club);
  
  const tagVector = VECTOR_KEYS.map((key) =>
    key === algorithmCategory ? 10.0 : 0.0,
  );
  
  const rawCosine = getCosine(userVectorArray, participantAverageVector);
  const rawJaccard = getJaccard(userVectorArray, tagVector);
  
  const fallbackScore = Math.round(((rawCosine + 1) + (rawJaccard * 2)) * 25);
  const hasServerScore = Number.isFinite(serverRecommendation?.finalScore);

  return {
    ...club,
    recommendationScore: hasServerScore
      ? serverRecommendation.finalScore
      : fallbackScore,
    tagWeightScore: hasServerScore
      ? Math.round(Number(serverRecommendation.jaccard ?? 0) * 50)
      : Math.round(rawJaccard * 2 * 25),
    recommendationSource: hasServerScore ? "server" : "hybrid_fallback",
  };
}

export function scoreAndSortClubs({
  clubs,
  userVector = null,
  recommendationsByMeetingId = {},
  sortBy = "recommend",
}) {
  const scoredClubs = clubs.map((club) =>
    scoreClubRecommendation({ club, userVector, recommendationsByMeetingId }),
  );

  return [...scoredClubs].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }

    if (sortBy === "member") {
      return Number(b.memberCount ?? 0) - Number(a.memberCount ?? 0);
    }

    return b.recommendationScore - a.recommendationScore;
  });
}