import {
  getGoalListService,
  getGoalDetailService,
  getTodayGoalCompletionService,
  createGoalService,
  updateGoalService,
  deleteGoalService,
} from '../../src/services/goal.service';

import {
  getRunningTimerService,
  startTimerService,
  endTimerService,
} from '../../src/services/timer.service';

import prisma from '../../src/config/prisma';
import * as cacheUtil from '../../src/utils/cache.util';

/**
 * Prisma mock
 * - goal / timer 서비스 테스트에 필요한 메서드만 mock 처리
 */
jest.mock('../../src/config/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn(),
    user: {
      findUnique: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    goal: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    goalLog: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    timerLog: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

/**
 * Cache util mock
 * - 캐시 조회 / 저장 / 삭제 / 무효화 함수 mock 처리
 */
jest.mock('../../src/utils/cache.util', () => {
  const original = jest.requireActual('../../src/utils/cache.util');

  return {
    ...original,
    getCache: jest.fn(),
    setCache: jest.fn(),
    buildCacheKey: jest.fn((...parts) => parts.join(':')),
    delCache: jest.fn(),
    invalidateGoalListCache: jest.fn(),
    invalidateGoalDetailCache: jest.fn(),
  };
});

describe('cache tests', () => {
  const mockedPrisma = prisma as unknown as {
    $transaction: jest.Mock;
    user: {
      findUnique: jest.Mock;
    };
    category: {
      findFirst: jest.Mock;
    };
    goal: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    goalLog: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    timerLog: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      aggregate: jest.Mock;
    };
  };

  const mockedCache = cacheUtil as jest.Mocked<typeof cacheUtil>;

  /**
   * 각 테스트 실행 전 mock 초기화
   * - 이전 테스트의 호출 기록이 다음 테스트에 영향을 주지 않도록 처리
   */
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * =========================
   * Goal 서비스 캐시 테스트
   * =========================
   */
  describe('goal', () => {
    describe('getGoalListService', () => {
      it('캐시 hit면 DB 조회 없이 캐시 데이터를 반환한다', async () => {
        const cachedValue = {
          goals: [
            {
              id: 1,
              title: '캐시 목표',
              endDate: '2026-04-09',
              description: 'cached',
              progressRate: 50,
            },
          ],
        };

        mockedCache.getCache.mockResolvedValueOnce(cachedValue);

        const result = await getGoalListService(1);

        expect(mockedCache.buildCacheKey).toHaveBeenCalledWith(
          'lampfire',
          'goals',
          'list',
          1,
        );
        expect(mockedCache.getCache).toHaveBeenCalledTimes(1);
        expect(mockedPrisma.goal.findMany).not.toHaveBeenCalled();
        expect(result).toEqual(cachedValue);
      });

      it('캐시 miss면 DB 조회 후 setCache 한다', async () => {
        mockedCache.getCache.mockResolvedValueOnce(null);
        mockedPrisma.goal.findMany.mockResolvedValueOnce([
          {
            id: 1,
            title: '목표 1',
            description: 'desc',
            endDate: new Date('2026-04-20T00:00:00.000Z'),
            currentValue: 20,
            targetValue: 40,
          },
        ]);

        const result = await getGoalListService(1);

        expect(mockedPrisma.goal.findMany).toHaveBeenCalledTimes(1);
        expect(mockedCache.setCache).toHaveBeenCalledTimes(1);
        expect(mockedCache.setCache).toHaveBeenCalledWith(
          'lampfire:goals:list:1',
          result,
          60,
        );

        expect(result.goals).toHaveLength(1);
        expect(result.goals[0]).toMatchObject({
          id: 1,
          title: '목표 1',
          description: 'desc',
          progressRate: 50,
        });
      });
    });

    describe('getGoalDetailService', () => {
      it('캐시 hit면 DB 조회 없이 상세 데이터를 반환한다', async () => {
        const cachedValue = {
          id: 1,
          title: '상세 목표',
          description: 'cached',
          category: '공부',
          progress: {
            rate: 10,
            currentAmount: 1,
            targetAmount: 10,
            totalStudyTime: 100,
            unit: '페이지',
          },
          period: {
            startDate: '2026-04-01',
            endDate: '2026-04-10',
            daysRemaining: 1,
          },
          dailyProgress: [],
        };

        mockedCache.getCache.mockResolvedValueOnce(cachedValue as never);

        const result = await getGoalDetailService({
          userId: 1,
          goalId: 99,
        });

        expect(mockedCache.getCache).toHaveBeenCalledTimes(1);
        expect(mockedPrisma.goal.findFirst).not.toHaveBeenCalled();
        expect(result).toEqual(cachedValue);
      });

      it('캐시 miss면 DB 조회 후 setCache 한다', async () => {
        mockedCache.getCache.mockResolvedValueOnce(null);

        mockedPrisma.goal.findFirst.mockResolvedValueOnce({
          id: 99,
          title: '상세 목표',
          description: '설명',
          currentValue: 30,
          targetValue: 100,
          startDate: new Date('2026-04-01T00:00:00.000Z'),
          endDate: new Date('2026-04-10T00:00:00.000Z'),
          quota: 10,
          category: {
            name: '공부',
            unit: '페이지',
          },
        });

        mockedPrisma.goalLog.findMany.mockResolvedValueOnce([
          {
            id: 500,
            goalId: 99,
            userId: 1,
            achievedAt: new Date('2026-04-02T00:00:00.000Z'),
            targetValue: 10,
            actualValue: 7,
          },
        ]);

        mockedPrisma.timerLog.findMany.mockResolvedValueOnce([
          {
            goalId: 99,
            timerDate: new Date('2026-04-02T00:00:00.000Z'),
            durationSec: 300,
          },
        ]);

        mockedPrisma.timerLog.aggregate.mockResolvedValueOnce({
          _sum: {
            durationSec: 300,
          },
        });

        const result = await getGoalDetailService({
          userId: 1,
          goalId: 99,
          startDate: '2026-04-01',
          endDate: '2026-04-03',
        });

        expect(mockedPrisma.goal.findFirst).toHaveBeenCalledTimes(1);
        expect(mockedCache.setCache).toHaveBeenCalledTimes(1);
        expect(result.id).toBe(99);
        expect(result.progress.totalStudyTime).toBe(300);
        expect(result.dailyProgress.length).toBeGreaterThan(0);
      });
    });

    describe('getTodayGoalCompletionService', () => {
      it('캐시 hit면 DB 조회 없이 반환한다', async () => {
        const cachedValue = {
          totalTime: 1200,
          totalGoals: 3,
          completedGoals: 2,
          ratio: 66,
        };

        mockedCache.getCache.mockResolvedValueOnce(cachedValue);

        const result = await getTodayGoalCompletionService(1);

        expect(mockedCache.getCache).toHaveBeenCalledTimes(1);
        expect(mockedPrisma.goal.findMany).not.toHaveBeenCalled();
        expect(result).toEqual(cachedValue);
      });

      it('캐시 miss면 DB 조회 후 10초 TTL로 캐싱한다', async () => {
        mockedCache.getCache.mockResolvedValueOnce(null);

        mockedPrisma.goal.findMany.mockResolvedValueOnce([
          { id: 1 },
          { id: 2 },
          { id: 3 },
        ]);

        mockedPrisma.goalLog.findMany.mockResolvedValueOnce([
          {
            goalId: 1,
            targetValue: 10,
            actualValue: 10,
          },
          {
            goalId: 2,
            targetValue: 10,
            actualValue: 5,
          },
          {
            goalId: 3,
            targetValue: 20,
            actualValue: 25,
          },
        ]);

        mockedPrisma.timerLog.findMany.mockResolvedValueOnce([
          { durationSec: 300 },
          { durationSec: 120 },
        ]);

        const result = await getTodayGoalCompletionService(1);

        expect(result).toEqual({
          totalTime: 420,
          totalGoals: 3,
          completedGoals: 2,
          ratio: 66,
        });

        expect(mockedCache.setCache).toHaveBeenCalledTimes(1);
        expect(mockedCache.setCache).toHaveBeenCalledWith(
          expect.stringContaining('lampfire:goals:today:complete:1:'),
          result,
          10,
        );
      });

      it('진행 중인 목표가 없으면 기본값을 캐싱해서 반환한다', async () => {
        mockedCache.getCache.mockResolvedValueOnce(null);
        mockedPrisma.goal.findMany.mockResolvedValueOnce([]);

        const result = await getTodayGoalCompletionService(1);

        expect(result).toEqual({
          totalTime: 0,
          totalGoals: 0,
          completedGoals: 0,
          ratio: 0,
        });

        expect(mockedCache.setCache).toHaveBeenCalledWith(
          expect.stringContaining('lampfire:goals:today:complete:1:'),
          {
            totalTime: 0,
            totalGoals: 0,
            completedGoals: 0,
            ratio: 0,
          },
          10,
        );
      });
    });

    describe('cache invalidation on write', () => {
      /**
       * write 작업(create / update / delete) 이후에는
       * 조회 캐시가 오래된 값이 되지 않도록 무효화되어야 함
       */
      it('createGoalService는 목표 생성 후 목록 캐시를 무효화한다', async () => {
        mockedPrisma.user.findUnique.mockResolvedValueOnce({
          id: 1,
          nickname: 'tester',
        });

        mockedPrisma.category.findFirst.mockResolvedValueOnce({
          id: 10,
        });

        mockedPrisma.goal.create.mockResolvedValueOnce({
          id: 100,
          title: '새 목표',
          categoryId: 10,
          status: 'active',
          currentValue: 0,
          targetValue: 30,
          quota: 10,
        });

        const result = await createGoalService(1, {
          title: '새 목표',
          categoryId: 10,
          detail: '설명',
          totalAmount: 30,
          startDate: '2026-04-01',
          endDate: '2026-04-03',
        });

        expect(mockedCache.invalidateGoalListCache).toHaveBeenCalledWith(1);
        expect(result.nickname).toBe('tester');
      });

      it('updateGoalService는 목록/상세 캐시를 모두 무효화한다', async () => {
        mockedPrisma.goal.findFirst.mockResolvedValueOnce({
          id: 5,
          startDate: new Date('2026-04-01T00:00:00.000Z'),
          targetValue: 30,
          endDate: new Date('2026-04-03T00:00:00.000Z'),
        });

        mockedPrisma.goal.update.mockResolvedValueOnce({});

        mockedPrisma.goal.findFirst.mockResolvedValueOnce({
          id: 5,
          title: '수정 목표',
          description: '설명',
          currentValue: 0,
          targetValue: 60,
          startDate: new Date('2026-04-01T00:00:00.000Z'),
          endDate: new Date('2026-04-06T00:00:00.000Z'),
          category: { name: '공부', unit: '페이지' },
          goalLogs: [],
          timerLogs: [],
        });

        await updateGoalService(1, 5, {
          totalAmount: 60,
          endDate: '2026-04-06',
        });

        expect(mockedCache.invalidateGoalListCache).toHaveBeenCalledWith(1);
        expect(mockedCache.invalidateGoalDetailCache).toHaveBeenCalledWith(
          1,
          5,
        );
      });

      it('deleteGoalService는 목록/상세 캐시를 모두 무효화한다', async () => {
        mockedPrisma.goal.findFirst.mockResolvedValueOnce({
          id: 7,
          title: '삭제 목표',
        });

        mockedPrisma.goal.delete.mockResolvedValueOnce({
          id: 7,
          title: '삭제 목표',
        });

        const result = await deleteGoalService(1, 7);

        expect(mockedCache.invalidateGoalListCache).toHaveBeenCalledWith(1);
        expect(mockedCache.invalidateGoalDetailCache).toHaveBeenCalledWith(
          1,
          7,
        );
        expect(result).toEqual({
          id: 7,
          title: '삭제 목표',
        });
      });
    });
  });

  /**
   * =========================
   * Timer 서비스 캐시 테스트
   * =========================
   */
  describe('timer', () => {
    const userId = 1;

    describe('getRunningTimerService', () => {
      it('캐시 hit면 DB 조회 없이 반환한다', async () => {
        const cachedValue = {
          goalId: 1,
          goalTitle: '테스트 목표',
          goalLogId: 10,
          todayStudyDuration: 300,
          todayProgressRate: 50,
          todayCompletedAmount: 5,
          todayTargetAmount: 10,
          timer: {
            isRunning: true,
            startedAt: new Date(),
          },
        };

        mockedCache.getCache.mockResolvedValueOnce(cachedValue);

        const result = await getRunningTimerService(userId);

        expect(mockedCache.getCache).toHaveBeenCalledTimes(1);
        expect(mockedPrisma.timerLog.findMany).not.toHaveBeenCalled();
        expect(result).toEqual(cachedValue);
      });

      it('캐시 miss면 DB 조회 후 캐싱한다', async () => {
        mockedCache.getCache.mockResolvedValueOnce(null);

        mockedPrisma.timerLog.findMany.mockResolvedValueOnce([
          {
            goalId: 1,
            goalLogId: 10,
            startTime: new Date(),
            goal: {},
          },
        ]);

        mockedPrisma.goal.findFirst.mockResolvedValueOnce({
          title: '테스트 목표',
        });

        mockedPrisma.goalLog.findUnique.mockResolvedValueOnce({
          actualValue: 5,
          targetValue: 10,
          timeSpent: 300,
        });

        const result = await getRunningTimerService(userId);

        expect(mockedCache.setCache).toHaveBeenCalledTimes(1);
        expect(result.goalId).toBe(1);
      });
    });

    describe('cache invalidation on timer write', () => {
      /**
       * 타이머 시작 시
       * - running timer 캐시
       * - 오늘 목표 캐시
       * 가 무효화되어야 함
       */
      it('startTimerService는 running/오늘 목표 캐시를 무효화한다', async () => {
        mockedPrisma.goal.findFirst.mockResolvedValueOnce({
          id: 1,
          quota: 10,
        });

        mockedPrisma.timerLog.findFirst.mockResolvedValueOnce(null);

        mockedPrisma.$transaction.mockResolvedValue({
          id: 100,
        });

        mockedPrisma.timerLog.create.mockResolvedValueOnce({});

        await startTimerService(userId, 1);

        expect(mockedCache.delCache).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining('lampfire:timers:running:1'),
            expect.stringContaining('lampfire:goals:today:1'),
          ]),
        );
      });

      /**
       * 타이머 종료 시
       * - 목표 상세 캐시
       * - 오늘 목표 캐시
       * - 오늘 목표 달성률 캐시
       * - running timer 캐시
       * 가 무효화되어야 함
       */
      it('endTimerService는 상세/오늘 목표/오늘 달성률/running 캐시를 무효화한다', async () => {
        mockedPrisma.timerLog.findMany.mockResolvedValueOnce([
          {
            id: 1,
            goalId: 1,
            goalLogId: 10,
            startTime: new Date(Date.now() - 1000),
          },
        ]);

        mockedPrisma.goal.findFirst.mockResolvedValueOnce({
          title: '목표',
          currentValue: 5,
        });

        mockedPrisma.timerLog.update.mockResolvedValueOnce({});
        mockedPrisma.goalLog.update.mockResolvedValueOnce({
          timeSpent: 1000,
          actualValue: 10,
          targetValue: 10,
        });

        mockedPrisma.goal.update.mockResolvedValueOnce({});

        await endTimerService(userId, 10);

        expect(mockedCache.invalidateGoalDetailCache).toHaveBeenCalledWith(
          userId,
          1,
        );

        expect(mockedCache.delCache).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining('lampfire:goals:today:1'),
            expect.stringContaining('lampfire:goals:today:complete:1:'),
            expect.stringContaining('lampfire:timers:running:1'),
          ]),
        );
      });
    });
  });
});
