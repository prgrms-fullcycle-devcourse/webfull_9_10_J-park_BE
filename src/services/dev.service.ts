import prisma from '../config/prisma';
import { CountOption, GenRandDataResponse } from '../types/dev.type';
import { createRandomGoalLogs, createRandomGoals } from '../utils/random.util';

export const genRandDataService = async (
  userId: number,
  goalCount: CountOption,
  goalLogCount: CountOption,
  timerLogCount: CountOption,
): Promise<GenRandDataResponse> => {
  const now = new Date();

  // goals 랜덤 생성
  const goalResultCount = await createRandomGoals(userId, goalCount);

  // 생성한 goals
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      createdAt: {
        gte: now,
      },
    },
    select: {
      id: true,
      quota: true,
      startDate: true,
      endDate: true,
    },
  });

  goals.forEach(async (g) => {
    await createRandomGoalLogs({
      userId,
      goalId: g.id,
      quota: g.quota,
      goalLogCount,
      timerLogCount,
      startDate: g.startDate,
      endDate: g.endDate,
    });
  });

  return {
    goalResultCount,
  };
};
