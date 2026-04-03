import request from 'supertest';
import jwt from 'jsonwebtoken';

import app from '../../src/app';
import prisma from '../../src/config/prisma';
import * as timerService from '../../src/services/timer.service';
// 추후 수정: 가짜 시간으로 timer 테스트를 해 볼 방안이 필요
// 현재 jest.useFakeTimers() 사용 시 무한루프에 빠짐

describe('Timer API', () => {
  // 타이머 측정 시작
  describe('POST /timers/start', () => {
    const TEST_PREFIX = `TEST_TIMER_START_${Date.now()}`;

    let userId: number;
    let categoryId: number;
    let goalId: number;
    let token: string;

    // 테스트 데이터 생성
    beforeEach(async () => {
      const unique = Math.random().toString(36).slice(2, 8);

      const user = await prisma.user.create({
        data: {
          nickname: `${TEST_PREFIX}_USER_${unique}`,
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
          userId,
          categoryId,
          title: `${TEST_PREFIX}_GOAL`,
          description: '타이머 시작 테스트용 목표',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-31'),
          currentValue: 0,
          targetValue: 300,
          quota: 10,
        },
      });
      goalId = goal.id;

      token = jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
        expiresIn: '7d',
      });
    });

    // 테스트 데이터 삭제
    afterEach(async () => {
      jest.restoreAllMocks();

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

      const userIds = testUsers.map((user) => user.id);

      if (userIds.length > 0) {
        await prisma.timerLog.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.goalLog.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.goal.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.category.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.user.deleteMany({
          where: {
            id: {
              in: userIds,
            },
          },
        });
      }
    });

    afterAll(async () => {
      await prisma.$disconnect();
    });

    describe('201 - CREATED', () => {
      it('타이머 생성 후 형식에 맞게 응답한다.', async () => {
        const res = await request(app)
          .post('/timers/start')
          .set('Cookie', [`token=${token}`])
          .send({ goalId });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          success: true,
          message: '타이머 시작',
          data: {
            goalId,
            timerRunning: true,
          },
        });

        const createdTimer = await prisma.timerLog.findFirst({
          where: {
            userId,
            goalId,
            endTime: null,
          },
        });

        // 데이터 존재 유무 및 형식 검사
        expect(createdTimer).not.toBeNull();
        expect(createdTimer?.goalId).toBe(goalId);
        expect(createdTimer?.userId).toBe(userId);
        expect(createdTimer?.startTime).toBeInstanceOf(Date);
        expect(createdTimer?.endTime).toBeNull();
        expect(createdTimer?.timerDate).not.toBeNull();
        expect(createdTimer?.timerDate).toBeInstanceOf(Date);

        // timerDate 데이터 검사
        const start = createdTimer!.startTime;
        const timerDate = createdTimer!.timerDate;

        if (timerDate) {
          expect(timerDate.getFullYear()).toBe(start.getFullYear());
          expect(timerDate.getMonth()).toBe(start.getMonth());
          expect(timerDate.getDate()).toBe(start.getDate());
          expect(timerDate.getHours()).toBe(0);
          expect(timerDate.getMinutes()).toBe(0);
          expect(timerDate.getSeconds()).toBe(0);
        }
      });
    });

    describe('401 - UNAUTHORIZED', () => {
      it('인증되지 않은 요청일 경우 반환한다', async () => {
        const response = await request(app)
          .post('/timers/start')
          .set('Cookie', [`token=invalidToken`])
          .send({ goalId });

        expect(response.status).toBe(401);
        expect(response.body).toEqual(
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

    describe('400 - INVALID_GOAL_ID', () => {
      it('goalId가 없을 경우 반환한다', async () => {
        const response = await request(app)
          .post('/timers/start')
          .set('Cookie', [`token=${token}`])
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'INVALID_GOAL_ID',
              message: '유효하지 않은 goalId입니다.',
            }),
          }),
        );
      });

      it('goalId의 형식이 올바르지 않을 경우 반환한다', async () => {
        const response = await request(app)
          .post('/timers/start')
          .set('Cookie', [`token=${token}`])
          .send({
            goalId: 'goal_id',
          });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'INVALID_GOAL_ID',
              message: '유효하지 않은 goalId입니다.',
            }),
          }),
        );
      });
    });

    describe('404 - GOAL_NOT_FOUND', () => {
      it('요청한 goal이 존재하지 않을 경우 반환한다', async () => {
        const invalidGoalId = goalId + 1; // 존재하지 않는 goal id

        const res = await request(app)
          .post('/timers/start')
          .set('Cookie', [`token=${token}`])
          .send({ goalId: invalidGoalId });

        expect(res.status).toBe(404);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'GOAL_NOT_FOUND',
              message: '목표를 찾을 수 없습니다.',
            }),
          }),
        );
      });

      it('요청한 goal이 해당 사용자의 목표가 아닐 경우 반환한다', async () => {
        // 다른 유저의 목표를 생성
        const otherUser = await prisma.user.create({
          data: {
            nickname: `${TEST_PREFIX}_OTHER_USER`,
          },
        });
        const otherGoal = await prisma.goal.create({
          data: {
            userId: otherUser.id,
            categoryId,
            title: `${TEST_PREFIX}_OTHER_GOAL`,
            description: '다른 유저의 목표',
            startDate: new Date('2026-03-01'),
            endDate: new Date('2026-03-31'),
            currentValue: 0,
            targetValue: 100,
            quota: 10,
          },
        });

        const res = await request(app)
          .post('/timers/start')
          .set('Cookie', [`token=${token}`])
          .send({ goalId: otherGoal.id }); // 다른 유저의 목표를 전달

        expect(res.status).toBe(404);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'GOAL_NOT_FOUND',
              message: '목표를 찾을 수 없습니다.',
            }),
          }),
        );
      });
    });

    describe('409 - TIMER_ALREADY_RUNNING', () => {
      it('이미 실행 중인 타이머가 있을 경우 반환한다', async () => {
        const now = new Date();
        const timerDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );

        const goalLog = await prisma.goalLog.create({
          data: {
            userId,
            goalId,
            actualValue: 0,
            targetValue: 10,
            timeSpent: 0,
            achievedAt: timerDate,
          },
        });

        await prisma.timerLog.create({
          data: {
            userId,
            goalId,
            goalLogId: goalLog.id,
            timerDate,
            startTime: now,
          },
        });

        const res = await request(app)
          .post('/timers/start')
          .set('Cookie', [`token=${token}`])
          .send({ goalId });

        expect(res.status).toBe(409);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'TIMER_ALREADY_RUNNING',
              message: '이미 실행 중인 타이머가 있습니다.',
            }),
          }),
        );

        // 이후 중복 타이머가 생겼는지 확인 (한 개여야 함)
        const runningTimers = await prisma.timerLog.findMany({
          where: {
            userId,
            endTime: null,
          },
        });

        expect(runningTimers).toHaveLength(1);
      });
    });

    describe('500 - INTERNAL_SERVER_ERROR', () => {
      it('서버 내부 예외가 발생할 경우 반환한다', async () => {
        jest
          .spyOn(timerService, 'startTimerService')
          .mockRejectedValueOnce(new Error('DB error'));

        const res = await request(app)
          .post('/timers/start')
          .set('Cookie', [`token=${token}`])
          .send({ goalId });

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
      });
    });
  });

  // 타이머 측정 종료
  describe('POST /timers/end', () => {
    const TEST_PREFIX = `TEST_TIMER_END_${Date.now()}`;

    let userId: number;
    let categoryId: number;
    let goalId: number;
    let token: string;

    // 로컬 자정 Date 생성
    const getLocalMidnight = (baseDate: Date) => {
      const d = new Date(baseDate);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    afterAll(async () => {
      await prisma.$disconnect();
    });

    beforeEach(async () => {
      const unique = Math.random().toString(36).slice(2, 8);

      const user = await prisma.user.create({
        data: {
          nickname: `${TEST_PREFIX}_USER_${unique}`,
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
          userId,
          categoryId,
          title: `${TEST_PREFIX}_GOAL`,
          description: '타이머 시작 테스트용 목표',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-31'),
          currentValue: 11,
          targetValue: 300,
          quota: 10,
        },
      });
      goalId = goal.id;

      token = jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
        expiresIn: '7d',
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

      const userIds = testUsers.map((user) => user.id);

      if (userIds.length > 0) {
        await prisma.timerLog.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.goalLog.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.goal.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.category.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.user.deleteMany({
          where: {
            id: {
              in: userIds,
            },
          },
        });
      }
    });

    /**
     * 계산 로직에 대한 설명
     * 어제까지 goal.currentValue==10이라고 했을 때,
     * 오늘자 첫 타이머에서 1만큼 진행했다면, 그에 따라 goalLog.actualValue==1, goal.currentValue==11
     * 이번 타이머에서 2만큼 추가 진행했다면, 최종적으로 goalLog.actualValue==3, goal.currentValue==13
     * request body.currentCompletedAmount값은 최종 진행된 분량이므로 13을 받게 됨
     * response body.data.goalProgressRate는 오늘 목표 기준이므로 3/10 == 30%
     */
    describe('201 - CREATED', () => {
      it('적절한 데이터를 생성하며, 형식에 맞게 반환한다', async () => {
        const now = new Date();
        const timerDate = getLocalMidnight(now);

        const goalLog = await prisma.goalLog.create({
          data: {
            userId,
            goalId,
            actualValue: 1,
            targetValue: 10,
            timeSpent: 10000,
            achievedAt: timerDate,
          },
        });
        const goalLogId = goalLog.id;

        // 5분 전 시작한 타이머 생성
        const startTime = new Date(now.getTime() - 5 * 60 * 1000);
        const runningTimer = await prisma.timerLog.create({
          data: {
            userId,
            goalId,
            timerDate,
            startTime,
            goalLogId,
          },
        });

        const response = await request(app)
          .post('/timers/end')
          .set('Cookie', [`token=${token}`])
          .send({
            currentCompletedAmount: 13,
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('타이머 종료');

        expect(response.body.data).toEqual(
          expect.objectContaining({
            goalId,
            goalLogId,
            isTimerRunning: false,
            goalDuration: expect.any(Number),
            goalProgressRate: expect.any(Number),
          }),
        );

        // timerLog 검증
        const endedTimerLog = await prisma.timerLog.findUnique({
          where: { id: runningTimer.id },
        });

        expect(endedTimerLog).not.toBeNull();
        expect(endedTimerLog?.endTime).not.toBeNull();

        // 타이머 측정 시간 검사 (오차 범위 포함)
        const durationMs = 5 * 60 * 1000;

        expect(endedTimerLog?.durationSec).toBeGreaterThan(durationMs - 1000);
        expect(endedTimerLog?.durationSec).toBeLessThan(durationMs + 1000);

        // goalLog 검증
        const endedGoalLog = await prisma.goalLog.findUnique({
          where: { id: endedTimerLog?.goalLogId },
        });

        expect(endedGoalLog).not.toBeNull();

        const timeSpentMs = durationMs + goalLog.timeSpent;
        expect(endedGoalLog?.timeSpent).not.toBeNull();

        expect(endedGoalLog?.timeSpent).toBeGreaterThan(timeSpentMs - 1000);
        expect(endedGoalLog?.timeSpent).toBeLessThan(timeSpentMs + 1000);
        expect(response.body.data.goalDuration).toBeGreaterThan(
          timeSpentMs - 1000,
        );
        expect(response.body.data.goalDuration).toBeLessThan(
          timeSpentMs + 1000,
        );

        expect(endedGoalLog?.actualValue).toBe(3);

        // goal 업데이트 검사
        const endedGoal = await prisma.goal.findUnique({
          where: { id: goalId },
        });
        expect(endedGoal).not.toBeNull();
        expect(endedGoal?.currentValue).toBe(13);

        // 응답값 진행률 검사
        expect(response.body.data.goalProgressRate).toBe(30);
      });

      it('isPaused=true면 목표 상태를 inactive로 변경한다', async () => {
        const now = new Date();
        const timerDate = getLocalMidnight(now);

        const goalLog = await prisma.goalLog.create({
          data: {
            userId,
            goalId,
            actualValue: 1,
            targetValue: 10,
            timeSpent: 10000,
            achievedAt: timerDate,
          },
        });
        const goalLogId = goalLog.id;

        await prisma.timerLog.create({
          data: {
            userId,
            goalId,
            timerDate,
            startTime: new Date(now.getTime() - 60_000),
            goalLogId,
          },
        });

        const response = await request(app)
          .post('/timers/end')
          .set('Cookie', [`token=${token}`])
          .send({
            currentCompletedAmount: 13,
            isPaused: true,
          });

        expect(response.status).toBe(201);

        const goal = await prisma.goal.findUnique({
          where: { id: goalId },
        });

        expect(goal?.status).toBe('inactive');
      });
    });

    describe('400 - BAD_REQUEST', () => {
      it('currentCompletedAmount가 없을 경우 반환한다', async () => {
        const now = new Date();
        const timerDate = getLocalMidnight(now);

        const goalLog = await prisma.goalLog.create({
          data: {
            userId,
            goalId,
            actualValue: 1,
            targetValue: 10,
            timeSpent: 10000,
            achievedAt: timerDate,
          },
        });
        const goalLogId = goalLog.id;

        const startTime = new Date(now.getTime() - 5 * 60 * 1000);
        await prisma.timerLog.create({
          data: {
            userId,
            goalId,
            timerDate,
            startTime,
            goalLogId,
          },
        });

        const response = await request(app)
          .post('/timers/end')
          .set('Cookie', [`token=${token}`]);

        expect(response.status).toBe(400);
        expect(response.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'BAD_REQUEST',
              message: '요청 형식이 올바르지 않습니다.',
            }),
          }),
        );
      });

      it('currentCompletedAmount의 형식이 올바르지 않을 경우 반환한다', async () => {
        const now = new Date();
        const timerDate = getLocalMidnight(now);

        const goalLog = await prisma.goalLog.create({
          data: {
            userId,
            goalId,
            actualValue: 1,
            targetValue: 10,
            timeSpent: 10000,
            achievedAt: timerDate,
          },
        });
        const goalLogId = goalLog.id;

        const startTime = new Date(now.getTime() - 5 * 60 * 1000);
        await prisma.timerLog.create({
          data: {
            userId,
            goalId,
            timerDate,
            startTime,
            goalLogId,
          },
        });

        const response = await request(app)
          .post('/timers/end')
          .set('Cookie', [`token=${token}`])
          .send({
            currentCompletedAmount: 'currentCompletedAmount',
          });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'BAD_REQUEST',
              message: '요청 형식이 올바르지 않습니다.',
            }),
          }),
        );
      });

      it('isPaused의 형식이 올바르지 않을 경우 반환한다', async () => {
        const now = new Date();
        const timerDate = getLocalMidnight(now);

        const goalLog = await prisma.goalLog.create({
          data: {
            userId,
            goalId,
            actualValue: 1,
            targetValue: 10,
            timeSpent: 10000,
            achievedAt: timerDate,
          },
        });
        const goalLogId = goalLog.id;

        const startTime = new Date(now.getTime() - 5 * 60 * 1000);
        await prisma.timerLog.create({
          data: {
            userId,
            goalId,
            timerDate,
            startTime,
            goalLogId,
          },
        });

        const response = await request(app)
          .post('/timers/end')
          .set('Cookie', [`token=${token}`])
          .send({
            currentCompletedAmount: 13,
            isPaused: 'Paused',
          });

        expect(response.status).toBe(400);
        expect(response.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'BAD_REQUEST',
              message: '요청 형식이 올바르지 않습니다.',
            }),
          }),
        );
      });
    });

    describe('401 - UNAUTHORIZED', () => {
      it('인증되지 않은 요청일 경우 반환한다', async () => {
        const now = new Date();
        const timerDate = getLocalMidnight(now);

        const goalLog = await prisma.goalLog.create({
          data: {
            userId,
            goalId,
            actualValue: 1,
            targetValue: 10,
            timeSpent: 10000,
            achievedAt: timerDate,
          },
        });
        const goalLogId = goalLog.id;

        // 5분 전 시작한 타이머 생성
        const startTime = new Date(now.getTime() - 5 * 60 * 1000);
        await prisma.timerLog.create({
          data: {
            userId,
            goalId,
            timerDate,
            startTime,
            goalLogId,
          },
        });

        const response = await request(app)
          .post('/timers/end')
          .set('Cookie', [`token=invalidToken`])
          .send({
            currentCompletedAmount: 13,
          });

        expect(response.status).toBe(401);
        expect(response.body).toEqual(
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

    describe('404 - RUNNING_TIMER_NOT_FOUND', () => {
      it('실행 중인 타이머가 없으면 반환한다', async () => {
        const response = await request(app)
          .post('/timers/end')
          .set('Cookie', [`token=${token}`])
          .send({
            currentCompletedAmount: 13,
          });

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toEqual(
          expect.objectContaining({
            code: 'RUNNING_TIMER_NOT_FOUND',
            message: '실행 중인 타이머가 없습니다.',
          }),
        );
      });
    });

    describe('500 - INTERNAL_SERVER_ERROR', () => {
      it('서버 내부 예외가 발생할 경우 반환한다', async () => {
        jest
          .spyOn(timerService, 'endTimerService')
          .mockRejectedValueOnce(new Error('DB error'));

        const now = new Date();
        const timerDate = getLocalMidnight(now);

        const goalLog = await prisma.goalLog.create({
          data: {
            userId,
            goalId,
            actualValue: 1,
            targetValue: 10,
            timeSpent: 10000,
            achievedAt: timerDate,
          },
        });
        const goalLogId = goalLog.id;

        // 5분 전 시작한 타이머 생성
        const startTime = new Date(now.getTime() - 5 * 60 * 1000);
        await prisma.timerLog.create({
          data: {
            userId,
            goalId,
            timerDate,
            startTime,
            goalLogId,
          },
        });

        const response = await request(app)
          .post('/timers/end')
          .set('Cookie', [`token=${token}`])
          .send({
            currentCompletedAmount: 13,
          });

        expect(response.status).toBe(500);
        expect(response.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'INTERNAL_SERVER_ERROR',
              message: '서버 오류가 발생했습니다.',
            }),
          }),
        );
      });
    });
  });

  // 실행 중인 타이머 조회
  describe('GET /timers', () => {
    const TEST_PREFIX = `TEST_TIMER_${Date.now()}`;

    let userId: number;
    let categoryId: number;
    let goalId: number;
    let goalLogId: number;
    let token: string;

    // 시간 고정
    // const fixedNow = new Date('2026-03-30T10:00:00+09:00');
    const todayMidnight = new Date('2026-03-30T00:00:00+09:00');

    beforeAll(async () => {
      // jest.useFakeTimers();
      // jest.setSystemTime(fixedNow);
    });

    afterAll(async () => {
      // jest.useRealTimers();
      await prisma.$disconnect();
    });

    beforeEach(async () => {
      const unique = Math.random().toString(36).slice(2, 8);

      const user = await prisma.user.create({
        data: {
          nickname: `${TEST_PREFIX}_USER_${unique}`,
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
          userId,
          categoryId,
          title: `${TEST_PREFIX}_GOAL`,
          description: '타이머 시작 테스트용 목표',
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-31'),
          currentValue: 0,
          targetValue: 300,
          quota: 10,
        },
      });
      goalId = goal.id;

      // 오늘 누적 공부시간용 goalLog
      const goalLog = await prisma.goalLog.create({
        data: {
          userId,
          goalId,
          actualValue: 0,
          targetValue: 10,
          timeSpent: 0,
          achievedAt: todayMidnight,
        },
      });
      goalLogId = goalLog.id;

      token = jwt.sign({ id: userId }, process.env.JWT_SECRET as string, {
        expiresIn: '7d',
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

      const userIds = testUsers.map((user) => user.id);

      if (userIds.length > 0) {
        await prisma.timerLog.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.goalLog.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.goal.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.category.deleteMany({
          where: {
            userId: {
              in: userIds,
            },
          },
        });

        await prisma.user.deleteMany({
          where: {
            id: {
              in: userIds,
            },
          },
        });
      }
    });

    describe('200 - OK', () => {
      it('실행 중인 타이머 정보를 형식에 맞게 반환한다', async () => {
        // 종료된 타이머: 30분
        await prisma.timerLog.create({
          data: {
            userId,
            goalId,
            timerDate: todayMidnight,
            startTime: new Date('2026-03-30T08:00:00+09:00'),
            endTime: new Date('2026-03-30T08:30:00+09:00'),
            durationSec: 30 * 60 * 1000,
            goalLogId,
          },
        });

        // 실행 중 타이머 1개: 1시간 전부터 실행
        const runningTimer = await prisma.timerLog.create({
          data: {
            userId,
            goalId,
            timerDate: todayMidnight,
            startTime: new Date('2026-03-30T09:00:00+09:00'),
            endTime: null,
            goalLogId,
          },
        });

        const response = await request(app)
          .get('/timers')
          .set('Cookie', [`token=${token}`]);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('실행 중인 타이머 정보');

        expect(response.body.data).toEqual(
          expect.objectContaining({
            goalId,
            goalTitle: `${TEST_PREFIX}_GOAL`,
            goalLogId,
            todayCompletedAmount: 0,
            todayTargetAmount: 10,
            todayProgressRate: 0,
            timer: expect.objectContaining({
              isRunning: true,
              startedAt: runningTimer.startTime.toISOString(),
            }),
          }),
        );

        // 종료된 타이머 30분 + 실행 중 타이머 60분 = 90분 = 5,400,000ms 예상
        // expect(response.body.data.todayStudyDuration).toBe(5_400_000);
      });
    });

    describe('401 - UNAUTHORIZED', () => {
      it('인증되지 않은 요청일 경우 반환한다', async () => {
        const response = await request(app)
          .get('/timers')
          .set('Cookie', ['token=invalid-token']);

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toEqual(
          expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: '유효하지 않은 토큰입니다.',
          }),
        );
      });
    });

    describe('404 - RUNNING_TIMER_NOT_FOUND', () => {
      it('실행 중인 타이머가 없을 경우 반환한다', async () => {
        // 종료된 타이머만 존재
        await prisma.timerLog.create({
          data: {
            userId,
            goalId,
            timerDate: todayMidnight,
            startTime: new Date('2026-03-30T07:00:00.000Z'),
            endTime: new Date('2026-03-30T07:20:00.000Z'),
            durationSec: 20 * 60 * 1000,
            goalLogId,
          },
        });

        const response = await request(app)
          .get('/timers')
          .set('Cookie', [`token=${token}`]);

        expect(response.status).toBe(404);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toEqual(
          expect.objectContaining({
            code: 'RUNNING_TIMER_NOT_FOUND',
            message: '실행 중인 타이머가 없습니다.',
          }),
        );
      });
    });

    describe('500 - INTERNAL_SERVER_ERROR', () => {
      it('서버 내부 예외가 발생할 경우 반환한다', async () => {
        jest
          .spyOn(timerService, 'getRunningTimerService')
          .mockRejectedValueOnce(new Error('DB error'));

        const res = await request(app)
          .get('/timers')
          .set('Cookie', [`token=${token}`]);

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
      });
    });
  });
});
