import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { AppError } from '../errors/app.error';
import { ApiResponse } from '../types/response';

import { getRiskByUserId } from '../services/risk.service';
import { RiskInfo } from '../types/risk.type';

export const getMyRisk = async (
  req: Request,
  res: Response<ApiResponse<RiskInfo>>,
) => {
  const { userId } = req.user!;

  try {
    const { riskScore, riskLevel } = await getRiskByUserId(userId);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '현재 위험도',
      data: {
        score: riskScore,
        level: riskLevel,
      },
    });
  } catch (err) {
    console.error(`Get My Risk Error: ${err}`);

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
