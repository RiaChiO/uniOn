import {
  ALGORITHM_CATEGORY_FALLBACKS,
  CATEGORY_IMAGE_URLS,
  CATEGORY_LABELS,
} from "../data/categoryOptions";

function mapDisplayCategory(meeting, algorithmCategory) {
  const displayCategory = meeting.displayCategory || algorithmCategory.id;

  return {
    id: displayCategory,
    label: CATEGORY_LABELS[displayCategory] ?? algorithmCategory.label,
  };
}

export function mapMeetingToClub(meeting) {
  const algorithmCategory = ALGORITHM_CATEGORY_FALLBACKS[meeting.tagId] ?? {
    id: "culture",
    label: meeting.tagId || "기타",
  };
  const displayCategory = mapDisplayCategory(meeting, algorithmCategory);
  const imageUrl =
    meeting.imageUrl ??
    CATEGORY_IMAGE_URLS[displayCategory.id] ??
    CATEGORY_IMAGE_URLS[algorithmCategory.id] ??
    null;

  return {
    id: meeting.meetingId,
    name: meeting.title,
    type: meeting.meetingType,
    typeLabel: meeting.meetingTypeLabel ?? meeting.meetingType,
    description: meeting.description,
    imageUrl,
    location: meeting.location || "장소 협의 예정",
    meetingTime: meeting.meetingTime || "일정 조율중",
    createdAt: meeting.createdAt,
    maxMembers: meeting.maxMembers ?? null,
    isRecruiting: meeting.isRecruiting ?? true,
    joinCondition: meeting.joinCondition || "등록된 조건 없음",
    hostUserId: meeting.hostUserId,
    leaderName: meeting.leaderName,
    leaderDepartment: meeting.leaderDepartment,
    leaderGrade: meeting.leaderGrade,
    memberCount: meeting.participantCount,
    tags: (meeting.tags || []).map((tag) => `#${tag}`),
    algorithmCategory: algorithmCategory.id,
    algorithmCategoryLabel: algorithmCategory.label,
    category: displayCategory.id,
    categoryLabel: displayCategory.label,
    displayCategory: displayCategory.id,
    displayCategoryLabel: displayCategory.label,
    meetingDay: meeting.meetingTime || "일정 조율중",
    avg_participant_vector: meeting.avg_participant_vector,
    tagId: meeting.tagId,
  };
}
