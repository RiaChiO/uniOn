# 📊 Hybrid Recommendation Dashboard (PostgreSQL Version)

---

# 🚀 1. 프로젝트 개요

이 프로젝트는 **하이브리드 추천 시스템 (User-based + Item-based)**을 기반으로
로컬 환경에서 데이터를 생성하고, 추천 결과를 계산하며, **PostgreSQL + API + React 프론트엔드**로 조회하는 시스템입니다.

---

# 📁 2. 폴더 구조

```
C:\project
│
├── backend
│   ├── app.js
│   ├── data
│   │   ├── users.json
│   │   └── meetings.json
│   ├── logic
│   │   ├── generator.js
│   │   └── recommendation.js
│   ├── server
│   └── postgres
│
├── uniOn
│   └── web1
│       ├── src
│       └── public
│
├── package.json
```

---

# ⚙️ 3. 초기 설치

## 1️⃣ 루트 프로젝트

```bash
npm install
```

## 2️⃣ 프론트엔드(React)

```bash
cd uniOn/web1
npm install
```

---

# 🧠 4. 실행 방법 (중요)

## ✅ 1단계: 데이터 생성

```bash
npm run generate
```

👉 users / meetings / 벡터 데이터 생성

---

## ✅ 2단계: 추천 결과 생성

```bash
npm run recommend
```

👉 추천 계산 로직 점검 및 시드 준비용 데이터 생성

---

## ✅ 3단계: API 서버 실행

```bash
npm run api
```

## ✅ 4단계: 프론트엔드 실행

```bash
npm run web
```

또는

```bash
cd uniOn/web1
npm run dev
```

---

# 🎯 5. 사용 방법

1. 브라우저에서 프론트엔드 접속
2. API 서버와 연결된 모임 목록/상세 확인
3. 이후 추천/생성/유저 기능을 순차적으로 연동

---

# 📊 6. 추천 점수 구성

각 모임은 다음 3가지 점수로 평가됩니다.

* Cosine Similarity (사용자 vs 참여자 평균)
* Jaccard Similarity (사용자 vs 태그)
* Hybrid Score (최종 점수)

---

# 🔥 7. 핵심 기능

✔ 랜덤 대량 데이터 생성
✔ 협업 필터링 기반 추천
✔ PostgreSQL 기반 모임/추천 데이터 조회

---

# ⚠️ 8. 주의사항

* Docker DB가 실행 중이어야 함
* `db:seed` 후 `api`와 프론트엔드를 실행해야 함

---

# 🎯 9. 한 줄 요약

👉 "PostgreSQL 데이터를 API로 읽고 React 프론트엔드에 연결하는 프로젝트"

---

# 🐘 10. PostgreSQL + Docker 실행

## ✅ 1단계: DB 컨테이너 실행

```bash
npm run db:up
```

## ✅ 2단계: (기존 로직) 데이터/추천 결과 생성

```bash
npm run generate
npm run recommend
```

## ✅ 3단계: PostgreSQL 시드 적재

```bash
npm run db:seed
```

## ✅ 4단계: API 서버 실행

```bash
npm run api
```

## ✅ 5단계: 프론트엔드 실행

```bash
npm run web
```

또는 한 번에:

```bash
npm run db:init
```

시연 모드 한 번에 실행:

```bash
npm run demo
```

CMD 배치 파일로 실행:

```bat
npm run demo:bat
```

`demo` 명령은 아래를 자동 실행:
- DB 컨테이너 실행
- API 서버 창 실행
- 대시보드 창 실행

중요: `demo`는 기존 DB 데이터를 보존합니다 (seed 실행 안 함).

데이터를 처음 상태로 초기화해서 시연하려면:

```bash
npm run demo:reset
```

`demo:reset`은 `generate -> recommend -> db:seed`를 다시 실행하므로
직접 추가한 모임/데이터가 초기화됩니다.

배치 파일 reset 모드:

```bat
npm run demo:bat:reset
```

DB 접속 기본값:

- Host: `127.0.0.1`
- Port: `5432`
- DB: `gnumatchclub`
- User: `gnu_DB`
- Password: `gnublank4898`

환경변수는 `.env.example`을 참고.

---

# 💻 11. 시연 컴퓨터로 옮기기

1. 프로젝트 폴더 전체 복사
2. 시연 PC에 Docker 설치
3. 루트에서 `npm install`
4. `npm run db:up`
5. `npm run generate && npm run recommend && npm run db:seed`
6. `npm run api`
7. `npm run web`

