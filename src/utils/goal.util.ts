/**
 * Date 객체를 'YYYY-MM-DD' 형식 문자열로 변환
 * - 로컬 시간 기준으로 변환하여 timezone 이슈 방지
 */
export const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

/**
 * 목표 종료일까지 남은 일수 계산
 * - 종료일이 지난 경우 0 반환
 */
export const calculateDaysRemaining = (endDate: Date): number => {
  const today = toStartOfDay(new Date());
  const target = toStartOfDay(endDate);

  const diff = target.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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
 */
export const isValidDateString = (dateString: string): boolean => {
  // 1) YYYY-MM-DD 형식인지 먼저 확인
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) {
    return false;
  }

  // 2) 문자열 분리
  const [year, month, day] = dateString.split('-').map(Number);

  // 3) UTC 기준으로 Date 생성
  const date = new Date(Date.UTC(year, month - 1, day));

  // 4) 생성된 날짜가 원래 값과 정확히 일치하는지 확인
  //    (예: 2026-02-31 같은 값 방지)
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
};

/**
 * 날짜를 해당 일의 시작 시각(00:00:00.000)으로 맞춤
 */
export const toStartOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * 날짜를 해당 일의 끝 시각(23:59:59.999)으로 맞춤
 */
export const toEndOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

/**
 * 날짜에 N일 더한 새 Date 반환
 */
export const addDays = (date: Date, days: number): Date => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

/**
 * 시작일~종료일 날짜 배열 생성
 */
export const getDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  let current = toStartOfDay(start);

  while (current <= end) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }

  return dates;
};
