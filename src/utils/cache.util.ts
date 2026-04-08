import redisClient from '../config/redis';

export const buildCacheKey = (
  ...parts: (string | number | null | undefined)[]
) => {
  return parts
    .map((part) =>
      part === null || part === undefined || part === ''
        ? 'empty'
        : String(part),
    )
    .join(':');
};

export const safeStringify = (value: unknown): string | null => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('[Cache] stringify failed:', error);
    return null;
  }
};

export const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('[Cache] parse failed:', error);
    return null;
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const cached = await redisClient.get(key);
    return safeParse<T>(cached);
  } catch (error) {
    console.error(`[Cache] GET failed: ${key}`, error);
    return null;
  }
};

export const setCache = async (
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> => {
  try {
    const serialized = safeStringify(value);
    if (!serialized) return;

    await redisClient.set(key, serialized, {
      EX: ttlSeconds,
    });
  } catch (error) {
    console.error(`[Cache] SET failed: ${key}`, error);
  }
};

export const delCache = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) return;

  try {
    await redisClient.del(keys);
  } catch (error) {
    console.error(`[Cache] DEL failed: ${keys.join(', ')}`, error);
  }
};

/**
 * pattern에 매칭되는 모든 캐시 키 삭제
 * 예: lampfire:goals:detail:1:3:*
 */
export const delCacheByPattern = async (pattern: string): Promise<void> => {
  try {
    const keys: string[] = [];

    for await (const key of redisClient.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      keys.push(String(key));
    }

    if (keys.length === 0) return;

    await redisClient.del(keys);
  } catch (error) {
    console.error(`[Cache] DEL PATTERN failed: ${pattern}`, error);
  }
};

export const invalidateGoalListCache = async (
  userId: number,
): Promise<void> => {
  const key = buildCacheKey('lampfire', 'goals', 'list', userId);
  await delCache([key]);
};

/**
 * 목표 상세 조회 캐시 무효화
 * lampfire:goals:detail:{userId}:{goalId}:{startDate}:{endDate}
 */
export const invalidateGoalDetailCache = async (
  userId: number,
  goalId: number,
): Promise<void> => {
  const pattern = buildCacheKey(
    'lampfire',
    'goals',
    'detail',
    userId,
    goalId,
    '*',
  );
  await delCacheByPattern(pattern);
};
