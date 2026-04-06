import { buildCacheKey, delCache } from '../utils/cache.util';

export const invalidateGoalListCache = async (
  userId: number,
): Promise<void> => {
  const goalListKey = buildCacheKey('lampfire', 'goals', 'list', userId);

  await delCache([goalListKey]);
};
