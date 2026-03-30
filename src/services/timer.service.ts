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
  const timerDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 오늘자 goalLog 데이터가 없을 경우생성, 있으면 그대로 사용
  const goalLog = await prisma.goalLog.upsert({
    where: {
      goalId_achievedAt: {
        goalId,
        achievedAt: timerDate,
      },
    },
    update: {},
    create: {
      achievedAt: timerDate,
      actualValue: 0,
      goalId,
      targetValue: goal.quota,
      timeSpent: 0,
      userId,
    },
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

  return {
    goalId,
    timerRunning: true,
  };
};

// 타이머 측정 종료
export const endTimerService = async (
  userId: number,
  goalId: number,
  currentCompletedAmount: number,
  isPaused: boolean = false,
): Promise<EndTimerResponse> => {
  // goal 존재 여부 확인
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
    throw new AppError('GOAL_NOT_FOUND');
  }

  // 실행 중인 타이머 가져오기
  const runningTimers = await prisma.timerLog.findMany({
    where: {
      userId,
      goalId,
      endTime: null,
    },
    select: {
      id: true,
      timerDate: true,
      startTime: true,
      endTime: true,
    },
  });

  // 실행 중인 타이머가 없을 경우 404
  if (!runningTimers) {
    throw new AppError('RUNNING_TIMER_NOT_FOUND');
  }

  // 실행 중인 타이머가 두 개 이상일 경우 500
  if (runningTimers.length > 1) {
    throw Error('실행 중인 타이머가 두 개 이상입니다.');
  }

  const runningTimer = runningTimers[0];

  const now = new Date();

  // timer_logs 업데이트
  const timeDuration = now.getTime() - runningTimer.startTime.getTime();
  const timerLog = await prisma.timerLog.update({
    where: { id: runningTimer.id },
    data: {
      endTime: now,
      durationSec: timeDuration,
    },
  });

  // goal_logs 업데이트
  // 주의: 유니크 값을 알 수 없어 updateMany 사용, 향수 수정이 필요
  const incrementValue = currentCompletedAmount - goal.currentValue; // 추가로 진행된 분량

  const goalLog = await prisma.goalLog.update({
    where: {
      id: timerLog.goalLogId,
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
  if (!goalDuration) {
    throw Error('todayGoalLog.timeSpent가 존재하지 않습니다.');
  }

  const actualValue = goalLog.actualValue;
  const targetValue = goalLog.targetValue;
  const goalProgressRate = Math.floor((actualValue / targetValue) * 100);

  const endTimer = {
    goalId,
    isTimerRunning: false,
    goalDuration,
    goalProgressRate,
  };

  return endTimer;
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
    throw new AppError('GOAL_NOT_FOUND');
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

  // 실행 중인 타이머가 없을 경우 404
  if (runningTimers.length === 0) {
    throw new AppError('RUNNING_TIMER_NOT_FOUND');
  }

  // 실행 중인 타이머가 두 개 이상일 경우 500
  if (runningTimers.length > 1) {
    throw Error('실행 중인 타이머가 두 개 이상입니다.');
  }

  const runningTimer = runningTimers[0];

  // 해당 날짜의 goalId, userId에 해당하는 목표 측정 기록 가져오기
  const todayGoalLog = await prisma.goalLog.findUnique({
    where: {
      id: runningTimer.goalLogId,
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
