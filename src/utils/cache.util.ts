import redisClient from '../config/redis';

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
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    if (!redisClient?.isOpen) return null;

    const cached = await redisClient.get(key);
    return safeParse<T>(cached);
  } catch (error) {
    console.error(`[Cache] GET failed: ${key}`, error);
    return null;
  }
};

/**
 * 캐시 저장
 * - Redis가 비활성화 상태이거나 연결되지 않은 경우 저장하지 않음
 * - 직렬화 실패 시 저장하지 않음
 */
export const setCache = async (
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> => {
  try {
    if (!redisClient?.isOpen) return;

    const serialized = safeStringify(value);
    if (!serialized) return;

    await redisClient.set(key, serialized, {
      EX: ttlSeconds,
    });
  } catch (error) {
    console.error(`[Cache] SET failed: ${key}`, error);
  }
};

/**
 * 캐시 삭제
 * - 전달된 키 배열이 비어 있으면 종료
 * - Redis가 비활성화 상태이거나 연결되지 않은 경우 삭제하지 않음
 */
export const delCache = async (keys: string[]): Promise<void> => {
  if (keys.length === 0) return;

  try {
    if (!redisClient?.isOpen) return;

    await redisClient.del(keys);
  } catch (error) {
    console.error(`[Cache] DEL failed: ${keys.join(', ')}`, error);
  }
};

/**
 * pattern에 매칭되는 모든 캐시 키 삭제
 * 예: lampfire:goals:detail:1:3:*
 *
 * - Redis scanIterator로 패턴에 맞는 키를 순회
 * - Redis가 비활성화 상태이거나 연결되지 않은 경우 삭제하지 않음
 */
export const delCacheByPattern = async (pattern: string): Promise<void> => {
  try {
    if (!redisClient?.isOpen) return;

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

/**
 * 목표 목록 캐시 무효화
 * - key: lampfire:goals:list:{userId}
 */
export const invalidateGoalListCache = async (
  userId: number,
): Promise<void> => {
  const key = buildCacheKey('lampfire', 'goals', 'list', userId);
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
  await delCacheByPattern(pattern);
};