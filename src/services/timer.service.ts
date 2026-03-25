import { StatusCodes } from 'http-status-codes';

import { AppError } from '../errors/app.error';
import prisma from '../config/prisma';

import {
  StartTimerResponse,
  EndTimerResponse,
  RunningTimerResponse,
} from '../types/timer.type';

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
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'GOAL_NOT_FOUND',
      '해당 목표가 존재하지 않습니다.',
    );
  }

  // 이미 실행 중인 타이머가 있으면 409 error
  const runningTimer = await prisma.timerLog.findFirst({
    where: {
      userId,
      endTime: null,
    },
  });
  if (runningTimer) {
    throw new AppError(
      StatusCodes.CONFLICT,
      'TIMER_ALREADY_RUNNING',
      '이미 실행 중인 타이머가 있습니다.',
    );
  }

  // 현재 시간 (timerDate는 시작시간 기준으로)
  const now = new Date();
  const timerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 데이터 추가
  await prisma.timerLog.create({
    data: {
      timerDate,
      startTime: now,
      userId,
      goalId,
    },
  });

  return {
    goalId,
    timerRunning: true,
  };
};

export const endTimerService = async (
  userId: number,
  goalId: number,
  currentCompletedAmount: number,
  isPaused = false,
): Promise<EndTimerResponse> => {
  const endTimer = {
    goalId: 1,
    isTimerRunning: false,
    goalDuration: 946834,
    goalProgressRate: 85,
  };

  return endTimer;
  // const user = await prisma.user.findUnique({
  //   where: { id: userId },
  //   select: {
  //     id: true,
  //     nickname: true,
  //     profileImageUrl: true,
  //     totalTime: true,
  //     createdAt: true,
  //   },
  // });
  // if (!user) {
  //   throw new Error('USER_NOT_FOUND');
  // }
  // return user;
};

// 실행 중인 타이머 조회
export const getRunningTimerService = async (
  userId: number,
  goalId: number,
): Promise<RunningTimerResponse> => {
  // goal 존재 여부 확인
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
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'GOAL_NOT_FOUND',
      '해당 목표가 존재하지 않습니다.',
    );
  }

  // 실행 중인 타이머 가져오기
  const runningTimers = await prisma.timerLog.findMany({
    where: {
      userId,
      goalId,
      endTime: null,
    },
    include: {
      goal: true,
    },
  });
  // console.log('runningTimers...', runningTimers);

  // 실행 중인 타이머가 없을 경우 404
  if (!runningTimers) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'RUNNING_TIMER_NOT_FOUND',
      '실행 중인 타이머가 없습니다.',
    );
  }

  // 실행 중인 타이머가 두 개 이상일 경우 500
  if (runningTimers.length > 1) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'INVALID_TIMER_STATE',
      '실행 중인 타이머 상태가 올바르지 않습니다.',
    );
  }

  const runningTimer = runningTimers[0];
  // console.log('runningTimer...', runningTimer);

  // 해당 날짜의 goalId, userId에 해당하는 목표 측정 기록 가져오기
  const todayGoalLog = await prisma.goalLog.findFirst({
    where: {
      goalId,
      userId,
      achievedAt: runningTimer.timerDate ?? undefined, // 향후 goalLog와 timerLog를 연결할 생각은 없는지?
    },
    select: {
      actualValue: true,
      targetValue: true,
      timeSpent: true,
    },
  });

  if (!todayGoalLog) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      'INVALID_GOAL_LOG',
      '목표 기록 정보를 불러오는 과정에서 오류가 발생했습니다.',
    );
  }

  // 오늘 목표 분량, 실제 진행한 분량 할당
  const todayCompletedAmount = todayGoalLog.actualValue ?? 0;
  let todayTargetAmount = todayGoalLog.targetValue ?? 1;
  todayTargetAmount = todayTargetAmount > 0 ? todayTargetAmount : 1;

  // 진행률 계산
  const todayProgressRate = Math.floor(
    (todayCompletedAmount / todayTargetAmount) * 100,
  );

  return {
    goalId,
    goalTitle: goal.title,
    todayStudyDuration: todayGoalLog.timeSpent ?? 0,
    todayProgressRate,
    todayCompletedAmount,
    todayTargetAmount,
    timer: {
      isRunning: true,
      startedAt: runningTimer.startTime,
    },
  };
};
