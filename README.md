# 등불(Lampfire) 백엔드

> 미루기 쉬운 목표를 사용자에 페이스에 맞추어 관리해주는 **등불** 서비스의 백엔드 서버입니다.

---

## 📌 프로젝트 소개

등불은 “발등에 불 떨어지기 전에 조금씩 해내기”를 돕는 목표 관리 서비스입니다.  
목표를 생성하고, 오늘 할 분량을 확인하고, 타이머로 실제 수행 시간을 기록할 수 있습니다.

---

## 🚀 주요 기능

### 🔥 핵심 기능

| 기능 | 설명 |
|------|------|
| 기본 할당량 추천 | 목표 생성 시 입력한 목표량과 기간을 기반으로 하루 할당량을 자동 계산 |
| 사용자 맞춤 할당량 추천 | 최근 공부량과 수행 결과를 반영하여 개인화된 할당량을 동적으로 재계산 |
| 익명 사용자 지원 | 로그인 없이도 서비스 사용 가능 |
| 카카오 로그인 | OAuth 로그인으로 사용자 데이터 연동 지원 |
| 캐시 최적화 | Redis 및 In-Memory 캐싱으로 조회 성능 개선 |


### 🎯 목표 관리

| 기능 | 설명 |
|------|------|
| 목표 생성 | 새로운 목표 생성 |
| 목표 조회 | 전체 목표 목록 조회 |
| 오늘 목표 조회 | 오늘 수행해야 할 목표 조회 |
| 달성률 조회 | 오늘 목표 달성률 확인 |
| 목표 상세 조회 | 특정 목표 상세 정보 조회 |
| 목표 수정/삭제 | 목표 수정 및 삭제 |

---

### ⏱️ 타이머 기능

| 기능 | 설명 |
|------|------|
| 타이머 시작 | 목표 기반 타이머 시작 |
| 타이머 조회 | 실행 중 타이머 조회 |
| 타이머 종료 | 타이머 종료 및 시간 반영 |
| 시간 기록 | 목표별 공부 시간 누적 |

---

### 👤 사용자 기능

| 기능 | 설명 |
|------|------|
| 내 정보 조회 | 사용자 정보 조회 |
| 프로필 수정 | 닉네임, 이미지 수정 |
| 카카오 로그인 | OAuth 기반 로그인 |
| 로그아웃 | 세션 종료 |

---

### 📊 기타 기능

| 기능 | 설명 |
|------|------|
| 카테고리 조회 | 목표 카테고리 목록 조회 |
| 랭킹 조회 | 사용자 랭킹 조회 |
| 위험도 조회 | 현재 위험도 분석 |

---

## 🛠 기술 스택

| 영역 | 기술 |
|------|------|
| Language | TypeScript |
| Runtime | Node.js |
| Framework | Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache | Redis |
| Docs | Swagger |
| Test | Jest, Supertest |
| Deploy | Docker, Render |

---

## 🗂 프로젝트 구조

```bash
.
├── prisma/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── routes/
│   ├── services/
│   ├── types/
│   └── main.ts
├── tests/
````

---

## ⚙️ 실행 방법

### 1. 패키지 설치

```bash
npm install
```

### 2. 환경 변수 설정

| 변수명             | 설명                     |
| --------------- | ---------------------- |
| NODE_ENV        | 실행 환경 설정 (개발/운영)       |
| PORT            | 서버 실행 포트               |
| REDIS_URL       | Redis 서버 연결 주소         |
| REDIS_MONITOR   | Redis 요청 로그 출력 여부      |
| JWT_SECRET      | JWT 토큰 서명 키            |
| ALLOWED_ORIGINS | 허용된 CORS 도메인           |
| URL             | 백엔드 서버 기본 URL          |
| AWS_REGION      | AWS 서비스 리전             |
| S3_BUCKET_NAME  | S3 버킷 이름               |
| S3_DOMAIN       | S3 파일 접근 도메인           |
| CDN_DOMAIN      | CDN 접근 도메인             |
| DATABASE_URL    | 데이터베이스 연결 문자열          |
| DIRECT_URL      | DB 직접 연결 URL (마이그레이션용) |


---

### 3. DB 실행

```bash
docker compose up -d
```

### 4. Prisma 설정

```bash
npm run db:generate
npm run db:migrate
```

### 5. 서버 실행

```bash
npm run dev
```

| 서비스     | 주소                                                               |
| ------- | ---------------------------------------------------------------- |
| API     | [http://localhost:3000](http://localhost:3000)                   |
| Swagger | [http://localhost:3000/api-docs](http://localhost:3000/api-docs) |

---

## 📦 스크립트

| 명령어              | 설명           |
| ---------------- | ------------ |
| npm run dev      | 개발 서버 실행     |
| npm run build    | 빌드           |
| npm run start    | 실행           |
| npm run lint     | ESLint 검사    |
| npm run lint:fix | ESLint 자동 수정 |
| npm run format   | 코드 포맷        |
| npm run test     | 테스트 실행       |

### DB 관련

| 명령어         | 설명               |
| ----------- | ---------------- |
| db:generate | Prisma Client 생성 |
| db:migrate  | 마이그레이션           |
| db:studio   | DB GUI           |
| db:reset    | DB 초기화           |
| db:seed     | 시드 데이터           |

---

## 📡 API

### 🎯 Goal API

| Method | Endpoint              | 설명    |
| ------ | --------------------- | ----- |
| POST   | /goals                | 목표 생성 |
| GET    | /goals                | 목표 조회 |
| GET    | /goals/today          | 오늘 목표 |
| GET    | /goals/today/complete | 달성률   |
| GET    | /goals/:goalId/detail | 상세 조회 |
| PATCH  | /goals/:goalId        | 수정    |
| DELETE | /goals/:goalId        | 삭제    |

---

### ⏱️ Timer API

| Method | Endpoint      | 설명          |
| ------ | ------------- | ----------- |
| GET    | /timers       | 실행 중 타이머 조회 |
| POST   | /timers/start | 타이머 시작      |
| POST   | /timers/end   | 타이머 종료      |

---

### 👤 User API

| Method | Endpoint            | 설명     |
| ------ | ------------------- | ------ |
| GET    | /users/me           | 내 정보   |
| PATCH  | /users/profile      | 프로필 수정 |
| GET    | /users/kakao/start  | 로그인 시작 |
| GET    | /users/kakao/finish | 로그인 완료 |
| POST   | /users/logout       | 로그아웃   |

---

### 📊 기타 API

| Method | Endpoint    | 설명   |
| ------ | ----------- | ---- |
| GET    | /categories | 카테고리 |
| GET    | /rankings   | 랭킹   |
| GET    | /risks      | 위험도  |

---

## 🔐 인증 방식

* JWT 기반 인증
* httpOnly 쿠키 사용
* 카카오 OAuth 로그인 지원

---

## ⚡ 캐시 전략

* Redis 사용
* 연결 실패 시에도 서버 정상 동작 (Fail-safe 구조)

---

## 🚀 배포

| 항목   | 내용         |
| ---- | ---------- |
| 환경   | Render     |
| 컨테이너 | Docker     |
| 버전   | v1.1.0     |
| 배포일  | 2026-04-19 |

---

## 📄 변경 이력

- version: v1.1.0
- deployedAt: 2026-04-19
- 변경 사항: [CHANGELOG.md](CHANGELOG.md#%EF%B8%8F-v110---2026-04-19) 참고

---

## 🧪 테스트

* Jest + Supertest 기반
* 주요 API 통합 및 성능 테스트 포함
