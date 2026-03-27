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

## 🚀 Initial Release
- 등불(Lampfire) 백엔드 서버 초기 배포
