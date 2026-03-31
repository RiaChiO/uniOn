import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './CreateClubPage.module.css'

const CATEGORIES = ['학술', '문화/예술', '스포츠', '봉사', '기술', '기타']

export default function CreateClubPage({ onAdd }) {
  const navigate = useNavigate()

  // 폼 상태
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('학술')
  const [error, setError] = useState('')

  function handleSubmit() {
    // 유효성 검사
    if (!name.trim()) {
      setError('동아리 이름을 입력해 주세요.')
      return
    }

    // 부모(App)에 새 동아리 전달
    onAdd({ name: name.trim(), description: description.trim(), category })

    // 목록 페이지로 이동 (React Router)
    navigate('/')
  }

  return (
    <div>
      <h1 className={styles.title}>동아리 만들기</h1>
      <p className={styles.subtitle}>새 동아리를 등록하고 멤버를 모집하세요</p>

      <div className={styles.card}>
        {/* 이름 */}
        <div className={styles.group}>
          <label className={styles.label}>동아리 이름 *</label>
          <input
            className={styles.input}
            type="text"
            placeholder="예: 천문학 동아리 스타게이저"
            value={name}
            onChange={e => {
              setName(e.target.value)
              setError('')          // 입력하면 에러 초기화
            }}
          />
          {error && <p className={styles.error}>{error}</p>}
        </div>

        {/* 소개 */}
        <div className={styles.group}>
          <label className={styles.label}>소개</label>
          <textarea
            className={styles.textarea}
            placeholder="어떤 동아리인지 간단히 소개해 주세요"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* 분야 */}
        <div className={styles.group}>
          <label className={styles.label}>분야</label>
          <select
            className={styles.select}
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <button className={styles.submit} onClick={handleSubmit}>
          등록하기
        </button>
      </div>
    </div>
  )
}
