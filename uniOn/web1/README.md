# GNU Club Matching — 팀원 개발 가이드

## 시작하기

처음 받았을 때 딱 한 번만 실행

```bash
npm install
npm install react-router-dom
```

매번 실행할 때

```bash
npm run dev
```

브라우저에서 확인 → http://localhost:5173

---

## 📁 프로젝트 구조

```
web/
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx                  # React 진입점 + 라우터 설정
    ├── App.jsx                   # 전체 라우터 + 전역 상태 허브
    ├── styles/
    │   └── global.css            # 전체 스타일 (디자인 토큰 포함)
    ├── data/
    │   └── mockData.js           # 더미 데이터 (API 연동 전까지 사용)
    ├── components/               # 공통 컴포넌트
    │   ├── Navbar.jsx
    │   ├── HeroSection.jsx
    │   ├── SearchSection.jsx
    │   ├── ClubListSection.jsx
    │   ├── ClubCard.jsx
    │   └── Footer.jsx
    └── pages/                    # 각 페이지
        ├── LoginPage.jsx
        ├── SignupPage.jsx
        ├── SearchPage.jsx
        ├── MyPage.jsx
        └── CreatePage.jsx
```

---

## 🌐 페이지 주소

| 주소                           | 화면        |
| ------------------------------ | ----------- |
| `http://localhost:5173/`       | 메인        |
| `http://localhost:5173/login`  | 로그인      |
| `http://localhost:5173/signup` | 회원가입    |
| `http://localhost:5173/search` | 검색        |
| `http://localhost:5173/mypage` | 마이페이지  |
| `http://localhost:5173/create` | 모임 만들기 |

---

## 🔧 기능 추가 방법

코드에서 `TODO` 주석을 검색하면 기능 붙여야 할 위치가 전부 나와요.

### 로그인

`App.jsx`에서 `/login` Route 찾아서 `onLogin` 부분에 API 연결

```jsx
onLogin={() => console.log("TODO: 로그인 API 연결")}
// ↓ 교체
onLogin={async ({ email, password }) => {
  const res = await fetch("/api/login", { ... });
  setIsLoggedIn(true);
  setUser(res.data);
}}
```

### 회원가입

`App.jsx`에서 `/signup` Route 찾아서 `onSignup` 부분에 API 연결

### 실제 데이터 연동

`src/data/mockData.js` 더미 데이터를 API 응답으로 교체
`ClubListSection.jsx`의 `useMemo` 필터링 부분을 아래로 교체

```jsx
useEffect(() => {
  fetch(
    `/api/clubs?q=${searchQuery}&type=${selectedType}&category=${selectedCategory}`,
  )
    .then((res) => res.json())
    .then((data) => setClubs(data));
}, [searchQuery, selectedType, selectedCategory]);
```

### 페이지 이동

현재 `window.location.href` 로 되어있는 부분을 `useNavigate` 로 교체 권장

```jsx
import { useNavigate } from "react-router-dom";
const navigate = useNavigate();
navigate("/login");
```

---

## 🎨 디자인 수정

`src/styles/global.css` 상단 `:root` 의 CSS 변수만 바꾸면 전체 색상이 바뀌어요

```css
--color-primary: #3b82f6; /* 메인 컬러 */
--color-text: #111827; /* 본문 텍스트 */
--max-width: 1200px; /* 레이아웃 최대 너비 */
```
