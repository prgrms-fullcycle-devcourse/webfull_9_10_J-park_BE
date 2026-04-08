import { AppError } from '../errors/app.error';
import prisma from '../config/prisma';

import {
  StartTimerResponse,
  EndTimerResponse,
  RunningTimerResponse,
} from '../types/timer.type';
import { getQuotaByGoal } from '../utils/quota.util';

// 이정현 작업 1  [cache] timer 관련 캐시 유틸 import 추가
import {
  getCache,
  setCache,
  buildCacheKey,
  delCache,
  invalidateGoalDetailCache,
} from '../utils/cache.util';

import { formatDate, toStartOfDay } from '../utils/goal.util';

const RUNNING_TIMER_CACHE_TTL = 3;

// 타이머 측정 시작
export const startTimerService = async (
  userId: number,
  goalId: number,
): Promise<StartTimerResponse> => {
  // 해당 목표가 존재하지 않을 경우 404 error
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
  });
  if (!goal) {
    throw new AppError('GOAL_NOT_FOUND');
  }

  // 이미 실행 중인 타이머가 있으면 409 error
  const runningTimer = await prisma.timerLog.findFirst({
    where: {
      userId,
      endTime: null,
    },
  });

  if (runningTimer) {
    throw new AppError('TIMER_ALREADY_RUNNING');
  }

  // 현재 시간 (timerDate는 시작시간 기준으로)
  const now = new Date();
  const timerDate = toStartOfDay(now);
  //const timerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()); 이정현 작업 2 [cache] timerDate 기준일 계산 보정

  // 오늘자 goalLog 데이터가 없을 경우생성, 있으면 그대로 사용
  const goalLog = await prisma.$transaction(async (tx) => {
    const existing = await tx.goalLog.findUnique({
      where: {
        goalId_achievedAt: {
          goalId,
          achievedAt: timerDate,
        },
      },
    });

    if (existing) return existing;
    const quotaMap = await getQuotaByGoal(userId, goalId, timerDate);

    return tx.goalLog.create({
      data: {
        achievedAt: timerDate,
        actualValue: 0,
        goalId,
        targetValue: quotaMap.get(goalId) ?? goal.quota,
        timeSpent: 0,
        userId,
      },
    });
  });

  // timerLog 데이터 추가
  await prisma.timerLog.create({
    data: {
      timerDate,
      startTime: now,
      userId,
      goalId,
      goalLogId: goalLog.id,
    },
  });

  // 이정현 작업 3 [cache] 타이머 시작 시 running / today 캐시 무효화
  await delCache([
    buildCacheKey('lampfire', 'timers', 'running', userId),
    buildCacheKey('lampfire', 'goals', 'today', userId),
  ]);

  return {
    goalId,
    timerRunning: true,
  };
};

/**
 * 이정현 작업 4
 *
 * 타이머 측정 종료
 *
 * 1. runningTimer 조회
 * 2. 종료 시간 / duration 계산
 * 3. timerLog 업데이트
 * 4. goalLog 업데이트
 * 5. goal 업데이트
 * 6. 응답용 데이터 정리
 * 7. 관련 캐시 무효화 // 이정현 추가
 * 8. return
 */
// 타이머 측정 종료
export const endTimerService = async (
  userId: number,
  currentCompletedAmount: number,
  isPaused: boolean = false,
): Promise<EndTimerResponse> => {
  // 실행 중인 타이머 가져오기
  const runningTimers = await prisma.timerLog.findMany({
    where: {
      userId,
      endTime: null,
    },
    select: {
      id: true,
      timerDate: true,
      startTime: true,
      endTime: true,
      goalId: true,
      goalLogId: true,
    },
  });

  // 실행 중인 타이머가 없을 경우 404
  if (runningTimers.length === 0) {
    throw new AppError('RUNNING_TIMER_NOT_FOUND');
  }

  // 실행 중인 타이머가 두 개 이상일 경우 500
  if (runningTimers.length > 1) {
    throw Error('실행 중인 타이머가 두 개 이상입니다.');
  }

  const runningTimer = runningTimers[0];
  const { goalId, goalLogId } = runningTimer;

  // 해당 타이머의 목표 정보 가져오기
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select: {
      title: true,
      currentValue: true,
    },
  });
  if (!goal) {
    throw new Error('가져온 목표가 없습니다.');
  }

  const now = new Date();

  // timer_logs 업데이트
  const timeDuration = now.getTime() - runningTimer.startTime.getTime();
  await prisma.timerLog.update({
    where: { id: runningTimer.id },
    data: {
      endTime: now,
      durationSec: timeDuration,
    },
  });

  // goal_logs 업데이트
  const incrementValue = currentCompletedAmount - goal.currentValue; // 추가로 진행된 분량

  const goalLog = await prisma.goalLog.update({
    where: {
      id: goalLogId,
    },
    data: {
      timeSpent: { increment: timeDuration },
      actualValue: { increment: incrementValue },
    },
  });

  // goal update
  await prisma.goal.update({
    where: { id: goalId },
    data: {
      currentValue: currentCompletedAmount,
      status: isPaused ? 'inactive' : 'active',
    },
  });

  // 오늘 누적 공부 시간
  const goalDuration = goalLog.timeSpent;
  // 이정현 작업 5 [cache] null 체크 보완
  // if (!goalDuration) {
  if (goalDuration === null || goalDuration === undefined) {
    throw Error('todayGoalLog.timeSpent가 존재하지 않습니다.');
  }

  const actualValue = goalLog.actualValue;
  const targetValue = goalLog.targetValue;
  const goalProgressRate = Math.floor((actualValue / targetValue) * 100);

  const endTimer = {
    goalId,
    goalLogId,
    isTimerRunning: false,
    goalDuration,
    goalProgressRate,
  };

  // 이정현 작업 6 [cache] 타이머 종료 시 detail / today / complete / running 캐시 무효화

  // 목표 상세 캐시 무효화
  await invalidateGoalDetailCache(userId, goalId);

  // 오늘 날짜 기준 캐시 키
  const todayKey = formatDate(toStartOfDay(now));

  // 오늘 목표 / 오늘 목표 달성률 / 실행 중 타이머 캐시 무효화
  await delCache([
    buildCacheKey('lampfire', 'goals', 'today', userId),
    buildCacheKey('lampfire', 'goals', 'today', 'complete', userId, todayKey),
    buildCacheKey('lampfire', 'timers', 'running', userId),
  ]);

  return endTimer;
};

// 실행 중인 타이머 조회
export const getRunningTimerService = async (
  userId: number,
): Promise<RunningTimerResponse> => {
  const cacheKey = buildCacheKey('lampfire', 'timers', 'running', userId);

  // 캐시 조회
  const cached = await getCache<RunningTimerResponse>(cacheKey);
  if (cached) {
    console.log('[CACHE HIT]', cacheKey);
    return cached;
  }
  console.log('[CACHE MISS]', cacheKey);

  // 실행 중인 타이머 가져오기
  const runningTimers = await prisma.timerLog.findMany({
    where: {
      userId,
      endTime: null,
    },
    include: {
      goal: true,
    },
  });

  // 실행 중인 타이머가 없을 경우 404
  if (runningTimers.length === 0) {
    throw new AppError('RUNNING_TIMER_NOT_FOUND');
  }

  // 실행 중인 타이머가 두 개 이상일 경우 500
  if (runningTimers.length > 1) {
    throw Error('실행 중인 타이머가 두 개 이상입니다.');
  }

  const runningTimer = runningTimers[0];
  const { goalId, goalLogId } = runningTimer;

  // 해당 타이머의 목표 정보 가져오기
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select: {
      title: true,
    },
  });
  if (!goal) {
    throw Error('가져온 목표가 없습니다.');
  }

  // 해당 날짜의 goalId, userId에 해당하는 목표 측정 기록 가져오기
  const todayGoalLog = await prisma.goalLog.findUnique({
    where: {
      id: goalLogId,
    },
    select: {
      actualValue: true,
      targetValue: true,
      timeSpent: true,
    },
  });

  if (!todayGoalLog) {
    throw new AppError('GOAL_NOT_FOUND');
  }

  // 오늘 목표 분량, 실제 진행한 분량 할당
  const todayCompletedAmount = todayGoalLog.actualValue ?? 0;
  let todayTargetAmount = todayGoalLog.targetValue ?? 1;
  todayTargetAmount = todayTargetAmount > 0 ? todayTargetAmount : 1;

  // 진행률 계산
  const todayProgressRate = Math.floor(
    (todayCompletedAmount / todayTargetAmount) * 100,
  );

  // 이정현 작업 6 [cache] running timer 조회 캐시 적용
  const response = {
    goalId,
    goalTitle: goal.title,
    goalLogId,
    todayStudyDuration: todayGoalLog.timeSpent ?? 0,
    todayProgressRate,
    todayCompletedAmount,
    todayTargetAmount,
    timer: {
      isRunning: true,
      startedAt: runningTimer.startTime,
    },
  };

  await setCache(cacheKey, response, RUNNING_TIMER_CACHE_TTL);

  return response;
};
