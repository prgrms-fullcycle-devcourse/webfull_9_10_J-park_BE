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

const TEST_PREFIX = `PERF_USER_${Date.now()}`;

const DATA_SIZES = [
  { goalCount: 100, goalLogCount: 1000, timerLogCount: 3000 },
  { goalCount: 500, goalLogCount: 5000, timerLogCount: 15000 },
  { goalCount: 1000, goalLogCount: 10000, timerLogCount: 30000 },
];

// row: 결과 출력용 배열
const rows: Row[] = [];

describe('Users API Performance', () => {
  afterAll(async () => {
    process.stderr.write(perfFormatTable(rows));
  });

  describe('GET /users/me', () => {
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

        it('GET /users/me 속도 측정', async () => {
          const first = await measureRequest(() =>
            request(app).get('/users/me').set('Cookie', asCookie(seed.token)),
          );

          const second = await measureRequest(() =>
            request(app).get('/users/me').set('Cookie', asCookie(seed.token)),
          );

          const third = await measureRequest(() =>
            request(app).get('/users/me').set('Cookie', asCookie(seed.token)),
          );

          const sizeNum = `(${JSON.stringify(size.goalCount)}/${JSON.stringify(size.goalLogCount)}/${JSON.stringify(size.timerLogCount)})`;
          rows.push({
            label: `GET /users/me ${sizeNum}`,
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
