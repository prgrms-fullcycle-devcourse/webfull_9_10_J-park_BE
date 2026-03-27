import prisma from '../config/prisma';
import { calculateDaysRemaining } from '../utils/goal.util';
import { calculateRisk, calculateStats } from '../utils/simulation.util';

const getAllGoalWithLogs = async (userId: number) => {
  return await prisma.goal.findMany({
    where: {
      userId,
      status: 'active',
    },
    include: {
      goalLogs: {
        orderBy: {
          achievedAt: 'desc',
        },
      },
    },
  });
};

export const getRiskByUserId = async (userId: number) => {
  let riskScore = 0;
  let riskLevel = 0;
  const goals = await getAllGoalWithLogs(userId);

  if (goals && goals.length > 0) {
    const riskScores = goals.map((goal) => {
      const { mean, stdDev } = calculateStats(goal.goalLogs, goal.quota);

      const remainingValue = Math.max(0, goal.targetValue - goal.currentValue);
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

  return { riskScore, riskLevel };
};
