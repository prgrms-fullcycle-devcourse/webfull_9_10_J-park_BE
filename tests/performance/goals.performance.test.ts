import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/prisma';

import { connectRedis, disconnectRedis } from '../../src/config/redis';
import { Row, perfFormatTable } from './helpers/table';
import { asCookie, measureRequest } from './helpers/request';
import { cleanupPerformanceData, seedPerformanceData } from './helpers/db';

const TEST_PREFIX = `PERF_GOALS_${Date.now()}`;

const DATA_SIZES = [
  { goalCount: 100, goalLogCount: 1, timerLogCount: 1 },
  { goalCount: 1000, goalLogCount: 1, timerLogCount: 1 },
  { goalCount: 10000, goalLogCount: 1, timerLogCount: 1 },
];

type SeedResult = {
  userId: number;
  token: string;
  goalIds: number[];
};

describe('Goals API performance', () => {
  // row: 결과 출력용 배열
  const rows: Row[] = [];

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
    process.stderr.write(perfFormatTable(rows));
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

        rows.push({
          label: `GET /goals ${JSON.stringify(size)}`,
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
