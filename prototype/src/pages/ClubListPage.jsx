import ClubCard from '../components/ClubCard'
import styles from './ClubListPage.module.css'

export default function ClubListPage({ clubs, onToggleJoin, onDelete }) {
  const joinedCount = clubs.filter(c => c.joined).length

  return (
    <div>
      <h1 className={styles.title}>동아리 찾기</h1>
      <p className={styles.subtitle}>관심 있는 동아리에 참여해보세요</p>

      {/* 통계 카드 */}
      <div className={styles.stats}>
        <div className={styles.statBox}>
          <span className={styles.statNum}>{clubs.length}</span>
          <span className={styles.statLabel}>전체 동아리</span>
        </div>
        <div className={styles.statBox}>
          <span className={styles.statNum}>{joinedCount}</span>
          <span className={styles.statLabel}>내가 참여 중</span>
        </div>
      </div>

      {/* 목록 */}
      {clubs.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🌱</span>
          <p>아직 등록된 동아리가 없어요.</p>
          <p>첫 동아리를 만들어보세요!</p>
        </div>
      ) : (
        <div className={styles.list}>
          {clubs.map(club => (
            <ClubCard
              key={club.id}
              club={club}
              onToggleJoin={onToggleJoin}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
