import prisma from '../config/prisma';

const RANKING_SELECT = {
  id: true,
  nickname: true,
  profileImageUrl: true,
  totalTime: true,
};

const RANKING_ORDER = [{ totalTime: 'desc' as const }, { id: 'asc' as const }];

export const getMyRank = async (userId: number) => {
  const user = (await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalTime: true,
    },
  }))!;

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

  const myRankData = { myRanking: higherRankCount + 1 };
  const myRanking = myRankData ?? { myRanking: 0 };

  return myRanking;
};

export const getTopRanks = async () => {
  const topRanks = await prisma.user.findMany({
    select: RANKING_SELECT,
    take: 3,
    orderBy: RANKING_ORDER,
  });

  const topThree = topRanks.map((user, index) => ({
    ...user,
    rank: index + 1,
  }));

  return topThree;
};

export const getUserRankings = async (page: number, limit: number) => {
  const skip = (page - 1) * limit;

  const userRanks = await prisma.user.findMany({
    select: RANKING_SELECT,
    take: limit,
    skip: (page - 1) * limit,
    orderBy: RANKING_ORDER,
  });

  const rankingList = userRanks.map((user, index) => ({
    ...user,
    rank: skip + index + 1,
  }));

  return rankingList;
};
