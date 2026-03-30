export default function ClubCard({ club, onDetailClick }) {
  return (
    <article className="club-card">
      <div className="club-card__thumbnail">
        <span className="club-card__category-badge">{club.categoryLabel}</span>
        {club.isRecruiting && (
          <span className="club-card__recruiting-badge">모집중</span>
        )}
      </div>
      <div className="club-card__body">
        <h3 className="club-card__name">{club.name}</h3>
        <p className="club-card__description">{club.description}</p>
        <ul className="club-card__meta">
          <li className="club-card__meta-item">👥 멤버 {club.memberCount}명</li>
          <li className="club-card__meta-item">📅 {club.meetingDay}</li>
          <li className="club-card__meta-item">📍 {club.location}</li>
        </ul>
        <div className="club-card__tags">
          {club.tags.map((tag) => (
            <span key={tag} className="club-card__tag">{tag}</span>
          ))}
        </div>
        <button
          className="btn btn--outline club-card__detail-btn"
          onClick={() => onDetailClick(club.id)}
        >
          자세히 보기
        </button>
      </div>
    </article>
  );
}
