import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { genRandDataService } from '../services/dev.service';
import { AppError } from '../errors/app.error';

// count 옵션 유효성 검사 함수
const validateCountOption = (value: unknown): boolean => {
  // 없어도 ok
  if (value == undefined) {
    return true;
  }

  // number인 경우
  if (typeof value === 'number') {
    return Number.isInteger(value) && value > 0;
  }

  // 객체인 경우
  if (
    typeof value === 'object' &&
    value !== null &&
    'min' in value &&
    'max' in value
  ) {
    const v = value as { min: unknown; max: unknown };

    return (
      typeof v.min === 'number' &&
      typeof v.max === 'number' &&
      Number.isInteger(v.min) &&
      Number.isInteger(v.max) &&
      v.min > 0 &&
      v.max > 0 &&
      v.min <= v.max
    );
  }

  return false;
};

export const genRandDataController = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    if (!userId) {
      throw new AppError('UNAUTHORIZED');
    }

    if (!req.body) {
      req.body = {};
    }

    const { goalCount, goalLogCount, timerLogCount } = req.body;

    if (!validateCountOption(goalCount)) {
      throw new AppError('BAD_REQUEST');
    }
    if (!validateCountOption(goalLogCount)) {
      throw new AppError('BAD_REQUEST');
    }
    if (!validateCountOption(timerLogCount)) {
      throw new AppError('BAD_REQUEST');
    }

    const genRandDataResult = await genRandDataService(
      userId,
      goalCount,
      goalLogCount,
      timerLogCount,
    );

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: '데이터 생성 결과',
      data: genRandDataResult,
    });
  } catch (err) {
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
