# GNU Club Matching

경상국립대학교 학생을 위한 모임 탐색 및 추천 서비스입니다. React/Vite 프론트엔드, Node.js API 서버, PostgreSQL 데이터베이스로 구성되어 있습니다.

## 주요 기능

- 동아리, 소모임, 일회성 모임 탐색 및 필터링
- Google 로그인 및 사용자 동기화
- 모임 생성, 수정, 삭제 및 모집 상태 관리
- 가입 신청 승인/거절, 멤버 관리, 리더 위임
- 관심 목록 관리
- 모임 활동 내역 추가, 수정, 삭제
- 사용자 관심 벡터와 모임 데이터를 이용한 추천 조회

## 구조

```text
project/
├─ backend/
│  ├─ app.js                    # API 서버 진입점
│  ├─ data/                     # 시드 입력 JSON
│  ├─ logic/                    # 시드/추천 보조 스크립트
│  ├─ postgres/init/            # PostgreSQL 초기 스키마
│  └─ server/                   # 라우터, 서비스, DB 연결
├─ uniOn/web1/
│  ├─ src/                      # React 앱
│  └─ vite.config.js            # 개발 서버 및 API 프록시
├─ docker-compose.yml
└─ package.json
```

## 설치

루트와 프론트엔드의 의존성을 각각 설치합니다.

```powershell
cd C:\Users\blank\Desktop\DB\project
npm install

cd .\uniOn\web1
npm install
```

## 실행

### 일반 실행

일반 모드에서는 `@gnu.ac.kr` Google 계정만 로그인할 수 있습니다.

```powershell
cd C:\Users\blank\Desktop\DB\project
npm run db:up
npm run db:seed
npm run api
```

`db:seed`는 데이터베이스를 초기 데이터로 다시 채우므로, 직접 만든 모임을 보존하려면 최초 적재 이후에는 생략합니다.

별도 터미널:

```powershell
cd C:\Users\blank\Desktop\DB\project
npm run dev
```

접속 주소:

```text
http://localhost:5273
```

### 테스트 Google 계정으로 실행

학교 계정이 아닌 테스트 Google 계정으로 로그인하려면 백엔드와 프론트엔드를 모두 테스트 모드로 실행합니다.

```powershell
cd C:\Users\blank\Desktop\DB\project
npm run api:test
```

별도 터미널:

```powershell
cd C:\Users\blank\Desktop\DB\project
npm run dev:test
```

Firebase Authentication의 Authorized domains에 `localhost`가 등록되어 있어야 합니다. `127.0.0.1`이 아니라 `http://localhost:5273`으로 접속합니다.

## 데이터 모델

`meetings`에는 추천 계산용 대분류와 화면 표시용 소분류가 분리되어 있습니다.

| 필드 | 용도 | 예시 |
| --- | --- | --- |
| `tag_id` | 추천 알고리즘의 6개 대분류 | `culture` |
| `display_category` | 검색/카드에 표시하는 소분류 | `music` |

예를 들어 `음악/공연` 모임은 화면에서 소분류로 표시되지만 추천 계산에서는 `culture` 벡터를 사용합니다.

알고리즘 대분류:

```text
study, exercise, culture, game, religion, volunteer
```

## 추천 방식

추천은 다음 값을 사용합니다.

- 사용자 관심 벡터와 참여자 평균 벡터의 cosine similarity
- 사용자 관심 벡터와 모임 `tag_id` 벡터의 jaccard similarity

프론트엔드는 API가 반환한 추천 결과를 우선 사용하고, 추천 결과가 없을 때 로컬 점수 계산을 fallback으로 사용합니다.

## 기본 주소

| 서비스 | 주소 |
| --- | --- |
| 프론트엔드 | `http://localhost:5273` |
| API 서버 | `http://localhost:4000` |
| PostgreSQL | `127.0.0.1:5432` |

PostgreSQL 기본 설정:

```text
database: gnumatchclub
user: gnu_DB
password: gnublank4898
```

세부 프론트 문서는 [uniOn/web1/README.md](./uniOn/web1/README.md), API 및 DB 문서는 [backend/README.md](./backend/README.md)를 참고합니다.
