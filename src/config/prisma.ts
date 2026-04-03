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
const basePrisma = new PrismaClient({
  adapter: adapter,
  log: ['query', 'info', 'warn', 'error'],
});

// 4. 익스텐션(미들웨어) 정의
const prisma = basePrisma.$extends({
  query: {
    timerLog: {
      /**
       * timerLog 모델의 update 작업 시 사이드 이펙트 처리
       * 타이머가 종료되어 기록이 저장될 때, 해당 사용자의 총 공부 시간을 자동 갱신
       */
      async update({ args, query }) {
        // 1. 업데이트 데이터에 durationSec이 존재할 경우 실행
        if (
          args.data.durationSec &&
          typeof args.data.durationSec === 'number'
        ) {
          const { durationSec } = args.data;

          // 2. 현재 업데이트될 로그의 사용자 조회
          const log = await basePrisma.timerLog.findUnique({
            where: args.where,
            select: { userId: true },
          });

          if (log?.userId) {
            // 3. User 모델의 totalTime 필드를 DB 수준에서 증가시킴
            await basePrisma.user.update({
              where: { id: log.userId },
              data: {
                totalTime: {
                  increment: durationSec,
                },
              },
            });
          }

          // 4. 원래 요청된 업데이트 쿼리 실행
          return query(args);
        }
      },
    },
  },
});

export default prisma;
