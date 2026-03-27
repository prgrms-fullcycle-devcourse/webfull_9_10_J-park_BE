import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getRiskByUserId } from '../services/risk.service';
import { ApiResponse } from '../types/response';
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
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};
