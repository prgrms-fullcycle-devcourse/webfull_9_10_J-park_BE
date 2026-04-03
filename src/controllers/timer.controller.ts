import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ApiResponse } from '../types/response';
import { AppError } from '../errors/app.error';

import {
  endTimerService,
  getRunningTimerService,
  startTimerService,
} from '../services/timer.service';
import {
  EndTimerResponse,
  RunningTimerResponse,
  StartTimerResponse,
} from '../types/timer.type';

// int 유효성 검사 함수
const validatePositiveInt = (value: unknown): boolean => {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
};

// 타이머 측정 시작
export const startTimerController = async (
  req: Request,
  res: Response<ApiResponse<StartTimerResponse>>,
) => {
  try {
    const userId = req.user!.userId;
    const { goalId } = req.body;

    if (!userId) {
      throw new AppError('UNAUTHORIZED');
    }

    // 유효성 검사
    if (!validatePositiveInt(goalId)) {
      throw new AppError('INVALID_GOAL_ID');
    }

    const timer = await startTimerService(userId, Number(goalId));
    return res.status(StatusCodes.OK).json({
      success: true,
      message: '타이머 시작',
      data: timer,
    });
  } catch (err) {
    console.error(`startTimerController error: ${err}`);

    const appError =
      err instanceof AppError ? err : new AppError('INTERNAL_SERVER_ERROR');

    return res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
      },
    });
  }
};

// 타이머 측정 종료
export const endTimerController = async (
  req: Request,
  res: Response<ApiResponse<EndTimerResponse>>,
) => {
  try {
    const userId = req.user!.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED');
    }

    if (!req.body) {
      throw new AppError('BAD_REQUEST');
    }

    const { currentCompletedAmount, isPaused } = req.body;

    // 유효성 검사
    if (!validatePositiveInt(currentCompletedAmount)) {
      throw new AppError('BAD_REQUEST');
    }
    if (isPaused !== undefined && typeof isPaused !== 'boolean') {
      throw new AppError('BAD_REQUEST');
    }

    const timer = await endTimerService(
      userId,
      currentCompletedAmount,
      isPaused,
    );

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: '타이머 종료',
      data: timer,
    });
  } catch (err) {
    console.error(`endTimerController error: ${err}`);

    const appError =
      err instanceof AppError ? err : new AppError('INTERNAL_SERVER_ERROR');

    return res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
      },
    });
  }
};

// 실행 중인 타이머 조회
export const runningTimerController = async (
  req: Request,
  res: Response<ApiResponse<RunningTimerResponse>>,
) => {
  try {
    const userId = req.user!.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED');
    }

    const runningTimer = await getRunningTimerService(userId);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '실행 중인 타이머 정보',
      data: runningTimer,
    });
  } catch (err) {
    console.error(`runningTimerController error: ${err}`);

    const appError =
      err instanceof AppError ? err : new AppError('INTERNAL_SERVER_ERROR');

    return res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
      },
    });
  }
};
