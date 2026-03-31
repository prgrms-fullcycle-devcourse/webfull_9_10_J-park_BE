import request from 'supertest';
import app from '../../src/app';
import prisma from '../../src/config/prisma';
import jwt from 'jsonwebtoken';

describe('Goal API', () => {
  const TEST_PREFIX = `TEST_GOALS_${Date.now()}`;

  let userId: number;
  let categoryId: number;
  let goalId: number;
  let authToken: string;
  // let testEmail: string;
  let testNickname: string;

  // 테스트 전, 임시 데이터 생성
  beforeEach(async () => {
    // testEmail = `${TEST_PREFIX}_${Math.random().toString(36).slice(2, 8)}@example.com`;
    testNickname = `${TEST_PREFIX}_USER`;

    const user = await prisma.user.create({
      data: {
        nickname: testNickname,
        // email: testEmail,
      },
    });

    userId = user.id;

    const category = await prisma.category.create({
      data: {
        name: `${TEST_PREFIX}_책`,
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

    authToken = jwt.sign(
      { id: userId },

      process.env.JWT_SECRET!,
      { expiresIn: '10m' },
    );
  });

  // 테스트 후, 임시 데이터 삭제
  afterEach(async () => {
    // 임시 생성한 테스트 유저만 찾기
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
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // 사용자의 전체 목표 리스트를 조회
  describe('GET /goals', () => {
    it('200 - 실제 DB에서 전체 목표 리스트를 조회한다', async () => {
      const res = await request(app)
        .get('/goals')
        .set('Cookie', [`token=${authToken}`]);

      // res 형식 검사
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('전체 목표 리스트');

      // data에 goals가 존재하는지, goals가 배열을 가지고 있는지
      expect(res.body.data).toHaveProperty('goals');
      expect(Array.isArray(res.body.data.goals)).toBe(true);

      expect(res.body.data.goals).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: goalId,
            title: `${TEST_PREFIX}_목표1`,
            description: '매일 알고리즘 3문제 풀기',
            endDate: '2026-03-31',
            progressRate: 0, // unit(서비스/로직)은 향후 테스트
          }),
        ]),
      );
    });

    // 401 - 잘못된 토큰일 경우, 인증 에러를 반환한다
    // 401 - 만료된 토큰일 경우, 인증 에러를 반환한다
    // 500 - 서버 오류 시 명세된 에러 형식으로 반환한다
  });

  // 목표 생성
  describe('POST /goals', () => {
    it('실제 DB에 목표를 생성한다', async () => {
      const body = {
        title: `${TEST_PREFIX}_목표2`,
        categoryId,
        detail: '목표2는 자기계발을 달성하기 위함입니다.',
        totalAmount: 200,
        startDate: '2026-03-17',
        endDate: '2026-04-17',
        quota: 20,
      };

      // console.log('jwt..', authToken);
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
      expect(createdGoal?.description).toBe(
        '목표2는 자기계발을 달성하기 위함입니다.',
      );
    });

    // 401 - 잘못된 토큰일 경우, 인증 에러를 반환한다
    // 401 - 만료된 토큰일 경우, 인증 에러를 반환한다
    // 500 - 서버 오류 시 명세된 에러 형식으로 반환한다
  });
});
