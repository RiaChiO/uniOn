import { STATS } from "../data/mockData";

export default function HeroSection({ onBrowseClick, onCreateClick }) {
  return (
    <section className="hero">
      <div className="hero__inner">
        <div className="hero__content">
          <h1 className="hero__heading">
            <span className="hero__heading-line">경상대에서</span>
            <span className="hero__heading-line">
              <em className="hero__heading-highlight">나와 맞는 소모임</em>을
            </span>
            <span className="hero__heading-line">찾아보세요</span>
          </h1>
          <p className="hero__description">
            학업, 취미, 운동, 봉사 등 다양한 분야의 소모임과<br />
            함께 성장할 동료들을 만나보세요
          </p>
          <div className="hero__actions">
            <button className="btn btn--primary" onClick={onBrowseClick}>
              소모임 둘러보기 →
            </button>
            <button className="btn btn--secondary" onClick={onCreateClick}>
              소모임 만들기
            </button>
          </div>
        </div>
        <div className="hero__stats">
          {STATS.map((stat) => (
            <div key={stat.label} className="hero__stat-item">
              <span className="hero__stat-value">{stat.value}</span>
              <span className="hero__stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
