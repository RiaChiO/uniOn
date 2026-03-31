import styles from './ClubCard.module.css'

export default function ClubCard({ club, onToggleJoin, onDelete }) {
  return (
    <div className={styles.card}>
      <div className={styles.info}>
        <h3 className={styles.name}>{club.name}</h3>
        <p className={styles.desc}>{club.description || '소개가 없습니다.'}</p>
        <div className={styles.meta}>
          <span className={styles.badge}>{club.category}</span>
          <span className={styles.members}>👥 {club.members}명</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={club.joined ? styles.leaveBtn : styles.joinBtn}
          onClick={() => onToggleJoin(club.id)}
        >
          {club.joined ? '✓ 참여 중' : '참여하기'}
        </button>
        <button
          className={styles.deleteBtn}
          onClick={() => onDelete(club.id)}
          title="삭제"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
