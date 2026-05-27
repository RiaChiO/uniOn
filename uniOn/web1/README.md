# GNU Club Matching Frontend

React와 Vite로 구현된 모임 탐색 UI입니다. 데이터 변경은 PostgreSQL에 직접 접근하지 않고 `/api` 프록시를 통해 백엔드 API로 처리합니다.

## 실행

```powershell
npm install
npm run dev
```

개발 서버:

```text
http://localhost:5273
```

Vite는 `/api` 요청을 `http://localhost:4000`으로 프록시합니다. 따라서 화면 기능을 확인하려면 백엔드 API도 실행되어 있어야 합니다.

## 테스트 로그인

일반 실행은 `@gnu.ac.kr` 계정만 허용합니다. 테스트 Google 계정을 사용할 때는:

```powershell
npm run dev:test
```

그리고 백엔드는 프로젝트 루트에서 다음 명령으로 실행해야 합니다.

```powershell
npm run api:test
```

`dev:test`는 [.env.test](./.env.test)의 `VITE_ALLOW_TEST_LOGIN=true`를 읽습니다. Firebase Authentication 설정에는 `localhost`가 Authorized domain으로 등록되어 있어야 하며, 접속 주소도 `http://localhost:5273`을 사용합니다.

## 화면 경로

| 경로 | 화면 |
| --- | --- |
| `/` | 메인 및 인기 모임 목록 |
| `/login` | Google 로그인 |
| `/search` | 검색, 필터, 추천 정렬 |
| `/clubs/:id` | 모임 상세, 활동/멤버, 가입/관심 목록 |
| `/clubs/:id/manage` | 리더 전용 관리, 활동 CRUD, 멤버/모집 관리 |
| `/mypage` | 내 모임 및 관심 목록 |
| `/create` | 모임 생성 |

## 주요 구조

```text
src/
├─ App.jsx                       # 라우트 구성 및 전역 훅 연결
├─ api/                          # 백엔드 API 클라이언트
├─ components/                   # Navbar, ClubCard 등 공통 UI
├─ data/
│  └─ categoryOptions.js         # 표시 소분류와 알고리즘 대분류 매핑
├─ hooks/
│  ├─ useAuthSession.js          # Firebase 로그인/유저 동기화
│  ├─ useMeetingCatalog.js       # 모임 및 유형 목록
│  ├─ useMeetingActions.js       # 모임 관리 액션
│  ├─ useRecommendations.js      # 추천 조회
│  └─ useWishlist.js             # 관심 목록
├─ lib/
│  ├─ firebase.js                # Firebase Auth 설정
│  └─ meetingMapper.js           # API 모임 응답 -> 화면 모델 변환
├─ pages/                        # 화면 단위 컴포넌트
└─ styles/global.css             # 공통 및 화면 스타일
```

## 카테고리 설계

사용자가 보는 소분류와 추천 알고리즘의 대분류는 분리됩니다.

| 화면 소분류 | 알고리즘 대분류 |
| --- | --- |
| 학술/교육, IT/개발, 언어/국제, 창업/경영 | `study` |
| 운동/스포츠 | `exercise` |
| 음악/공연, 미술/공예, 사진/영상, 네트워킹, 문화/취미 | `culture` |
| 게임/e스포츠 | `game` |
| 봉사/사회 | `volunteer` |
| 종교 | `religion` |

`categoryOptions.js`가 이 대응을 정의하고, `meetingMapper.js`는 API의 `tagId`와 `displayCategory`를 카드/상세 화면용 필드로 변환합니다.

## 인증 동작

- Google 팝업 로그인 사용
- 로그인 시 항상 Google 계정 선택 화면 표시
- 일반 모드는 학교 이메일 도메인 확인 후 `/api/users/sync` 호출
- 테스트 모드는 `.env.test`가 활성화된 경우 일반 Google 계정 허용

## 빌드

```powershell
npm run build
```
