// 📌 CreatePage - 모임 만들기 (기본 정보만 입력)
// 🔧 [기능 포인트]
//   - onSubmit      : 모임 만들기 버튼 → 소모임 생성 API 연결
//                     완료 후 navigate(`/clubs/${newId}`) 로 상세 페이지 이동
//   - onCancel      : 취소 버튼 → 이전 페이지 이동
//   - onImageUpload : 이미지 업로드 → 파일 업로드 API 연결

import { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { CATEGORY_OPTIONS } from "../data/categoryOptions";

export default function CreatePage({
  onSubmit,
  onCancel,
  searchQuery,
  onSearchChange,
  isLoggedIn,
  user,
  onLoginClick,
  meetingTypes = [],
  meetingTypesLoading = false,
  meetingTypesError = "",
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
  const [conditions,  setConditions]  = useState({ approval: false });

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      const newTag = tagInput.startsWith("#") ? tagInput.trim() : `#${tagInput.trim()}`;
      setTags((prev) => [...prev, newTag]);
      setTagInput("");
    }
  };

  const removeTag = (index) => setTags((prev) => prev.filter((_, i) => i !== index));

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
                      accept="image/jpeg,image/png,image/webp"
                      style={{ display: "none" }}
                      onChange={(e) => setImage(e.target.files[0])}
                    />
                    {image ? (
                      <p>📎 {image.name}</p>
                    ) : (
                      <>
                        <p>🖼️ 클릭하여 이미지 업로드</p>
                        <p className="create-box__image-hint">JPG, PNG, WebP (최대 5MB)</p>
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
                  <select
                    className="form-field__input form-field__select"
                    value={type}
                    disabled={meetingTypesLoading || Boolean(meetingTypesError)}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="">
                      {meetingTypesLoading
                        ? "모임 유형을 불러오는 중"
                        : meetingTypesError || "유형 선택"}
                    </option>
                    {meetingTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.emoji} {t.label} {t.desc ? `- ${t.desc}` : ""}
                      </option>
                    ))}
                  </select>
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
                    {CATEGORY_OPTIONS.map((cat) => (
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
      </main>

      <Footer />
    </div>
  );
}
