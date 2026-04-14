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
 * - Redis가 비활성화 상태이거나 연결되지 않은 경우 null 반환
 * - 조회 실패 시에도 null 반환하여 서비스 로직이 DB fallback 하도록 함
 * - Redis 응답이 지연되면 timeout 이후 null 반환
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  const startedAt = Date.now();

  try {
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
      console.log('[Cache] GET MISS', {
        key,
        elapsedMs: Date.now() - startedAt,
      });
      return null;
    }

    // eslint-disable-next-line no-console
    console.log('[Cache] GET HIT', {
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
 * - Redis가 비활성화 상태이거나 연결되지 않은 경우 저장하지 않음
 * - 직렬화 실패 시 저장하지 않음
 * - 저장 실패 시에도 서비스 로직에 영향 주지 않음
 */
export const setCache = async (
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> => {
  const startedAt = Date.now();

  try {
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

    const serialized = safeStringify(value);

    if (!serialized) {
      // eslint-disable-next-line no-console
      console.warn('[Cache] SET skipped - stringify failed', {
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
    console.log('[Cache] SET OK', {
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
 * - 전달된 키 배열이 비어 있으면 종료
 * - Redis가 비활성화 상태이거나 연결되지 않은 경우 삭제하지 않음
 * - 삭제 실패 시에도 서비스 로직에 영향 주지 않음
 */
export const delCache = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) return;

  const startedAt = Date.now();

  try {
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
    console.log('[Cache] DEL OK', {
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
 * - Redis scanIterator로 패턴에 맞는 키를 순회
 * - Redis가 비활성화 상태이거나 연결되지 않은 경우 삭제하지 않음
 * - 삭제 실패 시에도 서비스 로직에 영향 주지 않음
 */
export const delCacheByPattern = async (pattern: string): Promise<void> => {
  const startedAt = Date.now();

  try {
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
      console.log('[Cache] DEL PATTERN no keys', {
        pattern,
        elapsedMs: Date.now() - startedAt,
      });
      return;
    }

    const deletedCount = await withTimeout(redisClient.del(keys), 1000);

    // eslint-disable-next-line no-console
    console.log('[Cache] DEL PATTERN OK', {
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
