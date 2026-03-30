import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../src/main';
import prisma from '../../src/config/prisma';

describe('Goal API Integration', () => {
  const TEST_PREFIX = `TEST_GOALS_${Date.now()}`;

  let userId: number;
  let categoryId: number;
  let goalId: number;
  let authToken: string;

  beforeEach(async () => {
    const user = await prisma.user.create({
      data: {
        nickname: `${TEST_PREFIX}_USER`,
      },
    });

    userId = user.id;

    const category = await prisma.category.create({
      data: {
        name: `${TEST_PREFIX}_CATEGORY`,
        unit: '페이지',
        userId,
      },
    });

    categoryId = category.id;

    const goal = await prisma.goal.create({
      data: {
        title: `${TEST_PREFIX}_목표1`,
        description: '매일 알고리즘 3문제 풀기',
        targetValue: 100,
        quota: 10,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-31'),
        userId,
        categoryId,
      },
    });

    goalId = goal.id;

    authToken = jwt.sign({ id: userId }, process.env.JWT_SECRET!, {
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
      select: { id: true },
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /goals', () => {
    it('200 - 전체 목표 리스트를 조회한다', async () => {
      const res = await request(app)
        .get('/goals')
        .set('Cookie', [`token=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('전체 목표 리스트');

      expect(res.body.data).toHaveProperty('goals');
      expect(Array.isArray(res.body.data.goals)).toBe(true);

      expect(res.body.data.goals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: goalId,
            title: `${TEST_PREFIX}_목표1`,
            description: '매일 알고리즘 3문제 풀기',
            endDate: '2026-03-31',
          }),
        ]),
      );
    });
  });

  describe('POST /goals', () => {
    it('201 - 실제 DB에 목표를 생성한다', async () => {
      const body = {
        title: `${TEST_PREFIX}_목표2`,
        categoryId,
        detail: '목표2는 자기계발을 달성하기 위함입니다.',
        totalAmount: 200,
        startDate: '2026-03-17',
        endDate: '2026-04-17',
        quota: 20,
      };

      const res = await request(app)
        .post('/goals')
        .set('Cookie', [`token=${authToken}`])
        .send(body);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('목표 생성 완료');

      const createdGoal = await prisma.goal.findFirst({
        where: {
          title: `${TEST_PREFIX}_목표2`,
          userId,
        },
      });

      expect(createdGoal).not.toBeNull();
    });

    it('400 - 시작일이 종료일보다 늦으면 에러를 반환한다', async () => {
      const res = await request(app)
        .post('/goals')
        .set('Cookie', [`token=${authToken}`])
        .send({
          title: '테스트 목표',
          categoryId,
          detail: '설명',
          totalAmount: 100,
          startDate: '2026-05-01',
          endDate: '2026-04-01',
          quota: 10,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
    });

    it('400 - 필수값이 누락되면 에러를 반환한다', async () => {
      const res = await request(app)
        .post('/goals')
        .set('Cookie', [`token=${authToken}`])
        .send({
          title: `${TEST_PREFIX}_목표2`,
          categoryId,
          startDate: '2026-03-17',
          endDate: '2026-04-17',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('401 - 유효하지 않은 토큰이면 인증 에러를 반환한다', async () => {
      const res = await request(app)
        .post('/goals')
        .set('Cookie', ['token=invalid-token'])
        .send({
          title: `${TEST_PREFIX}_목표2`,
          categoryId,
          detail: '설명',
          totalAmount: 200,
          startDate: '2026-03-17',
          endDate: '2026-04-17',
          quota: 20,
        });

      expect(res.status).toBe(401);
    });

    it('404 - 존재하지 않는 카테고리면 에러를 반환한다', async () => {
      const res = await request(app)
        .post('/goals')
        .set('Cookie', [`token=${authToken}`])
        .send({
          title: '테스트 목표',
          categoryId: 999999,
          detail: '설명',
          totalAmount: 100,
          startDate: '2026-03-17',
          endDate: '2026-04-17',
          quota: 10,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CATEGORY_NOT_FOUND');
    });
  });
});