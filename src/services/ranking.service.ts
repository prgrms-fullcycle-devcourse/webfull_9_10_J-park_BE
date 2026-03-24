import prisma from '../config/prisma';

const RANKING_SELECT = {
  id: true,
  nickname: true,
  profileImageUrl: true,
  totalTime: true,
};

const RANKING_ORDER = [{ totalTime: 'desc' as const }, { id: 'asc' as const }];

export const getUserRankings = async (page: number, limit: number) => {
  const userRanks = await prisma.user.findMany({
    select: RANKING_SELECT,
    take: limit,
    skip: (page - 1) * limit,
    orderBy: RANKING_ORDER,
  });

  return userRanks;
};

export const getMyRank = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalTime: true,
    },
  });
  if (!user) return null;

  const higherRankCount = await prisma.user.count({
    where: {
      OR: [
        {
          totalTime: {
            gt: user.totalTime,
          },
        },
        { totalTime: user.totalTime, id: { lt: userId } },
      ],
    },
  });

  return { myRanking: higherRankCount + 1 };
};

export const getTopRanks = async () => {
  const topRanks = await prisma.user.findMany({
    select: RANKING_SELECT,
    take: 3,
    orderBy: RANKING_ORDER,
  });

  return topRanks;
};
