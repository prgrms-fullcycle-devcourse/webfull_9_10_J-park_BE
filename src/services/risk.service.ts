import prisma from '../config/prisma';

export const getAllGoalWithLogs = async (userId: number) => {
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
