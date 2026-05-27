import { useState } from "react";
import {
  createMeeting,
  createMeetingJoinRequest,
  deleteMeeting,
  removeMeetingMember,
  transferMeetingLeadership,
  updateMeeting,
  updateMeetingJoinRequest,
  updateMeetingRecruitment,
} from "../api/meetings";
import { CATEGORY_TO_TAG_ID } from "../data/categoryOptions";
import { mapMeetingToClub } from "../lib/meetingMapper";

export function useMeetingActions({ navigate, setClubs, user }) {
  const [joiningMeetingId, setJoiningMeetingId] = useState("");

  async function handleCreateMeeting(formData) {
    const title = String(formData?.name ?? "").trim();
    const meetingType = String(formData?.type ?? "").trim();
    const categoryId = String(formData?.category ?? "").trim();
    const tagId = CATEGORY_TO_TAG_ID[categoryId] ?? "";
    const displayCategory = categoryId;
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
        displayCategory,
        tags: formData?.tags ?? [],
        description,
        hostUserId,
        location: String(formData?.location ?? "").trim() || null,
        meetingTime: String(formData?.meetingTime ?? "").trim() || null,
        maxMembers:
          formData?.maxMembers === "" || formData?.maxMembers == null
            ? null
            : Number(formData.maxMembers),
        joinCondition:
          [
            formData?.conditions?.approval ? "승인 필요" : "",
            formData?.conditions?.department ? "학과 제한" : "",
            formData?.conditions?.grade ? "학년 제한" : "",
          ]
            .filter(Boolean)
            .join(", ") || null,
      });

      const createdMeeting = data.meeting ?? data;
      const createdClub = mapMeetingToClub({
        ...createdMeeting,
        leaderName: createdMeeting.leaderName || user?.name,
      });
      setClubs((prev) => [...prev, createdClub]);
      navigate(`/clubs/${createdClub.id}`);
    } catch (error) {
      window.alert(error.message || "모임 생성 중 오류가 발생했습니다.");
    }
  }

  async function handleJoinRequest(meetingId) {
    const userId = user?.id ?? user?.userId;

    if (!userId) {
      window.alert("로그인 후 가입 신청할 수 있습니다.");
      return false;
    }

    if (!window.confirm("이 모임에 가입 신청하시겠습니까?")) {
      return false;
    }

    try {
      setJoiningMeetingId(meetingId);
      const data = await createMeetingJoinRequest(meetingId, userId);

      window.alert(data.message || "가입 신청이 접수되었습니다.");
      return true;
    } catch (error) {
      window.alert(error.message || "가입 신청 중 오류가 발생했습니다.");
      return false;
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

  async function handleSaveMeeting(meetingId, formData) {
    const title = String(formData?.name ?? "").trim();
    const description = String(formData?.description ?? "").trim();
    const location = String(formData?.location ?? "").trim() || null;
    const meetingTime = String(formData?.meetingTime ?? "").trim() || null;
    const joinCondition = String(formData?.joinCondition ?? "").trim() || null;
    const maxMembers =
      formData?.maxMembers === "" || formData?.maxMembers == null
        ? null
        : Number(formData.maxMembers);
    const tagId = formData?.tagId || null;

    if (!title || !description) {
      window.alert("모임명과 소개는 필수입니다.");
      return;
    }

    try {
      const data = await updateMeeting(meetingId, {
        title,
        description,
        location,
        meetingTime,
        maxMembers,
        tagId,
        displayCategory: formData?.displayCategory,
        tags: formData?.tags ?? [],
        joinCondition,
      });

      const updatedMeeting = data.meeting ?? data;
      setClubs((prev) =>
        prev.map((club) =>
          String(club.id) === String(meetingId)
            ? { ...club, ...mapMeetingToClub(updatedMeeting) }
            : club
        )
      );
      window.alert(data.message || "모임 정보가 수정되었습니다.");
    } catch (error) {
      window.alert(error.message || "모임 수정 중 오류가 발생했습니다.");
    }
  }

  async function handleDeleteMeeting(meetingId) {
    if (!window.confirm("정말로 이 모임을 삭제하시겠습니까?")) {
      return;
    }

    try {
      const data = await deleteMeeting(meetingId);
      setClubs((prev) =>
        prev.filter((club) => String(club.id) !== String(meetingId))
      );
      window.alert(data.message || "모임을 삭제했습니다.");
      navigate("/");
    } catch (error) {
      window.alert(error.message || "모임 삭제 중 오류가 발생했습니다.");
    }
  }

  async function handleRemoveMeetingMember(meetingId, memberId) {
    if (!window.confirm("이 멤버를 모임에서 내보내시겠습니까?")) {
      return false;
    }

    try {
      const data = await removeMeetingMember(meetingId, memberId);
      setClubs((prev) =>
        prev.map((club) =>
          String(club.id) === String(meetingId)
            ? {
                ...club,
                memberCount: Math.max(0, Number(club.memberCount || 0) - 1),
              }
            : club
        )
      );
      window.alert(data.message || "멤버를 내보냈습니다.");
      return true;
    } catch (error) {
      window.alert(error.message || "멤버 내보내기 중 오류가 발생했습니다.");
      throw error;
    }
  }

  async function handleTransferLeader(meetingId, memberId, memberName) {
    if (!window.confirm("이 멤버에게 리더를 위임하시겠습니까?")) {
      return false;
    }

    try {
      const data = await transferMeetingLeadership(meetingId, memberId);
      setClubs((prev) =>
        prev.map((club) =>
          String(club.id) === String(meetingId)
            ? {
                ...club,
                hostUserId: memberId,
                leaderName: memberName || club.leaderName,
              }
            : club
        )
      );
      window.alert(data.message || "리더를 위임했습니다.");
      return true;
    } catch (error) {
      window.alert(error.message || "리더 위임 중 오류가 발생했습니다.");
      throw error;
    }
  }

  async function handleToggleMeetingRecruitment(meetingId, nextIsRecruiting) {
    try {
      const data = await updateMeetingRecruitment(meetingId, nextIsRecruiting);
      const updatedMeeting = data.meeting ?? data;
      setClubs((prev) =>
        prev.map((club) =>
          String(club.id) === String(meetingId)
            ? { ...club, isRecruiting: updatedMeeting.isRecruiting }
            : club
        )
      );
      window.alert(data.message || "모집 상태를 변경했습니다.");
    } catch (error) {
      window.alert(error.message || "모집 상태 변경 중 오류가 발생했습니다.");
      throw error;
    }
  }

  return {
    handleCreateMeeting,
    handleDeleteMeeting,
    handleJoinRequest,
    handleJoinRequestDecision,
    handleRemoveMeetingMember,
    handleSaveMeeting,
    handleToggleMeetingRecruitment,
    handleTransferLeader,
    joiningMeetingId,
  };
}
