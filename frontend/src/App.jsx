import { Routes, Route, NavLink } from 'react-router-dom'
import { useClubs } from './hooks/useClubs'
import ClubListPage from './pages/ClubListPage'
import CreateClubPage from './pages/CreateClubPage'
import styles from './App.module.css'

export default function App() {
  // 커스텀 훅으로 모든 상태 & localStorage 관리
  const { clubs, addClub, toggleJoin, deleteClub } = useClubs()

  return (
    <div className={styles.layout}>
      {/* ── 네비게이션 바 */}
      <nav className={styles.nav}>
        <span className={styles.logo}>🎓 동아리 플랫폼</span>
        <div className={styles.links}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.active}` : styles.link
            }
          >
            목록
          </NavLink>
          <NavLink
            to="/create"
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.active}` : styles.link
            }
          >
            + 만들기
          </NavLink>
        </div>
      </nav>

      {/* ── 페이지 라우팅 */}
      <main className={styles.main}>
        <Routes>
          <Route
            path="/"
            element={
              <ClubListPage
                clubs={clubs}
                onToggleJoin={toggleJoin}
                onDelete={deleteClub}
              />
            }
          />
          <Route
            path="/create"
            element={<CreateClubPage onAdd={addClub} />}
          />
        </Routes>
      </main>
    </div>
  )
}
