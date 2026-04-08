# Backend Guide

## 개요

이 폴더는 `project`의 백엔드 영역입니다.

역할은 크게 3가지입니다.

1. Node.js HTTP API 서버 실행
2. 추천 시스템용 더미 데이터 생성 및 PostgreSQL 시드 적재
3. 유저 관심 벡터 + 모임 참여자 + 모임 태그를 기반으로 추천 계산

기본 API 서버 주소는 `http://localhost:4000` 입니다.

---

## 폴더 구조

```text
backend/
├─ app.js
├─ data/
├─ logic/
├─ postgres/
└─ server/
```

### `app.js`

백엔드 진입점입니다.

- Node 기본 `http` 모듈로 서버 실행
- CORS preflight 처리
- `/api/*` 요청을 라우터로 전달
- 최상위 에러 처리

### `data/`

시드용 JSON 데이터 폴더입니다.

주요 파일:

- `users.json`
  - 유저 기본 정보와 관심 벡터 저장
- `meetings.json`
  - 모임 기본 정보 저장
  - 현재 구조는 `meetingType`, `tagId`, `participants`를 포함

현재 폴더 안의 아래 파일들은 과거 구조의 잔여 파일일 수 있습니다.

- `meeting_participant_vectors.json`
- `meeting_tag_vectors.json`
- `result.json`

현재 추천 계산과 DB 시드의 핵심 입력은 `users.json`, `meetings.json` 입니다.

### `logic/`

추천 로직과 데이터 가공 스크립트 모음입니다.

- `generator.js`
  - 더미 유저/모임 데이터 생성
  - `backend/data/users.json`, `backend/data/meetings.json` 생성
- `recommendation.js`
  - 추천 핵심 함수
  - 유저 관심 벡터
  - 모임 태그 벡터
  - 모임 참여자 평균 벡터를 기반으로 점수 계산
- `export-dashboard-data.js`
  - 생성된 JSON 데이터 기준으로 추천 결과를 계산해 파일로 출력
  - 현재는 레거시 대시보드용 보조 스크립트 성격이 강함
- `seed-postgres.js`
  - JSON 데이터를 PostgreSQL에 적재
  - 현재 DB 구조에 맞게 `users`, `tags`, `meetings`, `meeting_participants`, `recommendations` 등을 채움

### `postgres/`

PostgreSQL 초기 스키마 파일이 있습니다.

- `init/01_schema.sql`
  - Docker PostgreSQL 최초 실행 시 적용되는 스키마
  - `meetings.tag_id`, `meetings.meeting_type` 포함
  - 예전 구조의 `meeting_tags`, `meeting_tag_vectors`, `meeting_participant_vectors`는 제거 대상

### `server/`

실제 API 서버 코드입니다.

```text
server/
├─ db/
├─ http/
├─ routes/
└─ services/
```

#### `server/db/`

- `pool.js`
  - PostgreSQL 연결 풀 설정

#### `server/http/`

- `request.js`
  - 요청 body 파싱
- `response.js`
  - JSON 응답, 404 응답, CORS/preflight 처리

#### `server/routes/`

- `apiRouter.js`
  - URL, HTTP method 기준으로 서비스 함수 연결

#### `server/services/`

- `userService.js`
  - 유저 목록 조회
- `meetingService.js`
  - 모임 목록 조회
  - 모임 생성
- `recommendationService.js`
  - 특정 유저의 추천 목록 계산
  - 현재는 DB에 저장된 추천 테이블을 읽기보다, 현재 DB 데이터로 실시간 계산

---

## 현재 백엔드 데이터 구조

현재 설계 핵심은 아래와 같습니다.

- `users`
  - 유저 기본 정보
- `user_interest_vectors`
  - 유저 관심 벡터
- `tags`
  - 태그 마스터
- `meetings`
  - 모임 기본 정보
  - `meeting_type`
  - `tag_id`
  - `host_user_id`
- `meeting_participants`
  - 모임 참여자 관계

중요한 설계 포인트:

- `meeting_tags`는 사용하지 않고, `meetings.tag_id` 하나로 관리
- `meeting_participant_vectors`는 저장하지 않음
- 참여자 평균 벡터는 추천 계산 시점에 동적으로 계산

---

## API 목록

### `GET /api/health`

서버/DB 연결 상태 확인

예시 응답:

```json
{
  "status": "ok",
  "database": "connected"
}
```

### `GET /api/users`

유저 목록 조회

### `GET /api/meetings`

모임 목록 조회

주요 응답 필드:

- `meetingId`
- `title`
- `meetingType`
- `tagId`
- `description`
- `hostUserId`
- `createdAt`
- `tags`
- `participantCount`

### `POST /api/meetings`

모임 생성

요청 body:

```json
{
  "title": "GNU 코딩 스터디",
  "meetingType": "small-group",
  "tagId": "study",
  "description": "알고리즘과 웹 개발을 함께 공부하는 모임",
  "hostUserId": "user1"
}
```

`meetingType` 허용값:

- `club`
- `small-group`
- `one-time`

### `GET /api/recommendations/:userId`

특정 유저 기준 추천 목록 조회

현재 동작 방식:

- `user_interest_vectors` 조회
- 모든 모임의 참여자 목록 조회
- 참여자 평균 벡터를 실시간 계산
- 모임 `tag_id`를 태그 벡터로 변환
- 최종 추천 점수 계산 후 응답

---

## 실행 방법

아래 명령은 `project` 루트에서 실행합니다.

### 1. DB 컨테이너 실행

```powershell
npm run db:up
```

### 2. 더미 데이터 생성

```powershell
npm run generate
```

생성 결과:

- `backend/data/users.json`
- `backend/data/meetings.json`

### 3. 추천 결과 파일 생성

```powershell
npm run recommend
```

이 명령은 레거시 대시보드용 추천 JSON 파일을 생성합니다.
현재 API 자체는 추천을 DB 실시간 계산 방식으로 처리합니다.

### 4. PostgreSQL 시드 적재

```powershell
npm run db:seed
```

### 5. API 서버 실행

```powershell
npm run api
```

실행 후:

```text
http://localhost:4000
```

---

## 가장 자주 쓰는 순서

처음부터 다시 준비할 때:

```powershell
npm run db:up
npm run generate
npm run recommend
npm run db:seed
npm run api
```

DB만 켜고 API만 다시 띄울 때:

```powershell
npm run api
```

데이터를 새로 만들고 DB에 다시 넣고 싶을 때:

```powershell
npm run generate
npm run recommend
npm run db:seed
```

---

## 추천 로직 요약

현재 추천 점수는 아래 두 값을 합쳐 계산합니다.

1. `cosine similarity`
   - 유저 관심 벡터 vs 모임 참여자 평균 벡터
2. `jaccard similarity`
   - 유저 관심 벡터 vs 모임 태그 벡터

최종 점수:

```text
hybrid = cosine + jaccard
finalScore = Math.round(hybrid * 50)
```

---

## 참고 사항

- 프론트는 DB에 직접 연결하지 않고 반드시 이 백엔드 API를 통해 접근해야 합니다.
- 모임 생성 시 `meetingType`, `tagId`, `hostUserId`가 반드시 필요합니다.
- 추천은 현재 DB 데이터를 기준으로 계산되므로, 참여자가 바뀌면 다음 조회 시 새로운 결과가 반영됩니다.
- `recommendations` 테이블은 현재 실시간 추천 API의 필수 의존성은 아닙니다. 필요하면 나중에 더 정리할 수 있습니다.
