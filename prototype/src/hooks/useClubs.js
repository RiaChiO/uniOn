import { useState, useEffect } from 'react'

const STORAGE_KEY = 'clubs_v1'

// localStorage에서 초기값 읽기
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function useClubs() {
  const [clubs, setClubs] = useState(loadFromStorage)

  // clubs가 바뀔 때마다 자동으로 localStorage에 저장
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clubs))
  }, [clubs])

  // 동아리 추가
  function addClub(newClub) {
    setClubs(prev => [
      ...prev,
      { ...newClub, id: Date.now(), members: 1, joined: false },
    ])
  }

  // 참여 / 탈퇴 토글
  function toggleJoin(id) {
    setClubs(prev =>
      prev.map(club =>
        club.id === id
          ? {
              ...club,
              joined: !club.joined,
              members: club.joined ? club.members - 1 : club.members + 1,
            }
          : club
      )
    )
  }

  // 삭제
  function deleteClub(id) {
    setClubs(prev => prev.filter(club => club.id !== id))
  }

  return { clubs, addClub, toggleJoin, deleteClub }
}
