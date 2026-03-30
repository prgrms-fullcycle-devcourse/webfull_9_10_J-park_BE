# 📦 CHANGELOG

이 프로젝트의 주요 변경 사항은 이 파일에 기록됩니다.

---

## 🏷️ [v0.1.0] - 2026-03-28

### ✨ Added
- 전반적인 API 구현 완료
- Prisma ORM 기반 데이터베이스 연동 (PostgreSQL)
- 익명 사용자 자동 생성 및 JWT 인증 처리 (HttpOnly Cookie 기반)
- API 응답 공통 포맷 적용 (`success`, `message`, `data` 구조)
- 커스텀 에러 클래스 (`AppError`) 및 에러 코드 체계 도입
- Swagger(OpenAPI) 기반 API 문서 구성


### 🔒 Security
- JWT 토큰을 HttpOnly Cookie로 설정하여 XSS 공격 대응 강화
- 인증 미들웨어에서 사용자 검증 로직 보완


### 🧪 Test
- 카테고리 조회 API 테스트 코드 작성


### 📄 Docs
- API 명세서 초안 작성 (Notion / Swagger 기반)
- 에러 코드 정의 및 문서화
- 프로젝트 구조 및 실행 방법 README 정리

---

## 🏷️ [v0.2.0] - 2026-03-28

### ✨ Added
- 버전 관리: CHANGELOG.md 추가

### 🛠 Changed
- POST /goals
    - [🚨 BREAKING] request body field 삭제
        - `quota`
    - response field 추가 (201)
        - `status`
        - `currentValue`
        - `targetValue`
        - `quota`
    - [🚨 BREAKING] response field 변경 (201)
        - `userName` -> `nickname`

- GET /rankings
    - response field 추가 (200)
        - `myRanking`
        - `topRankings`
        - `ranks`
    - [🚨 BREAKING] response field 변경 (200)
        - `profileImage` -> `profileImageUrl`
    - [🚨 BREAKING] response field 값 형식 변경 (200)
        - `totalTime` ("HH:mm:ss" → ms)

- POST /users (명세만 수정, 개발되지 않았습니다.)
    - response field 변경 (200)
        - `userName` -> `nickname`

- PATCH /users
    - [🚨 BREAKING] response field 변경 (200)
        - `profileImage` -> `profileImageUrl`
        - `userName` -> `nickname`
    - [🚨 BREAKING] response field 값 형식 변경 (200)
        - `totalTime` ("HH:mm:ss" → ms)

- GET /users/me
    - [🚨 BREAKING] response field 변경 (200)
        - `profileImage` -> `profileImageUrl`
        - `userName` -> `nickname`
    - [🚨 BREAKING] response field 값 형식 변경 (200)
        - `totalTime` ("HH:mm:ss" → ms)

- prisma schema 변경
  - `DateTime` 컬럼의 타임존을 UTC로 지정 

- `eslint`에서 error에 대한 console 활용을 허용


### 🧪 Test
- GET /categories (카테고리 목록 조회)
    - 기댓값 수정

- POST /timers/start (타이머 측정 시작)
    - 500 에러 케이스 추가


---

## 🏷️ [v0.3.0] - 2026-03-30

### 🛠 Changed
- GET /goals/today (오늘 목표 리스트 조회)
    - response body field 추가 (200)
        - `todayGoals[].dailyId`

- GET /goals/{goalId}/detail (개별 목표 상세 조회)
    - response body field 추가 (200)
        - `dailyProgress[].dailyId`
    - 조회 범위를 목표 기간 내로 보정 (`clampedStartDate` / `clampedEndDate`)

- `goal_logs`, `timer_logs` 스키마 변경 및 연관 코드 리팩토링
    - `GoalLog`의 `targetValue`, `actualValue`, `timeSpent를` 필수값으로 변경
    - `GoalLog`와 `TimerLog`를 1:N 관계로 연결
    - `TimerLog` 실행중타이머 조회용 인덱스에 `goalId` 추가
        - `@@index([userId, goalId, endTime])`

### 🐛 Fixed
- GET /goals/today/complete (오늘 목표 달성률 조회)
    - `totalTime`의 값을 초(s) 단위 -> 밀리초(ms) 단위로 수정

- PATCH /goals/{goalId} (개별 목표 수정)
    - 목표 수정 시 `quota` 재계산 로직 추가

### 🧪 Test
- POST /goals (목표 생성) 
    - 테스트 코드 작성 완료

- GET /goals (전체 목표 리스트 조회)
    - 테스트 코드 작성 완료

---

## 🏷️ [v0.4.0] - 2026-03-31

### ✨ Added

### 🛠 Changed
- 인증 오류 시 401 응답객체 추가 
- @faker-js/faker v9 제거
- goal_logs의 
### 🐛 Fixed
- 랜덤 닉네임 생성 로직 오류 수정 
    -  영어로 반환하던 오류를 수정

### 🔒 Security
- 사용자의 토큰 갱신 로직 추가

### 🧪 Test

- GET /goals (전체 목표 조회)
    - 테스트 코드 작성 완료

- POST /goals (목표 생성)
    - 테스트 코드 작성 완료

- GET /goals/{goalId}/detail (목표 상세 조회)
    - 테스트 코드 작성 완료

- PATCH /goals/{goalId} (목표 수정)
    - 테스트 코드 작성 완료

- DELETE /goals/{goalId} (목표 삭제)
   - 테스트 코드 작성 완료

- GET /goals/today (오늘 목표 조회)
    - 테스트 코드 작성 완료

- GET /goals/today/complete (오늘 목표 달성률 조회)
    - 테스트 코드 작성 완료

- 테스트 데이터 생성 코드
    - `prisma/seeds/`
    - `db:seed`, `db:format` 스크립트로 db에 랜덤 테스트 데이터 생성 가능

### 📄 Docs

---
