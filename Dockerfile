# 1단계: 빌드 스테이지
FROM node:20-slim AS builder

# OpenSSL 설치 (Prisma 7 실행을 위해 필수)
RUN apt-get update && apt-get install -y openssl

WORKDIR /app

# 의존성 설치
COPY package*.json ./
RUN npm install

# 소스 복사 및 Prisma Client 생성
COPY . .
RUN npx prisma generate

# TypeScript 빌드
RUN npm run build

# 2단계: 실행 스테이지 (용량 최적화)
FROM node:20-slim
RUN apt-get update && apt-get install -y openssl
WORKDIR /app

# 빌드 결과물과 필요한 파일만 복사
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

# 포트 개방
EXPOSE 3000

# 실행 시 마이그레이션 적용 후 서버 시작
# migrate deploy는 기존 데이터를 보존하며 스키마만 업데이트합니다.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main.js"]