import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/prisma';

import { connectRedis, disconnectRedis } from '../../src/config/redis';
import { Row, perfFormatTable } from './helpers/table';
import { asCookie, measureRequest } from './helpers/request';
import {
  cleanupPerformanceData,
  seedPerformanceData,
  SeedResult,
} from './helpers/db';

jest.setTimeout(30000);

const TEST_PREFIX = `PERF_GOALS_${Date.now()}`;

const DATA_SIZES = [
  { goalCount: 100, goalLogCount: 1000, timerLogCount: 3000 },
  { goalCount: 500, goalLogCount: 5000, timerLogCount: 15000 },
  { goalCount: 1000, goalLogCount: 10000, timerLogCount: 30000 },
];

// row: 결과 출력용 배열
const rows: Row[] = [];

describe('Goals API Performance', () => {
  afterAll(async () => {
    process.stderr.write(perfFormatTable(rows));
  });

  describe('GET /goals', () => {
    beforeAll(async () => {
      try {
        await connectRedis();
        // eslint-disable-next-line no-console
        console.log('Redis connected');
      } catch (error) {
        console.error('Redis connection failed. Running without cache.', error);
      }

      await cleanupPerformanceData(TEST_PREFIX);
    });

    afterAll(async () => {
      await cleanupPerformanceData(TEST_PREFIX);
      await disconnectRedis();
      await prisma.$disconnect();
    });

    for (const size of DATA_SIZES) {
      describe(`dataset = ${JSON.stringify(size)}`, () => {
        let seed: SeedResult;

        beforeEach(async () => {
          await cleanupPerformanceData(TEST_PREFIX);
          seed = await seedPerformanceData(
            size.goalCount,
            size.goalLogCount,
            size.timerLogCount,
            TEST_PREFIX,
          );
        });

        it('GET /goals 속도 측정', async () => {
          const first = await measureRequest(() =>
            request(app).get('/goals').set('Cookie', asCookie(seed.token)),
          );

          const second = await measureRequest(() =>
            request(app).get('/goals').set('Cookie', asCookie(seed.token)),
          );

          const third = await measureRequest(() =>
            request(app).get('/goals').set('Cookie', asCookie(seed.token)),
          );

          const sizeNum = `(${JSON.stringify(size.goalCount)}/${JSON.stringify(size.goalLogCount)}/${JSON.stringify(size.timerLogCount)})`;
          rows.push({
            label: `GET /goals ${sizeNum}`,
            firstMs: first.elapsedMs,
            secondMs: second.elapsedMs,
            thirdMS: third.elapsedMs,
            status1: first.response.status,
            status2: second.response.status,
            status3: third.response.status,
          });
        });
      });
    }
  });

  describe('GET /goals/:goalId/detail', () => {
    beforeAll(async () => {
      try {
        await connectRedis();
        // eslint-disable-next-line no-console
        console.log('Redis connected');
      } catch (error) {
        console.error('Redis connection failed. Running without cache.', error);
      }

      await cleanupPerformanceData(TEST_PREFIX);
    });

    afterAll(async () => {
      await cleanupPerformanceData(TEST_PREFIX);
      await disconnectRedis();
      await prisma.$disconnect();
    });

    for (const size of DATA_SIZES) {
      describe(`dataset = ${JSON.stringify(size)}`, () => {
        let seed: SeedResult;
        let goalId: number;

        beforeEach(async () => {
          await cleanupPerformanceData(TEST_PREFIX);
          seed = await seedPerformanceData(
            size.goalCount,
            size.goalLogCount,
            size.timerLogCount,
            TEST_PREFIX,
          );

          // 배열의 중간값을 goalId로 선정
          goalId = seed.goalIds[Math.floor((seed.goalIds.length - 1) / 2)];
        });

        it('GET /goals 속도 측정', async () => {
          // 날짜 생성
          const endDate = new Date();
          const startDate = new Date(endDate);
          startDate.setDate(startDate.getDate() - 1);

          const formatDate = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');

            return `${year}-${month}-${day}`;
          };

          const endDateString = formatDate(endDate);
          const startDateString = formatDate(startDate);

          const first = await measureRequest(() =>
            request(app)
              .get(
                `/goals/${goalId}/detail?startDate=${startDateString}&endDate=${endDateString}`,
              )
              .set('Cookie', asCookie(seed.token)),
          );

          const second = await measureRequest(() =>
            request(app)
              .get(
                `/goals/${goalId}/detail?startDate=${startDateString}&endDate=${endDateString}`,
              )
              .set('Cookie', asCookie(seed.token)),
          );

          const third = await measureRequest(() =>
            request(app)
              .get(
                `/goals/${goalId}/detail?startDate=${startDateString}&endDate=${endDateString}`,
              )
              .set('Cookie', asCookie(seed.token)),
          );

          const sizeNum = `(${JSON.stringify(size.goalCount)}/${JSON.stringify(size.goalLogCount)}/${JSON.stringify(size.timerLogCount)})`;
          rows.push({
            label: `GET /goals/:goalId/detail ${sizeNum}`,
            firstMs: first.elapsedMs,
            secondMs: second.elapsedMs,
            thirdMS: third.elapsedMs,
            status1: first.response.status,
            status2: second.response.status,
            status3: third.response.status,
          });
        });
      });
    }
  });

  describe('GET /goals/today/complete', () => {
    beforeAll(async () => {
      try {
        await connectRedis();
        // eslint-disable-next-line no-console
        console.log('Redis connected');
      } catch (error) {
        console.error('Redis connection failed. Running without cache.', error);
      }

      await cleanupPerformanceData(TEST_PREFIX);
    });

    afterAll(async () => {
      await cleanupPerformanceData(TEST_PREFIX);
      await disconnectRedis();
      await prisma.$disconnect();
    });

    for (const size of DATA_SIZES) {
      describe(`dataset = ${JSON.stringify(size)}`, () => {
        let seed: SeedResult;

        beforeEach(async () => {
          await cleanupPerformanceData(TEST_PREFIX);
          seed = await seedPerformanceData(
            size.goalCount,
            size.goalLogCount,
            size.timerLogCount,
            TEST_PREFIX,
          );
        });

        it('GET /goals 속도 측정', async () => {
          const first = await measureRequest(() =>
            request(app)
              .get('/goals/today/complete')
              .set('Cookie', asCookie(seed.token)),
          );

          const second = await measureRequest(() =>
            request(app)
              .get('/goals/today/complete')
              .set('Cookie', asCookie(seed.token)),
          );

          const third = await measureRequest(() =>
            request(app)
              .get('/goals/today/complete')
              .set('Cookie', asCookie(seed.token)),
          );

          const sizeNum = `(${JSON.stringify(size.goalCount)}/${JSON.stringify(size.goalLogCount)}/${JSON.stringify(size.timerLogCount)})`;
          rows.push({
            label: `GET /goals/today/complete ${sizeNum}`,
            firstMs: first.elapsedMs,
            secondMs: second.elapsedMs,
            thirdMS: third.elapsedMs,
            status1: first.response.status,
            status2: second.response.status,
            status3: third.response.status,
          });
        });
      });
    }
  });
});
