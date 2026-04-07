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

### 🛠 Changed

- GET /timers (실행 중인 타이머 정보 조회)
  - swagger 오기입 내용 수정: `goalId`를 request parameters -> body로 변경

- 인증 미들웨어: 인증 오류 시 401 응답객체 추가
- `@faker-js/faker` v9 제거
- `TimerLog` → `GoalLog` 관계의 `onDelete` 정책을 `Cascade`로 변경
- `app.js` 분리, 이에 따른 테스트 코드 파일의 app import path 변경

### 🐛 Fixed

- 랜덤 닉네임 생성 로직 오류 수정
  - 영어로 반환하던 오류를 수정

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

- GET /timers (실행 중인 타이머 정보 조회)
  - 테스트 코드 작성 완료

- POST /timers/end (타이머 종료)
  - 테스트 코드 작성 완료

- 테스트 데이터 생성 코드
  - `prisma/seeds/`
  - `db:seed` 스크립트로 db에 랜덤 테스트 데이터 생성 가능

- `goal.test.ts` 파일 삭제

---

## 🏷️ [v0.5.0] - 2026-04-01

### 🛠 Changed

- GET /timers (실행 중인 타이머 정보 조회)
  - [🚨 BREAKING] 요청 방식 변경
    - `goalId` 전달 위치를 `request body → query parameter`로 변경
    - GET 메서드의 특성 및 보안 정책에 맞게 수정
  - 요청 데이터 유효성 검사 로직 추가
    - 유효하지 않은 요청은 400 에러 반환
  - 관련 테스트 코드 수정 및 테스트 완료

- POST /timers/start (타이머 시작)
  - 요청 데이터 유효성 검사 로직 추가
    - 유효하지 않은 요청은 400 에러 반환
  - 관련 테스트 코드 수정 및 테스트 완료

- POST /timers/end (타이머 종료)
  - 요청 데이터 유효성 검사 로직 추가
    - 유효하지 않은 요청은 400 에러 반환
  - 관련 테스트 코드 수정 및 테스트 완료

### 🧪 Test

- GET /timers (실행 중인 타이머 정보 조회)
  - 401 에러에 대한 테스트 코드 추가

- POST /timers/start (타이머 시작)
  - 401 에러에 대한 테스트 코드 추가

- POST /timers/end (타이머 종료)
  - 401 에러에 대한 테스트 코드 추가

- GET /users/me (내 정보 보기)
  - 테스트 코드 작성 완료

- PATCH /users (사용자 정보 수정)
  - 테스트 코드 작성 완료

- GET /rankings (전체 랭킹 조회)
  - 테스트 코드 작성 완료

- GET /risks (현재 위험도 조회)
  - 테스트 코드 작성 완료

---

## 🏷️ [v0.6.0] - 2026-04-03

### 🛠 Changed

- GET /timers (실행 중인 타이머 정보 조회)
  - 요청값에서 `goalId` 제거
  - `response data`에 `goalLogId` 추가
  - `userId` 기준으로 실행 중인 타이머 조회

- POST /timers/end (타이머 종료)
  - 요청값에서 `goalId` 제거
  - `response data`에 `goalLogId` 추가
  - `userId` 기준으로 실행 중인 타이머 조회

- PATCH /goals/:goalId (개별 목표 수정)
  - [🚨 BREAKING] response field 삭제 (200)
    - `dailyId`
  - response field 추가 (200)
    - `goalLogId`
    - `totalAmount`
    - `completedAmount`
    - `studyTime`
    - `isToday`

- GET /goals/{goalId}/detail (개별 목표 상세 조회)
  - [🚨 BREAKING] response field 삭제 (200)
    - `dailyId`
  - response field 추가 (200)
    - `goalLogId`
    - `totalStudyTime`
    - `targetAmount`
    - `completedAmount`
    - `studyTime`
    - `isToday`

- GET /goals/today (오늘 목표 리스트 조회)
  - [🚨 BREAKING] response field 삭제 (200)
    - `dailyId`
  - response field 추가 (200)
    - `goalLogId`

- 날짜 유틸을 KST 기준으로 재구성

- 랜덤 닉네임을 동물 -> 등불 관련 명사로 변경

### 🐛 Fixed

- PATCH /goals/:goalId (개별 목표 수정)
  - 총 목표량이 변경되지 않는 문제를 해결

### 🧪 Test

- 사용자 정보, 수정, 랭킹, 위험도 API에 대한 테스트 코드 형식 수정
- 목표 API 수정 사항에 대한 테스트 코드 수정 및 테스트 완료
- 목표 API 테스트 코드에 500 에러 케이스 추가
- 에러 코드 통일

---

## 🏷️ [v0.7.0] - 2026-04-06

### ✨ Added

- GET /goals (전체 목표 리스트 조회)
  - #78
  - `Redis` 캐싱으로 조회 성능 개선
  - 목표 생성 시 캐시 무효화로 데이터 정합성 유지
- 개발 환경 전용 테스트 데이터 생성 API 추가 (`POST /dev/test-data/generate`)
  - #80
  - 사용자 기준으로 goal, goal_log, timer_log 랜덤 데이터 생성 지원
  - 생성 개수 옵션 추가:
    - `goalCount`
    - `goalLogCount`
    - `timerLogCount`
  - 각 옵션은 아래 두 가지 형태 지원:
    - 정수: 고정 개수 생성
    - 객체 `{ min, max }`: 범위 기반 랜덤 개수 생성
  - 기본값 적용:
    - goalCount: 5
    - goalLogCount: 10
    - timerLogCount: 3
- 성능 테스트 코드 추가
  - 캐시 효과 검증 로직 추가
  - `first` / `second` / `third` 요청 시간 비교
- HTTP 로깅 추가
  - `morgan` 미들웨어로 요청의 메소드, 엔드포인트, 상태코드, 응답시간 출력

### 🐛 Fixed

- 타이머 종료 시 랭킹에 업데이트 되지 않는 오류 해결
  - 타이머 종료 시 사용자의 총 공부시간 갱신
- GET /rankings (전체 랭킹 조회)
  - `totalTime`이 0으로 전달되는 오류 해결

### 🧪 Test

- GET /goals (전체 목표 리스트 조회)
  - 성능 테스트 코드 작성
  - #80

### 📄 Docs

- 테스트 데이터 생성 API Swagger 명세 추가
  - `CountOption (number | { min, max })` 구조 문서화

---

## 🏷️ [v0.8.0] - 2026-04-07

### ✨ Added

- GOAL API 캐싱으로 조회 성능 개선
  - 이하의 API에 대한 캐싱을 진행
    - GET /goals (전체 목표 리스트 조회)
    - GET /goals/:goalId/detail (개별 목표 상세 조회)
    - GET /goals/today/complete (오늘 목표 달성률 조회)
  - 이하의 API 요청 시 상술한 캐시를 무효화
    - DELETE /goals/{goalId} (목표 삭제)
    - PATCH /goals/{goalId} (개별 목표 수정)
    - POST /timers/start (타이머 시작)
    - POST /timers/end (타이머 종료)

- GET /timers (실행 중 타이머 조회)
  - 캐싱으로 조회 성능 개선
  - 이하의 API 요청 시 해당 캐시를 무효화
    - POST /timers/start (타이머 시작)
    - POST /timers/end (타이머 종료)

### 🛠 Changed

- GET /goals/today (오늘 목표 리스트 조회)
  - 응답 데이터의 기준을 누적치 -> 오늘로 변경

- USER API의 에러 코드 통일 리팩토링
  - 응답 데이터에 닉네임이 없을 경우 `MISSING_NICKNAME` 반환

### 🐛 Fixed

- GET /goals/today (오늘 목표 리스트 조회)
  - 날짜 경계값 오류 수정
    - `lte endOfToday` -> `lt nextStartOfToday`

---
