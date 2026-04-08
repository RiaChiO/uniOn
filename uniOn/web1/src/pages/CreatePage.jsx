// 📌 CreatePage - 모임 만들기 (기본 정보만 입력)
// 🔧 [기능 포인트]
//   - onSubmit      : 모임 만들기 버튼 → 소모임 생성 API 연결
//                     완료 후 navigate(`/clubs/${newId}`) 로 상세 페이지 이동
//   - onCancel      : 취소 버튼 → 이전 페이지 이동
//   - onImageUpload : 이미지 업로드 → 파일 업로드 API 연결

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CATEGORIES } from "../data/mockData";

const CLUB_TYPES = [
  { id: "club",        emoji: "🏛️", label: "동아리",    desc: "정식 등록" },
  { id: "small-group", emoji: "👥", label: "소모임",    desc: "자유 활동" },
  { id: "one-time",    emoji: "⚡", label: "일회성모임", desc: "단기 진행" },
];

export default function CreatePage({
  onSubmit,
  onCancel,
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
}) {
  const [image,       setImage]       = useState(null);
  const [name,        setName]        = useState("");
  const [type,        setType]        = useState("");
  const [category,    setCategory]    = useState("");
  const [description, setDescription] = useState("");
  const [location,    setLocation]    = useState("");
  const [meetingTime, setMeetingTime] = useState("");
  const [maxMembers,  setMaxMembers]  = useState("");
  const [tags,        setTags]        = useState([]);
  const [tagInput,    setTagInput]    = useState("");
  const [conditions,  setConditions]  = useState({ approval: false, department: false, grade: false });

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      const newTag = tagInput.startsWith("#") ? tagInput.trim() : `#${tagInput.trim()}`;
      setTags((prev) => [...prev, newTag]);
      setTagInput("");
    }
  };

  const removeTag = (index) => setTags((prev) => prev.filter((_, i) => i !== index));

  const selectedTypeLabel     = CLUB_TYPES.find((t) => t.id === type)?.label ?? "유형 선택";
  const selectedCategoryLabel = CATEGORIES.find((c) => c.id === category)?.label ?? "분야 선택";

  return (
    <div className="create-page">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        isLoggedIn={isLoggedIn}
        user={user}
        onLoginClick={onLoginClick}
      />

      <main className="create-page__main">
        <div className="create-page__layout">

          {/* 왼쪽 - 폼 */}
          <div className="create-page__form-col">
            <div className="create-page__header">
              <h1 className="create-page__title">모임 만들기</h1>
              <p className="create-page__subtitle">
                기본 정보를 입력하고 모임을 개설하세요.
                멤버 관리, 활동 추가 등은 개설 후 모임 관리 페이지에서 할 수 있어요.
              </p>
            </div>

            <div className="create-box">
              <div className="create-box__form">

                {/* 대표 이미지 */}
                <div className="form-field">
                  <label className="form-field__label">대표 이미지</label>
                  <div
                    className="create-box__image-upload"
                    onClick={() => document.getElementById("imageInput").click()}
                  >
                    <input
                      id="imageInput"
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => setImage(e.target.files[0])}
                    />
                    {image ? (
                      <p>📎 {image.name}</p>
                    ) : (
                      <>
                        <p>🖼️ 클릭하여 이미지 업로드</p>
                        <p className="create-box__image-hint">JPG, PNG (최대 5MB)</p>
                      </>
                    )}
                  </div>
                </div>

                {/* 모임명 */}
                <div className="form-field">
                  <label className="form-field__label">모임명 *</label>
                  <input
                    className="form-field__input"
                    type="text"
                    placeholder="예: GNU 코딩 스터디"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* 모임 유형 */}
                <div className="form-field">
                  <label className="form-field__label">모임 유형 *</label>
                  <div className="create-type-group">
                    {CLUB_TYPES.map((t) => (
                      <button
                        key={t.id}
                        className={`create-type-btn ${type === t.id ? "create-type-btn--active" : ""}`}
                        onClick={() => setType(t.id)}
                      >
                        <span className="create-type-btn__emoji">{t.emoji}</span>
                        <span className="create-type-btn__label">{t.label}</span>
                        <span className="create-type-btn__desc">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 관심 분야 */}
                <div className="form-field">
                  <label className="form-field__label">관심 분야 *</label>
                  <select
                    className="form-field__input form-field__select"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="">분야 선택</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.icon} {cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* 소개 */}
                <div className="form-field">
                  <label className="form-field__label">소개 *</label>
                  <textarea
                    className="form-field__textarea"
                    placeholder={`모임에 대해 소개해주세요\n\n- 어떤 활동을 하나요?\n- 어떤 분들이 함께하면 좋을까요?`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                  <p className="form-field__hint">최소 50자 이상 작성해주세요</p>
                </div>

                {/* 활동 장소 + 모임 시간 */}
                <div className="create-box__two-col">
                  <div className="form-field">
                    <label className="form-field__label">활동 장소</label>
                    <input
                      className="form-field__input"
                      type="text"
                      placeholder="예: 공학관 3층"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div className="form-field">
                    <label className="form-field__label">정기 모임 시간</label>
                    <input
                      className="form-field__input"
                      type="text"
                      placeholder="예: 매주 수요일 19:00"
                      value={meetingTime}
                      onChange={(e) => setMeetingTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* 최대 인원 */}
                <div className="form-field">
                  <label className="form-field__label">최대 인원</label>
                  <input
                    className="form-field__input"
                    type="number"
                    placeholder="최대 인원 수"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(e.target.value)}
                    style={{ maxWidth: "200px" }}
                  />
                </div>

                {/* 태그 */}
                <div className="form-field">
                  <label className="form-field__label">태그</label>
                  <input
                    className="form-field__input"
                    type="text"
                    placeholder="태그 입력 후 Enter"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                  />
                  {tags.length > 0 && (
                    <div className="create-box__tags">
                      {tags.map((tag, index) => (
                        <span key={index} className="create-box__tag">
                          {tag}
                          <button className="create-box__tag-remove" onClick={() => removeTag(index)}>✕</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 가입 조건 */}
                <div className="form-field">
                  <label className="form-field__label">가입 조건</label>
                  <div className="create-box__conditions">
                    {[
                      { key: "approval",   label: "승인 필요" },
                      { key: "department", label: "학과 제한" },
                      { key: "grade",      label: "학년 제한" },
                    ].map(({ key, label }) => (
                      <label key={key} className="form-field__checkbox-row">
                        <input
                          type="checkbox"
                          checked={conditions[key]}
                          onChange={(e) => setConditions((prev) => ({ ...prev, [key]: e.target.checked }))}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* 버튼 */}
                <div className="create-box__actions">
                  <button className="btn btn--secondary" onClick={onCancel}>취소</button>
                  <button
                    className="btn btn--primary"
                    // 🔧 [기능] API 연결 후 navigate(`/clubs/${newId}`) 로 상세 페이지 이동
                    onClick={() => onSubmit && onSubmit({ image, name, type, category, description, location, meetingTime, maxMembers, tags, conditions })}
                  >
                    모임 만들기
                  </button>
                </div>

              </div>
            </div>
          </div>

          {/* 오른쪽 - 미리보기 */}
          <div className="create-page__preview-col">
            <div className="create-preview">
              <h3 className="create-preview__title">미리보기</h3>
              <div className="create-preview__card">
                <div className="create-preview__thumb" />
                <div className="create-preview__body">
                  <div className="create-preview__badges">
                    <span className="club-detail__badge">{selectedTypeLabel}</span>
                    <span className="club-detail__badge club-detail__badge--category">{selectedCategoryLabel}</span>
                  </div>
                  <div className="create-preview__name">{name || "모임명을 입력하세요"}</div>
                  <div className="create-preview__desc">{description || "소개를 입력하세요"}</div>
                  <div className="create-preview__meta">
                    <span>👥 {maxMembers || 0}명</span>
                    <span>📍 {location || "장소 미정"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 안내 */}
            <div className="create-tip">
              <h4 className="create-tip__title">💡 개설 후 추가 가능</h4>
              <ul className="create-tip__list">
                <li>멤버 가입 승인 / 관리</li>
                <li>활동 내역 및 사진 추가</li>
                <li>모집 상태 변경</li>
                <li>모임 정보 수정</li>
              </ul>
              <p className="create-tip__desc">모임 개설 후 상세 페이지의 <br/><strong>모임 관리</strong> 버튼에서 할 수 있어요!</p>
            </div>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
