import prisma from '../config/prisma';
import {
  CreateGoalRequest,
  CreateGoalResponse,
  DeleteGoalResponse,
  GoalDetailResponse,
  GoalListResponse,
  TodayGoalsResponse,
  UpdateGoalRequest,
  UpdatedGoalResponse,
} from '../types/goal.type';
import {
  addDays,
  calculateDaysRemaining,
  calculateProgressRate,
  formatDate,
  getDateRange,
  isValidDateString,
  toEndOfDay,
  toStartOfDay,
  parseDateStringToKSTStart,
} from '../utils/goal.util';

import {
  getCache,
  setCache,
  buildCacheKey,
  invalidateGoalListCache,
  invalidateGoalDetailCache,
} from '../utils/cache.util';
import { getQuotaByGoal } from '../utils/quota.util';

/**
 * 개별 목표 상세 조회 서비스 파라미터
 */
interface GetGoalDetailServiceParams {
  userId: number;
  goalId: number;
  startDate?: string;
  endDate?: string;
}

/**
 * 목표 수정 후 응답 데이터 생성
 *
 * 역할:
 * - 수정된 목표를 다시 조회 (category, goalLogs 포함)
 * - UpdatedGoalResponse 형태로 가공
 *
 * 주의:
 * -  goalLogs의 actualValue / targetValue는 null 가능하므로 기본값 처리가 필요함
 */
const buildUpdatedGoalResponse = async (
  userId: number,
  goalId: number,
): Promise<UpdatedGoalResponse> => {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    include: {
      category: true,
      goalLogs: {
        orderBy: {
          achievedAt: 'asc',
        },
      },
      timerLogs: {
        select: {
          durationSec: true,
        },
      },
    },
  });

  if (!goal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  const totalStudyTime = goal.timerLogs.reduce(
    (sum, log) => sum + log.durationSec,
    0,
  );

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    category: goal.category.name,
    progress: {
      rate: calculateProgressRate(goal.currentValue, goal.targetValue),
      currentAmount: goal.currentValue,
      targetAmount: goal.targetValue,
      unit: goal.category.unit,
      totalStudyTime,
    },
    period: {
      startDate: formatDate(goal.startDate),
      endDate: formatDate(goal.endDate),
      daysRemaining: calculateDaysRemaining(goal.endDate),
    },
    dailyProgress: goal.goalLogs.map((log) => {
      return {
        goalLogId: log.id,
        date: formatDate(log.achievedAt),
        targetAmount: log.targetValue ?? 0,
        completedAmount: log.actualValue ?? 0,
        isCompleted: (log.actualValue ?? 0) >= (log.targetValue ?? 0),
        studyTime: log.timeSpent ?? 0,
        isToday: formatDate(log.achievedAt) === formatDate(new Date()),
      };
    }),
  };
};

/**
 * 목표 생성 서비스
 *
 * 역할:
 * - 사용자/카테고리 유효성 확인
 * - 날짜 검증
 * - 목표 생성
 * - 생성 결과 반환
 */
export const createGoalService = async (
  userId: number,
  payload: CreateGoalRequest,
): Promise<CreateGoalResponse> => {
  const { title, categoryId, detail, totalAmount, startDate, endDate } =
    payload;

  /**
   * 사용자 존재 여부 확인
   */
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
    },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  /**
   * 카테고리 존재 여부
   */
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      // userId,
    },
  });

  if (!category) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  /**
   * 날짜 문자열 유효성 검사
   */
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    throw new Error('INVALID_DATE');
  }

  const parsedStartDate = parseDateStringToKSTStart(startDate);
  const parsedEndDate = parseDateStringToKSTStart(endDate);

  /**
   * 시작일이 종료일보다 늦은 경우 예외 처리
   */
  if (parsedStartDate > parsedEndDate) {
    throw new Error('INVALID_DATE_RANGE');
  }

  /**
   * 하루 할당량(quota) 계산
   * 시작일 ~ 종료일 포함
   */
  const diffTime = parsedEndDate.getTime() - parsedStartDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const quota = Math.ceil(totalAmount / diffDays);

  /**
   * 목표 생성
   */
  const createdGoal = await prisma.goal.create({
    data: {
      userId,
      categoryId,
      title,
      description: detail,
      status: 'active',
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      currentValue: 0,
      targetValue: totalAmount,
      quota,
    },
    select: {
      id: true,
      title: true,
      categoryId: true,
      status: true,
      currentValue: true,
      targetValue: true,
      quota: true,
    },
  });

  // GET /goals 캐시 무효화
  await invalidateGoalListCache(userId);

  /**
   * 생성된 목표 + 사용자 닉네임 반환
   */
  return {
    ...createdGoal,
    nickname: user.nickname,
  };
};

/**
 * 전체 목표 리스트 조회 서비스
 *
 * 역할:
 * - 사용자의 목표 전체 조회
 * - 마감일 오름차순 정렬
 * - 진행률/날짜 형식 가공
 */
export const getGoalListService = async (
  userId: number,
): Promise<GoalListResponse> => {
  // cache key 생성
  const cacheKey = buildCacheKey('lampfire', 'goals', 'list', userId);

  // 캐시 조회
  const cached = await getCache<GoalListResponse>(cacheKey);

  if (cached) {
    //console.log('[CACHE HIT] GET /goals');
    return cached;
  }

  //console.log('[CACHE MISS] GET /goals');

  const goals = await prisma.goal.findMany({
    where: {
      userId,
    },
    orderBy: {
      endDate: 'asc',
    },
    select: {
      id: true,
      title: true,
      description: true,
      endDate: true,
      currentValue: true,
      targetValue: true,
    },
  });

  const result: GoalListResponse = {
    goals: goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      endDate: formatDate(goal.endDate),
      description: goal.description,
      progressRate: calculateProgressRate(goal.currentValue, goal.targetValue),
    })),
  };

  //  캐시에 저장
  await setCache(cacheKey, result, 60);

  return result;
};

/**
 * 개별 목표 상세 조회 서비스
 *
 * 역할:
 * - 목표 + 카테고리 조회
 * - 기간 내 GoalLog / TimerLog 조회
 * - 일별 진행 현황 구성
 * - 상세 응답 DTO 반환
 */
export const getGoalDetailService = async ({
  userId,
  goalId,
  startDate,
  endDate,
}: GetGoalDetailServiceParams): Promise<GoalDetailResponse> => {
  const cacheKey = buildCacheKey(
    'lampfire',
    'goals',
    'detail',
    userId,
    goalId,
    startDate ?? 'no-start',
    endDate ?? 'no-end',
  );

  const cached = await getCache<GoalDetailResponse>(cacheKey);
  if (cached) {
    //console.log('[CACHE HIT] GET /goals/:goalId/detail');
    return cached;
  }

  //console.log('[CACHE MISS] GET /goals/:goalId/detail');

  /**
   * 조회 기간 설정
   *
   * 기본 정책:
   * - 기본값: 오늘 기준 -7일 ~ +14일
   * - 프론트에서 startDate / endDate 주면 그 값 사용
   *
   * 주의:
   * - startDate는 시작일 00:00 기준으로 처리
   * - endDate는 종료일 23:59:59 기준으로 처리
   */
  const today = toStartOfDay(new Date());
  const defaultStartDate = addDays(today, -7);
  const defaultEndDate = addDays(today, 14);

  if (startDate && !isValidDateString(startDate)) {
    throw new Error('INVALID_DATE');
  }

  if (endDate && !isValidDateString(endDate)) {
    throw new Error('INVALID_DATE');
  }

  const queryStartDate = startDate
    ? toStartOfDay(parseDateStringToKSTStart(startDate))
    : defaultStartDate;

  const queryEndDate = endDate
    ? toEndOfDay(parseDateStringToKSTStart(endDate))
    : toEndOfDay(defaultEndDate);

  if (queryStartDate > queryEndDate) {
    throw new Error('INVALID_DATE_RANGE');
  }

  /**
   * 목표 조회
   * - userId 포함해서 본인 목표만 조회
   */
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    include: {
      category: true,
    },
  });

  if (!goal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  /**
   * 조회 기간을 목표 기간 안으로 보정
   */
  const clampedStartDate =
    queryStartDate < toStartOfDay(goal.startDate)
      ? toStartOfDay(goal.startDate)
      : queryStartDate;

  const clampedEndDate =
    queryEndDate > toEndOfDay(goal.endDate)
      ? toEndOfDay(goal.endDate)
      : queryEndDate;

  if (clampedStartDate > clampedEndDate) {
    const emptyResult: GoalDetailResponse = {
      id: goal.id,
      title: goal.title,
      description: goal.description,
      category: goal.category.name,
      progress: {
        rate: calculateProgressRate(goal.currentValue, goal.targetValue),
        currentAmount: goal.currentValue,
        targetAmount: goal.targetValue,
        totalStudyTime: 0,
        unit: goal.category.unit,
      },
      period: {
        startDate: formatDate(goal.startDate),
        endDate: formatDate(goal.endDate),
        daysRemaining: calculateDaysRemaining(goal.endDate),
      },
      dailyProgress: [],
    };

    await setCache(cacheKey, emptyResult, 60);
    return emptyResult;
  }

  /**
   * 기간 내 GoalLog / TimerLog 병렬 조회
   */
  const [goalLogs, timerLogs, totalTimerAggregate] = await Promise.all([
    prisma.goalLog.findMany({
      where: {
        goalId: goal.id,
        userId,
        achievedAt: {
          gte: clampedStartDate,
          lte: clampedEndDate,
        },
      },
      orderBy: {
        achievedAt: 'asc',
      },
    }),

    prisma.timerLog.findMany({
      where: {
        goalId: goal.id,
        timerDate: {
          gte: clampedStartDate,
          lte: clampedEndDate,
        },
      },
      orderBy: {
        timerDate: 'asc',
      },
    }),

    prisma.timerLog.aggregate({
      where: {
        goalId: goal.id,
      },
      _sum: {
        durationSec: true,
      },
    }),
  ]);

  /**
   * 누적 공부 시간
   */
  const totalStudyTime = totalTimerAggregate._sum.durationSec ?? 0;

  const goalLogMap = new Map(
    goalLogs.map((log) => [formatDate(log.achievedAt), log]),
  );

  const timerStudyTimeMap = new Map<string, number>();
  timerLogs
    .filter((log) => log.timerDate !== null)
    .forEach((log) => {
      const key = formatDate(log.timerDate as Date);
      const prev = timerStudyTimeMap.get(key) ?? 0;
      timerStudyTimeMap.set(key, prev + log.durationSec);
    });

  const dateRange = getDateRange(
    clampedStartDate,
    toStartOfDay(clampedEndDate),
  );

  const dailyProgress = dateRange.map((date) => {
    const dateKey = formatDate(date);
    const goalLog = goalLogMap.get(dateKey);

    const targetAmount = goalLog?.targetValue ?? goal.quota;
    const completedAmount = goalLog?.actualValue ?? 0;

    return {
      goalLogId: goalLog?.id ?? null,
      date: dateKey,
      targetAmount,
      completedAmount,
      isCompleted: completedAmount >= targetAmount,
      studyTime: timerStudyTimeMap.get(dateKey) ?? 0,
      isToday: dateKey === formatDate(today),
    };
  });

  const result: GoalDetailResponse = {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    category: goal.category.name,
    progress: {
      rate: calculateProgressRate(goal.currentValue, goal.targetValue),
      currentAmount: goal.currentValue,
      targetAmount: goal.targetValue,
      totalStudyTime,
      unit: goal.category.unit,
    },
    period: {
      startDate: formatDate(goal.startDate),
      endDate: formatDate(goal.endDate),
      daysRemaining: calculateDaysRemaining(goal.endDate),
    },
    dailyProgress,
  };

  await setCache(cacheKey, result, 60);

  return result;
};

/**
 * 개별 목표 수정 서비스
 *
 * 흐름:
 * 1. 목표 존재 여부 + 본인 소유 확인
 * 2. 수정 요청값 유효성 검증
 * 3. 실제 반영될 값 계산 (targetValue, endDate)
 * 4. quota 재계산
 * 5. DB 업데이트
 * 6. 최신 상태 조회 후 응답 반환
 */
export const updateGoalService = async (
  userId: number,
  goalId: number,
  payload: UpdateGoalRequest,
): Promise<UpdatedGoalResponse> => {
  /**
   * 1. 목표 존재 + 본인 소유 여부 확인
   */
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select: {
      id: true,
      startDate: true,
      targetValue: true,
      endDate: true,
    },
  });

  if (!goal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  const { totalAmount, endDate } = payload;

  /**
   * 2. 수정값이 하나도 없는 경우 예외 처리
   */
  if (totalAmount === undefined && endDate === undefined) {
    throw new Error('EMPTY_UPDATE_DATA');
  }

  /**
   * 3. 목표 총량(totalAmount) 유효성 검증
   * - 1 이상의 정수만 허용
   */
  if (totalAmount !== undefined) {
    if (!Number.isInteger(totalAmount) || totalAmount <= 0) {
      throw new Error('INVALID_TARGET_VALUE');
    }
  }

  let parsedEndDate: Date | undefined;

  /**
   * 4. 종료일(endDate) 유효성 검증
   * - 날짜 형식 체크
   * - 시작일보다 빠를 수 없음
   */
  if (endDate !== undefined) {
    if (!isValidDateString(endDate)) {
      throw new Error('INVALID_DATE');
    }

    parsedEndDate = parseDateStringToKSTStart(endDate);

    if (goal.startDate > parsedEndDate) {
      throw new Error('INVALID_DATE_RANGE');
    }
  }

  /**
   * 5. 실제로 반영될 값 계산
   * - totalAmount 없으면 기존 targetValue 유지
   * - endDate 없으면 기존 값 유지
   */
  const nextTargetValue = totalAmount ?? goal.targetValue;
  const nextEndDate = parsedEndDate ?? goal.endDate;

  /**
   * 6. quota 재계산
   * - 시작일 ~ 종료일 포함 일수 기준
   * - 하루 목표량 = 총 목표량 / 전체 일수 (올림 처리)
   */
  const diffTime = nextEndDate.getTime() - goal.startDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const nextQuota = Math.ceil(nextTargetValue / diffDays);

  /**
   * 7. DB 업데이트
   */
  await prisma.goal.update({
    where: { id: goalId },
    data: {
      ...(totalAmount !== undefined ? { targetValue: totalAmount } : {}),
      ...(parsedEndDate ? { endDate: parsedEndDate } : {}),
      quota: nextQuota,
    },
  });

  await Promise.all([
    invalidateGoalListCache(userId),
    invalidateGoalDetailCache(userId, goalId),
  ]);

  /**
   * 8. 최신 상태 조회 후 응답 반환
   */
  return buildUpdatedGoalResponse(userId, goalId);
};

/**
 * 개별 목표 삭제 서비스
 *
 * 역할:
 * - 목표 존재 여부 / 권한 확인
 * - 목표 삭제
 * - 삭제 결과 반환
 *
 * 주의:
 * - 연관된 goalLog, timerLog는 FK cascade 설정에 따라 함께 삭제될 수 있음
 */
export const deleteGoalService = async (
  userId: number,
  goalId: number,
): Promise<DeleteGoalResponse> => {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!goal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  await prisma.goal.delete({
    where: {
      id: goalId,
    },
  });

  await Promise.all([
    invalidateGoalListCache(userId),
    invalidateGoalDetailCache(userId, goalId),
  ]);

  return {
    id: goal.id,
    title: goal.title,
  };
};

/**
 * 오늘 목표 리스트 조회 서비스
 *
 * 역할:
 * - 오늘 진행 중인 목표 조회
 * - 오늘 날짜의 goalLog가 없으면 자동 생성
 * - 오늘의 goalLog / TimerLog 조회
 * - 목표별 공부 시간 / 타이머 실행 여부 / 진행률 가공
 */
export const getTodayGoalsService = async (
  userId: number,
): Promise<TodayGoalsResponse> => {
  const today = new Date();
  const startOfToday = toStartOfDay(today);
  const nextStartOfToday = addDays(startOfToday, 1);

  /**
   * 오늘 기준 진행 중인 목표 조회
   * - startDate < 내일 시작
   * - endDate >= 오늘 시작
   */
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: 'active',
      startDate: {
        lt: nextStartOfToday,
      },
      endDate: {
        gte: startOfToday,
      },
    },
    orderBy: {
      endDate: 'asc',
    },
    select: {
      id: true,
      title: true,
      quota: true,
      targetValue: true,
      category: {
        select: {
          unit: true,
        },
      },
    },
  });

  if (goals.length === 0) {
    return {
      totalStudyTime: 0,
      todayGoals: [],
    };
  }

  const goalIds = goals.map((goal) => goal.id);

  /**
   * 오늘 날짜 기준 goalLog가 없으면 자동 생성
   */
  await Promise.all(
    goals.map(async (goal) => {
      const quotaMap = await getQuotaByGoal(userId, goal.id, startOfToday);

      await prisma.goalLog.upsert({
        where: {
          goalId_achievedAt: {
            goalId: goal.id,
            achievedAt: startOfToday,
          },
        },
        update: {},
        create: {
          goalId: goal.id,
          userId,
          achievedAt: startOfToday,
          targetValue: quotaMap.get(goal.id) ?? goal.quota,
          actualValue: 0,
          timeSpent: 0,
        },
      });
    }),
  );

  /**
   * 오늘의 goalLog / TimerLog 조회
   */
  const [goalLogs, timerLogs] = await Promise.all([
    prisma.goalLog.findMany({
      where: {
        userId,
        goalId: {
          in: goalIds,
        },
        achievedAt: {
          gte: startOfToday,
          lt: nextStartOfToday,
        },
      },
      select: {
        id: true,
        goalId: true,
        actualValue: true,
        targetValue: true,
      },
    }),

    prisma.timerLog.findMany({
      where: {
        goalId: {
          in: goalIds,
        },
        timerDate: {
          gte: startOfToday,
          lt: nextStartOfToday,
        },
      },
      orderBy: {
        timerDate: 'asc',
      },
      select: {
        goalId: true,
        durationSec: true,
        endTime: true,
      },
    }),
  ]);

  /**
   * 목표별 오늘 로그 맵
   */
  const goalLogMap = new Map(goalLogs.map((log) => [log.goalId, log]));

  /**
   * 목표별 오늘 공부 시간 / 실행 중 여부 계산
   */
  const studyTimeMap = new Map<number, number>();
  const runningGoalSet = new Set<number>();

  timerLogs.forEach((log) => {
    const prevStudyTime = studyTimeMap.get(log.goalId) ?? 0;
    studyTimeMap.set(log.goalId, prevStudyTime + log.durationSec);

    if (log.endTime === null) {
      runningGoalSet.add(log.goalId);
    }
  });

  /**
   * 오늘 목표 응답 가공
   */
  const todayGoals = goals.map((goal) => {
    const goalLog = goalLogMap.get(goal.id);

    const targetAmount = goalLog?.targetValue ?? goal.quota;
    const currentAmount = goalLog?.actualValue ?? 0;
    const studyTime = studyTimeMap.get(goal.id) ?? 0;

    return {
      id: goal.id,
      goalLogId: goalLog?.id ?? null,
      title: goal.title,
      targetAmount,
      currentAmount,
      unit: goal.category.unit,
      studyTime,
      completed: currentAmount >= targetAmount,
      isTimerRunning: runningGoalSet.has(goal.id),
      progressRate: calculateProgressRate(currentAmount, targetAmount),
    };
  });

  const totalStudyTime = todayGoals.reduce(
    (sum, goal) => sum + goal.studyTime,
    0,
  );

  return {
    totalStudyTime,
    todayGoals,
  };
};

/**
 * 오늘 목표 달성률 조회 서비스
 *
 */
const TODAY_COMPLETE_CACHE_TTL = 10; // 초 (짧게!)

export const getTodayGoalCompletionService = async (userId: number) => {
  const today = new Date();
  const todayKey = formatDate(today);

  const cacheKey = buildCacheKey(
    'lampfire',
    'goals',
    'today',
    'complete',
    userId,
    todayKey,
  );

  const cached = await getCache<{
    totalTime: number;
    totalGoals: number;
    completedGoals: number;
    ratio: number;
  }>(cacheKey);

  if (cached) {
    //console.log('[CACHE HIT] GET /goals/today/complete');
    return cached;
  }

  //console.log('[CACHE MISS] GET /goals/today/complete');

  const startOfDay = toStartOfDay(today);
  const endOfDay = toEndOfDay(today);

  /**
   * 오늘 기준 진행 중인 목표 조회
   *
   * 조건:
   * - 본인 목표
   * - active 상태
   * - 시작일 <= 오늘 끝
   * - 종료일 >= 오늘 시작
   */
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: 'active',
      startDate: {
        lte: endOfDay,
      },
      endDate: {
        gte: startOfDay,
      },
    },
    select: {
      id: true,
    },
  });

  const goalIds = goals.map((goal) => goal.id);

  /**
   * 오늘 진행 중인 목표가 하나도 없으면
   * 기본값 반환
   */
  if (goalIds.length === 0) {
    const emptyResult = {
      totalTime: 0,
      totalGoals: 0,
      completedGoals: 0,
      ratio: 0,
    };

    await setCache(cacheKey, emptyResult, TODAY_COMPLETE_CACHE_TTL);
    return emptyResult;
  }

  /**
   * 오늘 GoalLog / TimerLog 병렬 조회
   *
   * GoalLog:
   * - 오늘 목표 완료 여부 판단용
   *
   * TimerLog:
   * - 오늘 전체 공부 시간 합산용
   */
  const [goalLogs, timerLogs] = await Promise.all([
    prisma.goalLog.findMany({
      where: {
        userId,
        goalId: {
          in: goalIds,
        },
        achievedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        goalId: true,
        targetValue: true,
        actualValue: true,
      },
    }),

    prisma.timerLog.findMany({
      where: {
        goalId: {
          in: goalIds,
        },
        timerDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        durationSec: true,
      },
    }),
  ]);

  /**
   * 오늘 완료된 목표 계산
   *
   * 완료 조건:
   * - actualValue, targetValue 둘 다 null이 아니고
   * - actualValue >= targetValue
   *
   * Set 사용 이유:
   * - 같은 goalId 로그가 여러 번 있어도
   *   완료 목표 수는 1개로만 세기 위함
   */
  const completedGoalIdSet = new Set<number>();

  for (const log of goalLogs) {
    if (
      log.actualValue !== null &&
      log.actualValue !== undefined &&
      log.targetValue !== null &&
      log.targetValue !== undefined &&
      log.actualValue >= log.targetValue
    ) {
      completedGoalIdSet.add(log.goalId);
    }
  }

  /**
   * 오늘 전체 공부 시간 계산
   *
   * 현재 DB에 저장된 durationSec 값을 그대로 합산
   */
  const totalTime = timerLogs.reduce((sum, log) => sum + log.durationSec, 0);

  const totalGoals = goals.length;
  const completedGoals = completedGoalIdSet.size;

  /**
   * 목표 진행도(%)
   *
   * 예:
   * - 3개 중 1개 완료 -> 33
   * - 3개 중 2개 완료 -> 66
   */
  const ratio =
    totalGoals === 0 ? 0 : Math.floor((completedGoals / totalGoals) * 100);

  const result = {
    totalTime,
    totalGoals,
    completedGoals,
    ratio,
  };

  await setCache(cacheKey, result, TODAY_COMPLETE_CACHE_TTL);

  return result;
};
