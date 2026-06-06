export default function ClubCard({ club, onDetailClick }) {
  return (
    <article className="club-card">
      <div className="club-card__thumbnail">
        {club.imageUrl && (
          <img
            className="club-card__image"
            src={club.imageUrl}
            alt=""
            loading="lazy"
          />
        )}
        <div className="club-card__classification">
          <span className="club-card__category-text">{club.categoryLabel}</span>
          <span className="club-card__classification-divider" />
          <span className="club-card__type-text">{club.typeLabel}</span>
        </div>
        <span
          className={`club-card__recruiting-badge ${
            club.isRecruiting ? "" : "club-card__recruiting-badge--closed"
          }`}
        >
          {club.isRecruiting ? "모집중" : "모집 완료"}
        </span>
      </div>
      <div className="club-card__body">
        <h3 className="club-card__name">{club.name}</h3>
        <p className="club-card__description">{club.description}</p>
        <ul className="club-card__meta">
          <li className="club-card__meta-item">👥 멤버 {club.memberCount}명</li>
          <li className="club-card__meta-item">📅 {club.meetingDay}</li>
          <li className="club-card__meta-item">📍 {club.location}</li>
        </ul>
        {club.tags.length > 0 && (
          <div className="club-card__tags">
            {club.tags.map((tag) => (
              <span key={tag} className="club-card__tag">
                {tag}
              </span>
            ))}
          </div>
        )}
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
