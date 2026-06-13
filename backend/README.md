# GNU Club Matching Backend

Node.js HTTP 서버와 PostgreSQL 기반의 API 영역입니다. 공식/보조 JSON 데이터 시드, 모임 관리, 사용자 동기화, 추천 계산을 담당합니다.

## 실행

명령은 `project` 루트에서 실행합니다.

```powershell
npm install
npm run db:up
npm run db:seed
npm run api
```

API 주소:

```text
http://localhost:4000
```

`db:seed`는 현재 DB 데이터를 초기 시드 데이터로 다시 구성합니다. 사용자가 생성한 모임과 수정 내용이 필요하면 다시 실행하지 않습니다.

### 테스트 Google 로그인 허용

일반 모드에서 사용자 동기화는 `@gnu.ac.kr` 이메일만 허용합니다. 테스트 계정을 사용할 때는:

```powershell
npm run api:test
```

이 명령은 `ALLOW_TEST_LOGIN=true` 환경변수를 적용하여 일반 Google 계정 동기화를 허용합니다. 프론트도 `npm run dev:test`로 실행해야 합니다.

## 구조

```text
backend/
├─ app.js                         # HTTP 서버 진입점, CORS, 에러 처리
├─ data/                          # PostgreSQL 시드용 JSON
├─ logic/
│  ├─ recommendation.js           # 추천 점수 계산 함수
│  └─ seed-postgres.js            # JSON -> PostgreSQL 적재
├─ postgres/init/01_schema.sql    # Docker 최초 초기화 스키마
└─ server/
   ├─ db/pool.js                  # PostgreSQL pool
   ├─ http/                       # body 및 응답 헬퍼
   ├─ routes/apiRouter.js         # API 라우팅/요청 검증
   └─ services/                   # DB 조회 및 mutation
```

## 데이터베이스

기본 접속 정보:

```text
host: 127.0.0.1
port: 5432
database: gnumatchclub
user: gnu_DB
password: gnublank4898
```

주요 테이블:

| 테이블 | 역할 |
| --- | --- |
| `users` | Firebase 사용자 기본 정보 |
| `user_interest_vectors` | 추천용 관심 벡터 6개 |
| `meeting_types` | `club`, `small-group`, `one-time` |
| `tags` | 알고리즘 대분류 마스터 |
| `meetings` | 모임 정보, 모집 상태, 카테고리, 리더 |
| `meeting_participants` | 참여자 관계 |
| `meeting_join_requests` | 가입 신청 |
| `meeting_activities` | 활동 내역 CRUD |
| `user_wishlist_meetings` | 관심 목록 |
| `recommendations` | 저장 추천 결과 테이블 |

### 카테고리 필드

`meetings`는 두 종류의 카테고리를 가집니다.

| 컬럼 | 역할 | 예시 |
| --- | --- | --- |
| `tag_id` | 추천 계산용 대분류 | `culture` |
| `display_category` | 프론트 표시/필터용 소분류 | `music` |

추천 대분류는 `study`, `exercise`, `culture`, `game`, `religion`, `volunteer` 여섯 가지입니다.

## API

### 상태 및 사용자

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/health` | 서버 및 DB 연결 상태 |
| `GET` | `/api/users` | 사용자 목록 |
| `POST` | `/api/users/sync` | Firebase 로그인 사용자를 DB에 upsert |
| `PATCH` | `/api/users/:userId/onboarding` | 온보딩 완료 또는 건너뜀 상태 저장 |
| `GET` | `/api/users/:userId/meetings` | 참여 중인 모임 |
| `GET` | `/api/users/vectors/:userId` | 사용자 관심 벡터 |

### 관심 목록

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/users/:userId/wishlist` | 관심 모임 목록 |
| `POST` | `/api/users/:userId/wishlist` | 관심 모임 추가 |
| `DELETE` | `/api/users/:userId/wishlist/:meetingId` | 관심 모임 제거 |

### 모임

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/meetings` | 모임 목록 |
| `POST` | `/api/meetings` | 모임 생성 |
| `PATCH` | `/api/meetings/:meetingId` | 기본 정보 수정 |
| `DELETE` | `/api/meetings/:meetingId` | 모임 삭제 |
| `GET` | `/api/meeting-types` | 모임 유형 목록 |
| `PATCH` | `/api/meetings/:meetingId/recruitment` | 모집 상태 변경 |
| `PATCH` | `/api/meetings/:meetingId/leader` | 리더 위임 |
| `POST` | `/api/meetings/:meetingId/leader/transfer-and-leave` | 리더 위임과 기존 리더 탈퇴를 함께 처리 |

모임 생성 요청 예시:

```json
{
  "title": "uniOn 코딩 스터디",
  "meetingType": "small-group",
  "tagId": "study",
  "displayCategory": "it",
  "description": "웹 개발과 알고리즘을 공부합니다.",
  "hostUserId": "firebase-user-id",
  "location": "공학관 301호",
  "meetingTime": "매주 수요일 19:00",
  "maxMembers": 10,
  "joinCondition": "승인 필요"
}
```

### 가입 신청 및 멤버

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/meetings/:meetingId/members` | 참여 멤버 |
| `DELETE` | `/api/meetings/:meetingId/members/:userId` | 리더의 멤버 강퇴 |
| `DELETE` | `/api/users/:userId/meetings/:meetingId` | 회원의 모임 자진 탈퇴 |
| `GET` | `/api/meetings/:meetingId/join-requests` | 가입 대기 목록 |
| `POST` | `/api/meetings/:meetingId/join-requests` | 가입 신청 |
| `PATCH` | `/api/meetings/:meetingId/join-requests/:userId` | 신청 승인 또는 거절 |

가입 신청 결정 body:

```json
{ "action": "approve" }
```

또는:

```json
{ "action": "reject" }
```

### 알림

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/users/:userId/notifications` | 알림 목록 |
| `GET` | `/api/users/:userId/notifications?unreadOnly=true` | 읽지 않은 알림 목록 |
| `GET` | `/api/users/:userId/notifications/unread-count` | 읽지 않은 알림 개수 |
| `PATCH` | `/api/users/:userId/notifications/:notificationId/read` | 개별 알림 읽음 처리 |
| `PATCH` | `/api/users/:userId/notifications/read-all` | 전체 알림 읽음 처리 |

알림 유형:

- `join_request`: 리더에게 전달되는 가입 승인 대기 알림
- `member_joined`: 승인 없이 즉시 가입한 회원 알림
- `join_approved`: 회원에게 전달되는 가입 승인 알림
- `join_rejected`: 회원에게 전달되는 가입 거절 알림
- `member_left`: 회원의 자진 탈퇴 기록
- `member_removed`: 회원에게 전달되는 강퇴 알림
- `leader_transferred`: 새 리더에게 전달되는 리더 위임 알림

### 활동 내역

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/meetings/:meetingId/activities` | 활동 목록 |
| `POST` | `/api/meetings/:meetingId/activities` | 활동 추가 |
| `PATCH` | `/api/meetings/:meetingId/activities/:activityId` | 활동 수정 |
| `DELETE` | `/api/meetings/:meetingId/activities/:activityId` | 활동 삭제 |

활동 생성/수정 body:

```json
{
  "title": "신입생 환영회",
  "activityType": "행사",
  "activityDate": "2026-05-27"
}
```

### 추천

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/api/recommendations/:userId` | 사용자 기준 추천 목록 |

추천은 사용자 관심 벡터, 모임 참여자의 평균 벡터, 모임 `tag_id` 대분류를 사용합니다.

## 참고 사항

- 프론트엔드는 반드시 API를 통해 데이터에 접근합니다.
- `meeting_activities`, `meeting_join_requests`, `notifications`, `display_category`는 기존 DB에서도 관련 API 호출 시 필요한 구조가 생성/보완됩니다.
- Firebase 인증 도메인은 프론트 호스트인 `localhost`를 허용해야 합니다.
