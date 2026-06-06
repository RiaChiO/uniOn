import { useEffect, useState } from "react";
import { getMeetings } from "../api/meetings";
import { getMeetingTypes } from "../api/meetingTypes";
import { mapMeetingToClub } from "../lib/meetingMapper";

function getStoredMeetingTypes() {
  try {
    const stored = localStorage.getItem("meetingTypes");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useMeetingCatalog() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [meetingTypes, setMeetingTypes] = useState(getStoredMeetingTypes);
  const [meetingTypesLoading, setMeetingTypesLoading] = useState(
    meetingTypes.length === 0
  );
  const [meetingTypesError, setMeetingTypesError] = useState("");

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

  return {
    clubs,
    loading,
    loadError,
    meetingTypes,
    meetingTypesError,
    meetingTypesLoading,
    setClubs,
  };
}
