import { StatusCodes } from 'http-status-codes';

import { AppError } from '../errors/app.error';
import prisma from '../config/prisma';

import {
  StartTimerResponse,
  EndTimerResponse,
  RunningTimerResponse,
} from '../types/timer.type';

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
    throw new AppError(404, 'GOAL_NOT_FOUND', '해당 목표가 존재하지 않습니다.');
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

export const getRunningTimerService = async (
  userId: number,
  goalId: number,
  goalTitle: string,
  todayStudyDuration: number,
  todayProgressRate: number,
  todayCompletedAmount: number,
  todayTargetAmount: number,
  isRunning = true,
  startedAt: string,
): Promise<RunningTimerResponse> => {
  const runningTimer = {
    goalId,
    goalTitle,
    todayStudyDuration,
    todayProgressRate,
    todayCompletedAmount,
    todayTargetAmount,
    timer: {
      isRunning,
      startedAt,
    },
  };

  return runningTimer;
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
