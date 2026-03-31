import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/app';
import prisma from '../../src/config/prisma';

describe('Ranking API', () => {
  const TEST_PREFIX = `TEST_RANKING_${Date.now()}`;

  let authToken: string;
  let myUserId: number;

  beforeEach(async () => {
    // 추후 수정: totalTime 데이터는 향후 더 큰 값이나, db의 최댓값 + a로 값 수정이 필요합니다.
    const user1 = await prisma.user.create({
      data: {
        nickname: `${TEST_PREFIX}_USER_1`,
        totalTime: 120000,
      },
    });

    //const user2
    await prisma.user.create({
      data: {
        nickname: `${TEST_PREFIX}_USER_2`,
        totalTime: 300000,
      },
    });

    // const user3
    await prisma.user.create({
      data: {
        nickname: `${TEST_PREFIX}_USER_3`,
        totalTime: 200000,
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

  // 전체 랭킹 조회
  describe('GET /rankings', () => {
    it('실제 DB 데이터를 기준으로 랭킹 목록을 조회한다', async () => {
      const res = await request(app)
        .get('/rankings')
        .set('Cookie', [`token=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('전체 랭킹');
      // console.log('res.body,...', res.body);
      expect(res.body.data).toHaveProperty('ranks');
      expect(Array.isArray(res.body.data.ranks)).toBe(true);

      expect(res.body.data.ranks.length).toBeGreaterThanOrEqual(3);

      expect(res.body.data.ranks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            nickname: `${TEST_PREFIX}_USER_1`,
            totalTime: '00:02:00',
          }),
          expect.objectContaining({
            nickname: `${TEST_PREFIX}_USER_2`,
            totalTime: '00:05:00',
          }),
          expect.objectContaining({
            nickname: `${TEST_PREFIX}_USER_3`,
            totalTime: '00:03:20',
          }),
        ]),
      );

      const rankingUsers = res.body.data.ranks.filter(
        (user: { nickname: string }) => user.nickname.startsWith(TEST_PREFIX),
      );

      expect(rankingUsers[0]).toEqual(
        expect.objectContaining({
          nickname: `${TEST_PREFIX}_USER_2`,
          totalTime: '00:05:00',
        }),
      );

      expect(rankingUsers[1]).toEqual(
        expect.objectContaining({
          nickname: `${TEST_PREFIX}_USER_3`,
          totalTime: '00:03:20',
        }),
      );

      expect(rankingUsers[2]).toEqual(
        expect.objectContaining({
          nickname: `${TEST_PREFIX}_USER_1`,
          totalTime: '00:02:00',
        }),
      );
    });

    // 401 - 잘못된 토큰일 경우, 인증 에러를 반환한다
    // 401 - 만료된 토큰일 경우, 인증 에러를 반환한다
    // 500 - 서버 오류 시 명세된 에러 형식으로 반환한다
  });
});
