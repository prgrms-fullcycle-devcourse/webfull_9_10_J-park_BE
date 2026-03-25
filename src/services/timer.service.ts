// import prisma from '../config/prisma';
import {
  StartTimerResponse,
  EndTimerResponse,
  RunningTimerResponse,
} from '../types/timer.type';

export const startTimerService = async (
  userId: number,
  goalId: number,
): Promise<StartTimerResponse> => {
  const timer = {
    goalId: 1,
    timerRunning: true,
  };
  return timer;
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
