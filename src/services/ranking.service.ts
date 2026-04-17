import prisma from '../config/prisma';

import { buildCacheKey, getCache, setCache } from '../utils/cache.util';

const RANKING_SELECT = {
  id: true,
  nickname: true,
  profileImageUrl: true,
  totalTime: true,
};

const RANKING_ORDER = [{ totalTime: 'desc' as const }, { id: 'asc' as const }];

const RANKING_CACHE_TTL = 10;

type MyRankResponse = {
  myRanking: number;
};

type RankingUser = {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  totalTime: number;
  rank: number;
};

export const getMyRank = async (userId: number): Promise<MyRankResponse> => {
  const cacheKey = buildCacheKey('lampfire', 'ranking', 'me', userId);

  const cached = await getCache<MyRankResponse>(cacheKey);
  if (cached) {
    //console.log('[CACHE HIT]', cacheKey);
    return cached;
  }
  //console.log('[CACHE MISS]', cacheKey);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      totalTime: true,
    },
  });

  if (!user) {
    return { myRanking: 0 };
  }

  const higherRankCount = await prisma.user.count({
    where: {
      OR: [
        {
          totalTime: {
            gt: user.totalTime,
          },
        },
        {
          totalTime: user.totalTime,
          id: { lt: userId },
        },
      ],
    },
  });

  const result = { myRanking: higherRankCount + 1 };

  await setCache(cacheKey, result, RANKING_CACHE_TTL);

  return result;
};

export const getTopRanks = async (): Promise<RankingUser[]> => {
  const cacheKey = buildCacheKey('lampfire', 'ranking', 'top3');

  const cached = await getCache<RankingUser[]>(cacheKey);
  if (cached) {
    //console.log('[CACHE HIT]', cacheKey);
    return cached;
  }
  //console.log('[CACHE MISS]', cacheKey);

  const topRanks = await prisma.user.findMany({
    select: RANKING_SELECT,
    take: 3,
    orderBy: RANKING_ORDER,
  });

  const topThree = topRanks.map((user, index) => ({
    ...user,
    rank: index + 1,
  }));

  await setCache(cacheKey, topThree, RANKING_CACHE_TTL);

  return topThree;
};

export const getUserRankings = async (
  page: number,
  limit: number,
): Promise<RankingUser[]> => {
  const skip = (page - 1) * limit;
  const cacheKey = buildCacheKey('lampfire', 'ranking', 'list', page, limit);

  const cached = await getCache<RankingUser[]>(cacheKey);
  if (cached) {
    //console.log('[CACHE HIT]', cacheKey);
    return cached;
  }
  //console.log('[CACHE MISS]', cacheKey);

  const userRanks = await prisma.user.findMany({
    select: RANKING_SELECT,
    take: limit,
    skip,
    orderBy: RANKING_ORDER,
  });

  const rankingList = userRanks.map((user, index) => ({
    ...user,
    rank: skip + index + 1,
  }));

  await setCache(cacheKey, rankingList, RANKING_CACHE_TTL);

  return rankingList;
};
