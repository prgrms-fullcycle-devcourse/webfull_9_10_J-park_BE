import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getAllGoalWithLogs } from '../services/risk.service';
import { ApiResponse } from '../types/response';
import { RiskInfo } from '../types/risk.type';
import { calculateDaysRemaining } from '../utils/goal.util';
import { calculateRisk, calculateStats } from '../utils/simulation.util';

export const getMyRisk = async (
  req: Request,
  res: Response<ApiResponse<RiskInfo>>,
) => {
  const { userId } = req.user!;

  try {
    let riskScore = 0;
    let riskLevel = 0;
    const goals = await getAllGoalWithLogs(userId);

    if (goals && goals.length > 0) {
      const riskScores = goals.map((goal) => {
        const { mean, stdDev } = calculateStats(goal.goalLogs, goal.quota);

        const remainingValue = Math.max(
          0,
          goal.targetValue - goal.currentValue,
        );
        const remainingDays = calculateDaysRemaining(goal.endDate);

        return calculateRisk(mean, stdDev, remainingValue, remainingDays);
      });

      riskScore = Math.round(
        riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length,
      );

      if (riskScore >= 70) {
        riskLevel = 2; // 위험
      } else if (riskScore >= 30) {
        riskLevel = 1; // 주의
      } else {
        riskLevel = 0; // 안전
      }
    }

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
