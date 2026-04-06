import redisClient from '../config/redis';

export const buildCacheKey = (...parts: Array<string | number>) => {
  return parts.join(':');
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
