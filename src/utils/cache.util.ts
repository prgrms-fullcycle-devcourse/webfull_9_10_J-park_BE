import redisClient from '../config/redis';

/**
 * Redis 작업 timeout 유틸
 * - 일정 시간 내 응답이 없으면 실패로 간주
 * - Redis 장애/지연 시 API가 오래 대기하지 않고 DB fallback 하도록 돕는다
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Redis timeout'));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

/**
 * 인메모리 캐시 엔트리
 * - value: Redis와 동일하게 JSON 문자열 형태로 저장
 * - expiresAt: 만료 시각(ms)
 */
type MemoryCacheEntry = {
  value: string;
  expiresAt: number;
};

/**
 * 1차 캐시: 인메모리
 */
const memoryCache = new Map<string, MemoryCacheEntry>();

/**
 * 인메모리 TTL 배율
 * - Redis TTL보다 짧게 유지하여 stale 위험을 줄임
 * - 예: Redis 60초 -> memory 6초
 */
const MEMORY_TTL_RATIO = 0.1;

/**
 * 인메모리 최소/최대 TTL (초)
 * - 너무 짧으면 의미 없고, 너무 길면 stale 위험 증가
 */
const MIN_MEMORY_TTL_SECONDS = 1;
const MAX_MEMORY_TTL_SECONDS = 10;

/**
 * Redis TTL을 기반으로 인메모리 TTL 계산
 */
const getMemoryTtlSeconds = (redisTtlSeconds: number): number => {
  const calculated = Math.floor(redisTtlSeconds * MEMORY_TTL_RATIO);

  return Math.min(
    MAX_MEMORY_TTL_SECONDS,
    Math.max(MIN_MEMORY_TTL_SECONDS, calculated),
  );
};

/**
 * 만료된 인메모리 키 정리
 */
const cleanupExpiredMemoryCache = (): void => {
  const now = Date.now();

  for (const [key, entry] of memoryCache.entries()) {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
    }
  }
};

/**
 * 인메모리 캐시 저장
 */
const setMemoryCache = (
  key: string,
  serializedValue: string,
  ttlSeconds: number,
): void => {
  const memoryTtlSeconds = getMemoryTtlSeconds(ttlSeconds);

  memoryCache.set(key, {
    value: serializedValue,
    expiresAt: Date.now() + memoryTtlSeconds * 1000,
  });
};

/**
 * 인메모리 캐시 조회
 * - 만료되었으면 즉시 삭제 후 null 반환
 */
const getMemoryCache = (key: string): string | null => {
  const entry = memoryCache.get(key);

  if (!entry) return null;

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
};

/**
 * 인메모리 캐시 삭제
 */
const delMemoryCache = (keys: string[]): void => {
  for (const key of keys) {
    memoryCache.delete(key);
  }
};

/**
 * pattern 매칭 인메모리 캐시 삭제
 * - 현재 프로젝트에서는 * 만 사용하는 형태라 간단한 정규식 변환으로 처리
 */
const delMemoryCacheByPattern = (pattern: string): number => {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`^${escaped.replace(/\*/g, '.*')}$`);

  let deletedCount = 0;

  for (const key of memoryCache.keys()) {
    if (regex.test(key)) {
      memoryCache.delete(key);
      deletedCount += 1;
    }
  }

  return deletedCount;
};

/**
 * 주기적으로 만료 엔트리 정리
 */
setInterval(() => {
  cleanupExpiredMemoryCache();
}, 60 * 1000).unref();

/**
 * 캐시 키 생성
 * - null / undefined / 빈 문자열은 'empty'로 치환
 * - 예: buildCacheKey('lampfire', 'goals', 'list', 1)
 *   -> 'lampfire:goals:list:1'
 */
export const buildCacheKey = (
  ...parts: (string | number | null | undefined)[]
): string => {
  return parts
    .map((part) =>
      part === null || part === undefined || part === ''
        ? 'empty'
        : String(part),
    )
    .join(':');
};

/**
 * 값을 JSON 문자열로 안전하게 변환
 * - 직렬화 실패 시 null 반환
 */
export const safeStringify = (value: unknown): string | null => {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('[Cache] stringify failed:', error);
    return null;
  }
};

/**
 * JSON 문자열을 안전하게 파싱
 * - 값이 없거나 파싱 실패 시 null 반환
 */
export const safeParse = <T>(value: string | null): T | null => {
  if (!value) return null;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('[Cache] parse failed:', error);
    return null;
  }
};

/**
 * 캐시 조회
 * 우선순위:
 * 1. 인메모리
 * 2. Redis
 * 3. 없으면 null
 *
 * - Redis가 비활성화/미연결이어도 인메모리 hit면 바로 반환
 * - Redis hit면 인메모리에 다시 저장
 * - 조회 실패 시 null 반환하여 서비스 로직이 DB fallback 하도록 함
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  const startedAt = Date.now();

  try {
    // 1. 인메모리 조회
    const memoryCached = getMemoryCache(key);

    if (memoryCached) {
      // eslint-disable-next-line no-console
      console.log('[Cache] MEMORY HIT', {
        key,
        elapsedMs: Date.now() - startedAt,
      });

      return safeParse<T>(memoryCached);
    }
    // eslint-disable-next-line no-console
    console.log('[Cache] MEMORY MISS', {
      key,
      elapsedMs: Date.now() - startedAt,
    });

    // 2. Redis 조회
    if (!redisClient) {
      // eslint-disable-next-line no-console
      console.warn('[Cache] GET skipped - redis disabled', { key });
      return null;
    }

    if (!redisClient.isOpen) {
      // eslint-disable-next-line no-console
      console.warn('[Cache] GET skipped - redis not connected', { key });
      return null;
    }

    const cached = await withTimeout(redisClient.get(key), 1000);

    if (!cached) {
      // eslint-disable-next-line no-console
      console.log('[Cache] REDIS MISS', {
        key,
        elapsedMs: Date.now() - startedAt,
      });
      return null;
    }

    // Redis hit면 인메모리에도 저장
    setMemoryCache(key, cached, MAX_MEMORY_TTL_SECONDS);
    // eslint-disable-next-line no-console
    console.log('[Cache] REDIS HIT', {
      key,
      elapsedMs: Date.now() - startedAt,
    });

    return safeParse<T>(cached);
  } catch (error) {
    const isTimeout =
      error instanceof Error && error.message === 'Redis timeout';

    console.error('[Cache] GET failed', {
      key,
      elapsedMs: Date.now() - startedAt,
      error: isTimeout ? 'Redis timeout' : error,
    });

    return null;
  }
};

/**
 * 캐시 저장
 * - 인메모리와 Redis에 모두 저장
 * - Redis 저장 실패해도 인메모리는 남음
 * - 직렬화 실패 시 저장하지 않음
 */
export const setCache = async (
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> => {
  const startedAt = Date.now();

  try {
    const serialized = safeStringify(value);

    if (!serialized) {
      // eslint-disable-next-line no-console
      console.warn('[Cache] SET skipped - stringify failed', {
        key,
        ttlSeconds,
      });
      return;
    }

    // 1. 인메모리 저장
    setMemoryCache(key, serialized, ttlSeconds);
    // eslint-disable-next-line no-console
    console.log('[Cache] MEMORY SET OK', {
      key,
      ttlSeconds: getMemoryTtlSeconds(ttlSeconds),
      elapsedMs: Date.now() - startedAt,
    });

    // 2. Redis 저장
    if (!redisClient) {
      // eslint-disable-next-line no-console
      console.warn('[Cache] SET skipped - redis disabled', {
        key,
        ttlSeconds,
      });
      return;
    }

    if (!redisClient.isOpen) {
      // eslint-disable-next-line no-console
      console.warn('[Cache] SET skipped - redis not connected', {
        key,
        ttlSeconds,
      });
      return;
    }

    await withTimeout(
      redisClient.set(key, serialized, { EX: ttlSeconds }),
      1000,
    );
    // eslint-disable-next-line no-console
    console.log('[Cache] REDIS SET OK', {
      key,
      ttlSeconds,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error && error.message === 'Redis timeout';

    console.error('[Cache] SET failed', {
      key,
      ttlSeconds,
      elapsedMs: Date.now() - startedAt,
      error: isTimeout ? 'Redis timeout' : error,
    });
  }
};

/**
 * 캐시 삭제
 * - 인메모리 먼저 삭제
 * - Redis도 가능하면 삭제
 * - Redis 실패해도 서비스 로직에 영향 주지 않음
 */
export const delCache = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) return;

  const startedAt = Date.now();

  try {
    // 1. 인메모리 삭제
    delMemoryCache(keys);
    // eslint-disable-next-line no-console
    console.log('[Cache] MEMORY DEL OK', {
      keys,
      elapsedMs: Date.now() - startedAt,
    });

    // 2. Redis 삭제
    if (!redisClient) {
      // eslint-disable-next-line no-console
      console.warn('[Cache] DEL skipped - redis disabled', { keys });
      return;
    }

    if (!redisClient.isOpen) {
      // eslint-disable-next-line no-console
      console.warn('[Cache] DEL skipped - redis not connected', { keys });
      return;
    }

    const deletedCount = await withTimeout(redisClient.del(keys), 1000);
    // eslint-disable-next-line no-console
    console.log('[Cache] REDIS DEL OK', {
      keys,
      deletedCount,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error && error.message === 'Redis timeout';

    console.error('[Cache] DEL failed', {
      keys,
      elapsedMs: Date.now() - startedAt,
      error: isTimeout ? 'Redis timeout' : error,
    });
  }
};

/**
 * pattern에 매칭되는 모든 캐시 키 삭제
 * 예: lampfire:goals:detail:1:3:*
 *
 * - 인메모리/Redis 둘 다 삭제
 * - Redis scanIterator로 패턴에 맞는 키를 순회
 * - Redis가 비활성화 상태이거나 연결되지 않은 경우 Redis 삭제만 생략
 */
export const delCacheByPattern = async (pattern: string): Promise<void> => {
  const startedAt = Date.now();

  try {
    // 1. 인메모리 패턴 삭제
    const memoryDeletedCount = delMemoryCacheByPattern(pattern);
    // eslint-disable-next-line no-console
    console.log('[Cache] MEMORY DEL PATTERN OK', {
      pattern,
      memoryDeletedCount,
      elapsedMs: Date.now() - startedAt,
    });

    // 2. Redis 패턴 삭제
    if (!redisClient) {
      // eslint-disable-next-line no-console
      console.warn('[Cache] DEL PATTERN skipped - redis disabled', { pattern });
      return;
    }

    if (!redisClient.isOpen) {
      // eslint-disable-next-line no-console
      console.warn('[Cache] DEL PATTERN skipped - redis not connected', {
        pattern,
      });
      return;
    }

    const keys: string[] = [];

    for await (const key of redisClient.scanIterator({
      MATCH: pattern,
      COUNT: 100,
    })) {
      keys.push(String(key));
    }

    if (keys.length === 0) {
      // eslint-disable-next-line no-console
      console.log('[Cache] REDIS DEL PATTERN no keys', {
        pattern,
        elapsedMs: Date.now() - startedAt,
      });
      return;
    }

    const deletedCount = await withTimeout(redisClient.del(keys), 1000);
    // eslint-disable-next-line no-console
    console.log('[Cache] REDIS DEL PATTERN OK', {
      pattern,
      keys,
      deletedCount,
      elapsedMs: Date.now() - startedAt,
    });
  } catch (error) {
    const isTimeout =
      error instanceof Error && error.message === 'Redis timeout';

    console.error('[Cache] DEL PATTERN failed', {
      pattern,
      elapsedMs: Date.now() - startedAt,
      error: isTimeout ? 'Redis timeout' : error,
    });
  }
};

/**
 * 목표 목록 캐시 무효화
 * - key: lampfire:goals:list:{userId}
 */
export const invalidateGoalListCache = async (
  userId: number,
): Promise<void> => {
  const key = buildCacheKey('lampfire', 'goals', 'list', userId);
  // eslint-disable-next-line no-console
  console.log('[Cache] invalidate goal list', {
    userId,
    key,
  });

  await delCache([key]);
};

/**
 * 목표 상세 조회 캐시 무효화
 * - key pattern: lampfire:goals:detail:{userId}:{goalId}:{startDate}:{endDate}
 * - 날짜 조건이 달라질 수 있으므로 pattern 기반 삭제 사용
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
  // eslint-disable-next-line no-console
  console.log('[Cache] invalidate goal detail', {
    userId,
    goalId,
    pattern,
  });

  await delCacheByPattern(pattern);
};
