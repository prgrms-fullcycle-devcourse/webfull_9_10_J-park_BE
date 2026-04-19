import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../../src/app';
import prisma from '../../src/config/prisma';
import * as rankingService from '../../src/services/ranking.service';
import { delCacheByPattern } from '../../src/utils/cache.util';

describe('Ranking API', () => {
  const TEST_PREFIX = `TEST_RANKING_${Date.now()}`;
  const BASE_TIME = 1000000000;

  let authToken: string;
  let myUserId: number;

  beforeEach(async () => {
    await delCacheByPattern('lampfire:ranking:*');

    const user1 = await prisma.user.create({
      data: {
        nickname: `${TEST_PREFIX}_USER_1`,
        totalTime: BASE_TIME + 100,
      },
      select: { id: true },
    });

    await prisma.user.create({
      data: {
        nickname: `${TEST_PREFIX}_USER_2`,
        totalTime: BASE_TIME + 300,
      },
    });

    await prisma.user.create({
      data: {
        nickname: `${TEST_PREFIX}_USER_3`,
        totalTime: BASE_TIME + 200,
      },
    });

    myUserId = user1.id;

    authToken = jwt.sign({ id: myUserId }, process.env.JWT_SECRET!, {
      expiresIn: '10m',
    });
  });

  afterEach(async () => {
    const testUsers = await prisma.user.findMany({
      where: {
        nickname: {
          startsWith: TEST_PREFIX,
        },
      },
      select: {
        id: true,
      },
    });

    const testUserIds = testUsers.map((user) => user.id);

    if (testUserIds.length > 0) {
      await prisma.goalLog.deleteMany({
        where: {
          goal: {
            userId: {
              in: testUserIds,
            },
          },
        },
      });

      await prisma.goal.deleteMany({
        where: {
          userId: {
            in: testUserIds,
          },
        },
      });

      await prisma.category.deleteMany({
        where: {
          userId: {
            in: testUserIds,
          },
        },
      });

      await prisma.user.deleteMany({
        where: {
          id: {
            in: testUserIds,
          },
        },
      });
    }

    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /rankings', () => {
    describe('200 - OK', () => {
      it('실제 DB 데이터를 기준으로 랭킹 목록을 조회한다', async () => {
        const res = await request(app)
          .get('/rankings')
          .set('Cookie', [`token=${authToken}`]);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('전체 랭킹');

        const { data } = res.body;

        expect(data).toHaveProperty('myRanking');
        expect(data).toHaveProperty('topRankings');
        expect(data).toHaveProperty('ranks');

        expect(typeof data.myRanking.myRanking).toBe('number');
        expect(Array.isArray(data.topRankings)).toBe(true);
        expect(Array.isArray(data.ranks)).toBe(true);

        expect(data.ranks.length).toBeGreaterThanOrEqual(3);

        expect(data.ranks).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              nickname: `${TEST_PREFIX}_USER_1`,
              totalTime: BASE_TIME + 100,
            }),
            expect.objectContaining({
              nickname: `${TEST_PREFIX}_USER_2`,
              totalTime: BASE_TIME + 300,
            }),
            expect.objectContaining({
              nickname: `${TEST_PREFIX}_USER_3`,
              totalTime: BASE_TIME + 200,
            }),
          ]),
        );

        const rankingUsers = data.ranks.filter((user: { nickname: string }) =>
          user.nickname.startsWith(TEST_PREFIX),
        );

        expect(rankingUsers[0]).toEqual(
          expect.objectContaining({
            nickname: `${TEST_PREFIX}_USER_2`,
            totalTime: BASE_TIME + 300,
          }),
        );

        expect(rankingUsers[1]).toEqual(
          expect.objectContaining({
            nickname: `${TEST_PREFIX}_USER_3`,
            totalTime: BASE_TIME + 200,
          }),
        );

        expect(rankingUsers[2]).toEqual(
          expect.objectContaining({
            nickname: `${TEST_PREFIX}_USER_1`,
            totalTime: BASE_TIME + 100,
          }),
        );

        if (rankingUsers.length >= 2) {
          expect(rankingUsers[1].rank).toBeGreaterThan(rankingUsers[0].rank);
        }
      });
    });

    describe('401 - UNAUTHORIZED', () => {
      it('인증되지 않은 요청일 경우 반환한다', async () => {
        const invalidToken = jwt.sign({ id: 999999 }, process.env.JWT_SECRET!, {
          expiresIn: '10m',
        });

        const res = await request(app)
          .get('/rankings')
          .set('Cookie', [`token=${invalidToken}`]);

        expect(res.status).toBe(401);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'UNAUTHORIZED',
              message: '유효하지 않은 토큰입니다.',
            }),
          }),
        );
      });
    });

    describe('500 - INTERNAL_SERVER_ERROR', () => {
      it('서버 내부 예외가 발생할 경우 반환한다', async () => {
        const serviceSpy = jest
          .spyOn(rankingService, 'getMyRank')
          .mockRejectedValue(new Error('DB Error'));

        const res = await request(app)
          .get('/rankings')
          .set('Cookie', [`token=${authToken}`]);

        expect(res.status).toBe(500);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'INTERNAL_SERVER_ERROR',
              message: '서버 오류가 발생했습니다.',
            }),
          }),
        );

        serviceSpy.mockRestore();
      });
    });
  });
});