import prisma from '../config/prisma';

export const getUserRankings = async (page: number, limit: number) => {
  const userRanks = await prisma.user.findMany({
    select: {
      id: true,
      nickname: true,
      profileImageUrl: true,
      totalTime: true,
    },
    take: limit,
    skip: (page - 1) * limit,
    orderBy: {
      totalTime: 'desc',
    },
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
  if (!user) throw new Error('User not Found');

  const higherRankCount = await prisma.user.count({
    where: {
      totalTime: {
        gt: user.totalTime,
      },
    },
  });

  return higherRankCount + 1;
};

export const getTopRanks = async () => {
  const topRanks = await prisma.user.findMany({
    select: {
      id: true,
      nickname: true,
      profileImageUrl: true,
      totalTime: true,
    },
    take: 3,
    orderBy: {
      totalTime: 'desc',
    },
  });

  return topRanks;
};
