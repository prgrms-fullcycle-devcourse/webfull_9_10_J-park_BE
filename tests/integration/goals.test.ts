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
        status: 'active',
        currentValue: 30,
      },
    });

    goalId = goal.id;

    await prisma.goalLog.createMany({
      data: [
        {
          goalId,
          userId,
          achievedAt: new Date('2026-03-14'),
          targetValue: 10,
          actualValue: 8,
        },
        {
          goalId,
          userId,
          achievedAt: new Date('2026-03-15'),
          targetValue: 10,
          actualValue: 10,
        },
      ],
    });

    await prisma.timerLog.createMany({
      data: [
        {
          goalId,
          userId,
          timerDate: new Date('2026-03-14'),
          startTime: new Date('2026-03-14T10:00:00'),
          endTime: new Date('2026-03-14T11:00:00'),
          durationSec: 3600,
        },
        {
          goalId,
          userId,
          timerDate: new Date('2026-03-15'),
          startTime: new Date('2026-03-15T10:00:00'),
          endTime: new Date('2026-03-15T10:30:00'),
          durationSec: 1800,
        },
      ],
    });

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
      const testGoals = await prisma.goal.findMany({
        where: {
          userId: {
            in: testUserIds,
          },
        },
        select: { id: true },
      });

      const testGoalIds = testGoals.map((goal) => goal.id);

      await prisma.goalLog.deleteMany({
        where: {
          goalId: {
            in: testGoalIds,
          },
        },
      });

      await prisma.timerLog.deleteMany({
        where: {
          goalId: {
            in: testGoalIds,
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

  describe('GET /goals/:goalId/detail', () => {
    it('200 - dailyProgress 각 객체에 dailyId를 포함해 상세 정보를 조회한다', async () => {
      const res = await request(app)
        .get(`/goals/${goalId}/detail?startDate=2026-03-14&endDate=2026-03-15`)
        .set('Cookie', [`token=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('개별 목표 상세 정보');

      expect(res.body.data).toHaveProperty('dailyProgress');
      expect(Array.isArray(res.body.data.dailyProgress)).toBe(true);

      expect(res.body.data.dailyProgress).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            dailyId: 14,
            date: '2026-03-14',
          }),
          expect.objectContaining({
            dailyId: 15,
            date: '2026-03-15',
          }),
        ]),
      );
    });

    it('200 - 목표 기간과 겹치지 않는 조회 범위면 dailyProgress를 빈 배열로 반환한다', async () => {
      const res = await request(app)
        .get(`/goals/${goalId}/detail?startDate=2025-01-01&endDate=2025-01-02`)
        .set('Cookie', [`token=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dailyProgress).toEqual([]);
    });

    it('400 - 잘못된 날짜 범위면 에러를 반환한다', async () => {
      const res = await request(app)
        .get(`/goals/${goalId}/detail?startDate=2026-03-20&endDate=2026-03-10`)
        .set('Cookie', [`token=${authToken}`]);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('404 - 존재하지 않는 목표면 에러를 반환한다', async () => {
      const res = await request(app)
        .get('/goals/999999/detail')
        .set('Cookie', [`token=${authToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('GOAL_NOT_FOUND');
    });
  });

  describe('PATCH /goals/:goalId', () => {
    it('200 - 목표 수정 시 quota를 재계산하고 dailyProgress에 dailyId를 포함해 반환한다', async () => {
      const res = await request(app)
        .patch(`/goals/${goalId}`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          targetValue: 200,
          endDate: '2026-03-20',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('목표 수정 성공');

      const updatedGoal = await prisma.goal.findUnique({
        where: { id: goalId },
      });

      expect(updatedGoal).not.toBeNull();
      expect(updatedGoal?.targetValue).toBe(200);
      expect(updatedGoal?.endDate.toISOString().slice(0, 10)).toBe(
        '2026-03-20',
      );
      expect(updatedGoal?.quota).toBe(10);

      expect(res.body.data).toHaveProperty('dailyProgress');
      expect(Array.isArray(res.body.data.dailyProgress)).toBe(true);

      if (res.body.data.dailyProgress.length > 0) {
        expect(res.body.data.dailyProgress[0]).toHaveProperty('dailyId');
      }
    });

    it('400 - 수정할 값이 없으면 에러를 반환한다', async () => {
      const res = await request(app)
        .patch(`/goals/${goalId}`)
        .set('Cookie', [`token=${authToken}`])
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMPTY_UPDATE_DATA');
    });

    it('404 - 존재하지 않는 목표면 에러를 반환한다', async () => {
      const res = await request(app)
        .patch('/goals/999999')
        .set('Cookie', [`token=${authToken}`])
        .send({
          targetValue: 200,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('GOAL_NOT_FOUND');
    });

    it('400 - targetValue가 1 이상의 정수가 아니면 에러를 반환한다', async () => {
      const res = await request(app)
        .patch(`/goals/${goalId}`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          targetValue: 0,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TARGET_VALUE');
    });

    it('400 - endDate 형식이 잘못되면 에러를 반환한다', async () => {
      const res = await request(app)
        .patch(`/goals/${goalId}`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          endDate: '03-20-2026',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DATE');
    });

    it('400 - 종료일이 시작일보다 빠르면 에러를 반환한다', async () => {
      const res = await request(app)
        .patch(`/goals/${goalId}`)
        .set('Cookie', [`token=${authToken}`])
        .send({
          endDate: '2026-02-20',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_DATE_RANGE');
    });
  });

  describe('DELETE /goals/:goalId', () => {
    it('200 - 목표를 삭제한다', async () => {
      const deleteGoal = await prisma.goal.create({
        data: {
          title: `${TEST_PREFIX}_삭제목표`,
          description: '삭제 테스트',
          targetValue: 30,
          quota: 3,
          startDate: new Date('2026-03-10'),
          endDate: new Date('2026-03-20'),
          userId,
          categoryId,
          status: 'active',
          currentValue: 0,
        },
      });

      const res = await request(app)
        .delete(`/goals/${deleteGoal.id}`)
        .set('Cookie', [`token=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('목표 삭제 성공');
      expect(res.body.data.id).toBe(deleteGoal.id);

      const deletedGoal = await prisma.goal.findUnique({
        where: { id: deleteGoal.id },
      });

      expect(deletedGoal).toBeNull();
    });

    it('404 - 존재하지 않는 목표를 삭제하려 하면 에러를 반환한다', async () => {
      const res = await request(app)
        .delete('/goals/999999')
        .set('Cookie', [`token=${authToken}`]);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('GOAL_NOT_FOUND');
    });
  });

  describe('GET /goals/today', () => {
    it('200 - 오늘 목표 리스트 각 객체에 dailyId를 포함해 반환한다', async () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      const activeGoal = await prisma.goal.create({
        data: {
          title: `${TEST_PREFIX}_오늘목표`,
          description: '오늘 목표 테스트',
          targetValue: 50,
          quota: 5,
          startDate: new Date(todayStr),
          endDate: new Date(todayStr),
          userId,
          categoryId,
          status: 'active',
          currentValue: 3,
        },
      });

      const res = await request(app)
        .get('/goals/today')
        .set('Cookie', [`token=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('오늘 목표 리스트');
      expect(Array.isArray(res.body.data.todayGoals)).toBe(true);

      const todayGoal = res.body.data.todayGoals.find(
        (goal: { id: number }) => goal.id === activeGoal.id,
      );

      expect(todayGoal).toBeDefined();
      expect(todayGoal).toHaveProperty('dailyId');
      expect(todayGoal.dailyId).toBe(1);
    });

    it('200 - 오늘 진행 중인 목표가 없으면 빈 배열을 반환한다', async () => {
      const emptyUser = await prisma.user.create({
        data: {
          nickname: `${TEST_PREFIX}_EMPTY_USER`,
        },
      });

      const emptyToken = jwt.sign(
        { id: emptyUser.id },
        process.env.JWT_SECRET!,
        {
          expiresIn: '10m',
        },
      );

      const res = await request(app)
        .get('/goals/today')
        .set('Cookie', [`token=${emptyToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalStudyTime).toBe(0);
      expect(res.body.data.todayGoals).toEqual([]);
    });

    it('200 - 실행 중인 타이머가 있으면 isTimerRunning이 true다', async () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      const runningGoal = await prisma.goal.create({
        data: {
          title: `${TEST_PREFIX}_실행중목표`,
          description: '실행 중 타이머 테스트',
          targetValue: 20,
          quota: 5,
          startDate: new Date(todayStr),
          endDate: new Date(todayStr),
          userId,
          categoryId,
          status: 'active',
          currentValue: 2,
        },
      });

      await prisma.timerLog.create({
        data: {
          goalId: runningGoal.id,
          userId,
          timerDate: new Date(todayStr),
          startTime: new Date(`${todayStr}T10:00:00`),
          endTime: null,
          durationSec: 1200,
        },
      });

      const res = await request(app)
        .get('/goals/today')
        .set('Cookie', [`token=${authToken}`]);

      expect(res.status).toBe(200);

      const targetGoal = res.body.data.todayGoals.find(
        (goal: { id: number }) => goal.id === runningGoal.id,
      );

      expect(targetGoal).toBeDefined();
      expect(targetGoal.isTimerRunning).toBe(true);
      expect(targetGoal.studyTime).toBe(1200);
    });
  });
  describe('GET /goals/today/complete', () => {
    it('200 - 오늘 목표 달성률을 조회한다', async () => {
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);

      const goalA = await prisma.goal.create({
        data: {
          title: `${TEST_PREFIX}_달성률목표A`,
          description: '달성률 테스트 A',
          targetValue: 100,
          quota: 10,
          startDate: new Date(todayStr),
          endDate: new Date(todayStr),
          userId,
          categoryId,
          status: 'active',
          currentValue: 10,
        },
      });

      const goalB = await prisma.goal.create({
        data: {
          title: `${TEST_PREFIX}_달성률목표B`,
          description: '달성률 테스트 B',
          targetValue: 100,
          quota: 10,
          startDate: new Date(todayStr),
          endDate: new Date(todayStr),
          userId,
          categoryId,
          status: 'active',
          currentValue: 5,
        },
      });

      await prisma.goalLog.createMany({
        data: [
          {
            goalId: goalA.id,
            userId,
            achievedAt: new Date(todayStr),
            targetValue: 10,
            actualValue: 10, // 완료
          },
          {
            goalId: goalB.id,
            userId,
            achievedAt: new Date(todayStr),
            targetValue: 10,
            actualValue: 5, // 미완료
          },
        ],
      });

      await prisma.timerLog.createMany({
        data: [
          {
            goalId: goalA.id,
            userId,
            timerDate: new Date(todayStr),
            startTime: new Date(`${todayStr}T09:00:00`),
            endTime: new Date(`${todayStr}T09:30:00`),
            durationSec: 1800,
          },
          {
            goalId: goalB.id,
            userId,
            timerDate: new Date(todayStr),
            startTime: new Date(`${todayStr}T10:00:00`),
            endTime: new Date(`${todayStr}T10:20:00`),
            durationSec: 1200,
          },
        ],
      });

      const res = await request(app)
        .get('/goals/today/complete')
        .set('Cookie', [`token=${authToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('오늘 목표 달성률');

      expect(res.body.data.totalGoals).toBeGreaterThanOrEqual(2);
      expect(res.body.data.completedGoals).toBeGreaterThanOrEqual(1);
      expect(res.body.data.totalTime).toBeGreaterThanOrEqual(3000);
      expect(res.body.data.ratio).toBeGreaterThanOrEqual(0);
    });

    it('200 - 오늘 진행 중인 목표가 없으면 0을 반환한다', async () => {
      const emptyUser = await prisma.user.create({
        data: {
          nickname: `${TEST_PREFIX}_COMPLETE_EMPTY_USER`,
        },
      });

      const emptyToken = jwt.sign(
        { id: emptyUser.id },
        process.env.JWT_SECRET!,
        {
          expiresIn: '10m',
        },
      );

      const res = await request(app)
        .get('/goals/today/complete')
        .set('Cookie', [`token=${emptyToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        totalTime: 0,
        totalGoals: 0,
        completedGoals: 0,
        ratio: 0,
      });
    });

    it('401 - 유효하지 않은 토큰이면 인증 에러를 반환한다', async () => {
      const res = await request(app)
        .get('/goals/today/complete')
        .set('Cookie', ['token=invalid-token']);

      expect(res.status).toBe(401);
    });
  });
});
