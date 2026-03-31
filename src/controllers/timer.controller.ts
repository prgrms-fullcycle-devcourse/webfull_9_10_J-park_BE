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

// 타이머 측정 시작
export const startTimerController = async (
  req: Request,
  res: Response<ApiResponse<StartTimerResponse>>,
) => {
  const userId = req.user!.userId;
  const { goalId } = req.body;

  try {
    const timer = await startTimerService(userId, parseInt(goalId));
    return res.status(StatusCodes.OK).json({
      success: true,
      message: '타이머 시작',
      data: timer,
    });
  } catch (err) {
    console.error(`startTimerController error: ${err}`);

    // 커스텀 에러 발생 시
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};

// 타이머 측정 종료
export const endTimerController = async (
  req: Request,
  res: Response<ApiResponse<EndTimerResponse>>,
) => {
  const userId = req.user!.userId;
  const { goalId, currentCompletedAmount, isPaused } = req.body;

  try {
    const timer = await endTimerService(
      userId,
      goalId,
      currentCompletedAmount,
      isPaused,
    );

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: '타이머 종료',
      data: timer,
    });
  } catch (err) {
    console.error(`startTimerController error: ${err}`);

    // 커스텀 에러 발생 시
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};

// 실행 중인 타이머 조회
export const runningTimerController = async (
  req: Request,
  res: Response<ApiResponse<RunningTimerResponse>>,
) => {
  const userId = req.user!.userId;

  if (!userId) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '유효하지 않은 토큰입니다.',
      },
    });
  }

  const goalId = Number(req.query.goalId);

  try {
    const runningTimer = await getRunningTimerService(userId, goalId);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '실행 중인 타이머 정보',
      data: runningTimer,
    });
  } catch (err) {
    // 커스텀 에러 발생 시
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      });
    }

    console.error(`runningTimerController error: ${err}`);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};
