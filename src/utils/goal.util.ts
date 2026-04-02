/**
 * 프로젝트 날짜 기준:
 * - 서버 timezone: UTC
 * - DB 저장: UTC
 * - 서비스 날짜 계산 기준: KST (UTC+9)
 */

const KST_OFFSET_HOURS = 9;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * UTC Date를 KST 기준으로 해석하기 위한 보정 Date 생성
 *
 * 예:
 * - 원본 UTC: 2026-04-02T00:00:00.000Z
 * - KST 보정 후: "KST 기준 시각"을 UTC getter로 안전하게 꺼낼 수 있음
 */
const toKstShiftedDate = (date: Date): Date => {
  return new Date(date.getTime() + KST_OFFSET_HOURS * MS_PER_HOUR);
};

/**
 * Date 객체를 KST 기준 'YYYY-MM-DD' 형식 문자열로 변환
 */
export const formatDate = (date: Date): string => {
  const kstDate = toKstShiftedDate(date);

  const year = kstDate.getUTCFullYear();
  const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kstDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * 목표 종료일까지 남은 일수 계산
 * - KST 기준 오늘 00:00와 종료일 00:00 비교
 * - 종료일이 지난 경우 0 반환
 */
export const calculateDaysRemaining = (endDate: Date): number => {
  const today = toStartOfDay(new Date());
  const target = toStartOfDay(endDate);

  const diff = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / MS_PER_DAY));
};

/**
 * 목표 진행률(%) 계산
 * - 0~100 범위로 제한
 */
export const calculateProgressRate = (
  currentAmount: number,
  targetAmount: number,
): number => {
  if (targetAmount <= 0) return 0;

  return Math.min(Math.floor((currentAmount / targetAmount) * 100), 100);
};

/**
 * 문자열이 유효한 날짜인지 검증
 * - 형식: YYYY-MM-DD
 * - 실제 존재하는 날짜인지 확인
 *
 * 검증은 캘린더 날짜 자체를 확인하는 용도이므로 UTC 기준으로 안전하게 검사
 */
export const isValidDateString = (dateString: string): boolean => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
};

/**
 * 'YYYY-MM-DD' 문자열을
 * "해당 날짜의 KST 00:00:00.000"을 의미하는 UTC Date로 변환
 *
 * 예:
 * - "2026-04-02"
 * - 반환값: 2026-04-01T15:00:00.000Z
 */
export const parseDateStringToKSTStart = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);

  return new Date(Date.UTC(year, month - 1, day, -KST_OFFSET_HOURS, 0, 0, 0));
};

/**
 * 주어진 Date가 속한 "KST 날짜"의 시작 시각(00:00:00.000)을 UTC Date로 반환
 *
 * 반환되는 Date는 UTC Date 객체지만,
 * 의미상 "KST 하루의 시작"을 나타냄
 */
export const toStartOfDay = (date: Date): Date => {
  const dateString = formatDate(date);
  return parseDateStringToKSTStart(dateString);
};

/**
 * 주어진 Date가 속한 "KST 날짜"의 끝 시각(23:59:59.999)을 UTC Date로 반환
 */
export const toEndOfDay = (date: Date): Date => {
  const startOfDay = toStartOfDay(date);
  return new Date(startOfDay.getTime() + MS_PER_DAY - 1);
};

/**
 * 날짜에 N일 더한 새 Date 반환
 * - KST 날짜 기준으로 하루씩 이동
 */
export const addDays = (date: Date, days: number): Date => {
  const startOfDay = toStartOfDay(date);
  return new Date(startOfDay.getTime() + days * MS_PER_DAY);
};

/**
 * 시작일~종료일 날짜 배열 생성
 * - KST 기준 하루 단위 배열
 * - 각 원소는 "해당 KST 날짜의 시작 시각"을 의미하는 UTC Date
 */
export const getDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  let current = toStartOfDay(start);
  const endDate = toStartOfDay(end);

  while (current.getTime() <= endDate.getTime()) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }

  return dates;
};
