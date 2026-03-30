import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../generated/prisma';

// 1. Pool 생성 (DATABASE_URL 사용)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 2. PrismaPg 어댑터 생성 시 'as any'를 추가하여 타입 에러 우회
// 내부적으로 Prisma가 pool의 메서드를 호출하는 방식은 동일하므로 안전합니다.
const adapter = new PrismaPg(pool as any);

// 3. 클라이언트 생성
const prisma = new PrismaClient({
  adapter: adapter,
  log: ['query', 'info', 'warn', 'error'],
});

export default prisma;
