# 시연 PC 설치 및 실행 방법

이 문서는 강의실 또는 컴퓨터실 시연 PC에서 `GNU Club Matching` 프로젝트를 설치하고 실행하는 절차입니다.

기본 권장 방식은 **시연 PC 한 대에서 DB, 백엔드, 프론트엔드를 모두 실행하고 같은 PC 브라우저에서 `localhost`로 접속**하는 것입니다. 이 방식이 학교망, 내부 IP, 방화벽 영향을 가장 적게 받습니다.

## 1. 설치 전 준비

시연 PC에 아래 프로그램이 필요합니다.

- Node.js LTS
- Docker Desktop
- Chrome, Edge, Whale 중 하나의 브라우저
- 프로젝트 폴더 전체

Docker Desktop은 실행된 상태여야 합니다. Docker Desktop이 꺼져 있으면 PostgreSQL DB가 올라가지 않습니다.

## 2. 프로젝트 위치

예시 경로:

```powershell
C:\Users\blank\Desktop\DB\project
```

시연 PC에서 프로젝트 위치가 다르면 아래 명령의 경로만 실제 위치로 바꿉니다.

```powershell
cd C:\Users\blank\Desktop\DB\project
```

## 3. 의존성 설치

PowerShell을 열고 프로젝트 루트에서 실행합니다.

```powershell
cd C:\Users\blank\Desktop\DB\project
npm install
```

프론트엔드 의존성도 따로 설치합니다.

```powershell
cd .\frontend
npm install
cd ..
```

최초 설치는 인터넷 연결이 필요합니다.

## 4. DB 실행

Docker Desktop을 먼저 켠 뒤 프로젝트 루트에서 실행합니다.

```powershell
npm run db:up
```

처음 실행하면 PostgreSQL Docker 이미지를 내려받기 때문에 시간이 걸릴 수 있습니다.

DB 기본 정보:

```text
host: 127.0.0.1
port: 5432
database: gnumatchclub
user: gnu_DB
password: gnublank4898
```

## 5. 초기 데이터 적재

처음 시연 환경을 만들 때만 실행합니다.

```powershell
npm run db:seed
```

주의: `db:seed`는 DB 데이터를 초기 시드 데이터로 다시 채웁니다. 시연 중 만든 모임, 가입 신청, 활동 내역을 보존해야 하면 다시 실행하지 않습니다.

## 6. 백엔드 실행

새 PowerShell 창을 열고 실행합니다.

학교 `@gnu.ac.kr` 계정으로만 로그인할 경우:

```powershell
cd C:\Users\blank\Desktop\DB\project
npm run api
```

일반 Google 테스트 계정도 허용해야 할 경우:

```powershell
cd C:\Users\blank\Desktop\DB\project
npm run api:test
```

시연에서는 로그인 문제를 줄이기 위해 보통 `npm run api:test`가 편합니다.

백엔드 주소:

```text
http://localhost:4000
```

상태 확인:

```text
http://localhost:4000/api/health
```

## 7. 프론트엔드 실행

또 다른 PowerShell 창을 열고 실행합니다.

학교 `@gnu.ac.kr` 계정으로만 로그인할 경우:

```powershell
cd C:\Users\blank\Desktop\DB\project
npm run dev
```

일반 Google 테스트 계정도 허용해야 할 경우:

```powershell
cd C:\Users\blank\Desktop\DB\project
npm run dev:test
```

백엔드를 `api:test`로 실행했다면 프론트도 `dev:test`로 실행합니다.

프론트엔드 주소:

```text
http://localhost:5273
```

브라우저에서는 `127.0.0.1`보다 `localhost`를 사용합니다. Firebase 로그인 허용 도메인 때문에 `http://localhost:5273`이 안전합니다.

## 8. 시연 PC 한 대에서 실행할 때 최종 순서

PowerShell 창 1개:

```powershell
cd C:\Users\blank\Desktop\DB\project
npm run db:up
npm run db:seed
```

PowerShell 창 2개째:

```powershell
cd C:\Users\blank\Desktop\DB\project
npm run api:test
```

PowerShell 창 3개째:

```powershell
cd C:\Users\blank\Desktop\DB\project
npm run dev:test
```

브라우저:

```text
http://localhost:5273
```

## 9. 다른 PC에서 시연 PC로 접속해야 하는 경우

같은 강의실 내부망의 다른 컴퓨터에서 시연 PC에 접속하려면 `localhost`를 사용할 수 없습니다.

`localhost`는 항상 **현재 사용 중인 컴퓨터 자기 자신**입니다. 다른 PC에서 `localhost:5273`을 입력하면 시연 PC가 아니라 그 다른 PC를 찾습니다.

### 9.1 시연 PC 내부 IP 확인

시연 PC에서 실행합니다.

```powershell
ipconfig
```

`IPv4 주소`를 확인합니다.

예시:

```text
192.168.0.23
```

다른 PC에서는 아래처럼 접속합니다.

```text
http://192.168.0.23:5273
```

### 9.2 프론트엔드 외부 접속 허용

현재 `frontend/vite.config.js`는 `host: "localhost"`로 되어 있습니다. 다른 PC에서 접속해야 하면 `host`를 `0.0.0.0`으로 바꿉니다.

변경 전:

```js
server: {
  host: "localhost",
  port: 5273,
  proxy: {
    "/api": "http://localhost:4000",
  },
},
```

변경 후:

```js
server: {
  host: "0.0.0.0",
  port: 5273,
  proxy: {
    "/api": "http://localhost:4000",
  },
},
```

그 다음 프론트엔드를 다시 실행합니다.

```powershell
npm run dev:test
```

### 9.3 백엔드 포트 확인

백엔드는 기본적으로 `4000` 포트를 사용합니다.

프론트엔드 개발 서버가 `/api` 요청을 백엔드로 프록시하므로, 다른 PC는 보통 `5273` 포트로만 접속하면 됩니다.

다만 방화벽이나 네트워크 정책에 따라 API 요청이 막히면 `4000` 포트도 허용해야 할 수 있습니다.

### 9.4 Windows 방화벽 허용

다른 PC에서 접속해야 하면 시연 PC의 Windows 방화벽에서 아래 포트를 허용합니다.

```text
5273  프론트엔드
4000  백엔드 API
```

PostgreSQL 포트 `5432`는 다른 PC에서 직접 접근할 필요가 없으므로 열지 않는 것이 좋습니다.

### 9.5 내부망 접속 주의

같은 강의실에 있어도 학교 네트워크 정책에 따라 PC끼리 직접 접속이 막혀 있을 수 있습니다. 이 경우 설정이 맞아도 다른 PC에서 접속되지 않습니다.

발표 안정성 기준으로는 **시연 PC 한 대에서 `http://localhost:5273`으로 직접 시연하는 방식**이 가장 안전합니다.

## 10. 자주 생기는 문제

### Docker가 실행되지 않을 때

Docker Desktop을 먼저 켠 뒤 다시 실행합니다.

```powershell
npm run db:up
```

### 포트가 이미 사용 중일 때

다른 서버가 `4000`, `5273`, `5432` 포트를 사용 중일 수 있습니다. 기존 터미널에서 실행 중인 서버를 종료하거나 PC를 재부팅한 뒤 다시 실행합니다.

### 로그인 팝업이 안 뜰 때

브라우저 팝업 차단을 확인합니다. 접속 주소는 아래 주소를 사용합니다.

```text
http://localhost:5273
```

### 테스트 Google 계정 로그인이 안 될 때

백엔드와 프론트엔드를 둘 다 테스트 모드로 실행했는지 확인합니다.

```powershell
npm run api:test
npm run dev:test
```

### API 오류가 날 때

백엔드가 실행 중인지 확인합니다.

```text
http://localhost:4000/api/health
```

DB가 실행 중인지 확인합니다.

```powershell
docker ps
```

### 데이터가 이상할 때

초기 데이터로 다시 돌려도 괜찮다면 아래를 실행합니다.

```powershell
npm run db:seed
```

단, 이 명령은 시연 중 생성한 데이터를 초기화합니다.

## 11. 종료 방법

프론트엔드와 백엔드 PowerShell 창에서 `Ctrl + C`를 누릅니다.

DB 컨테이너까지 내리려면 프로젝트 루트에서 실행합니다.

```powershell
npm run db:down
```

시연 전날에는 DB를 굳이 내리지 않고 Docker Desktop만 유지해도 됩니다.

## 12. 시연 전 체크리스트

- Docker Desktop 실행 확인
- `npm install` 완료
- `frontend` 안에서도 `npm install` 완료
- `npm run db:up` 실행 완료
- 최초 1회 `npm run db:seed` 실행 완료
- 백엔드 `npm run api:test` 실행 중
- 프론트엔드 `npm run dev:test` 실행 중
- 브라우저에서 `http://localhost:5273` 접속 확인
- 로그인 테스트
- 모임 목록, 상세 페이지, 추천, 관심 목록, 생성 기능 확인
