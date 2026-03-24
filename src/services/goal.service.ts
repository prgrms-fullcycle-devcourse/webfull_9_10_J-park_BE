import prisma from '../config/prisma';
import {
  CreateGoalRequest,
  CreateGoalResponse,
  GoalListResponse,
  DailyProgressItem,
  GoalDetailResponse 
} from '../types/goal.type';

/**
 *  목표 생성 서비스
 *
 * @description
 * 인증된 사용자의 목표를 생성하는 서비스 로직
 *
 * @param userId - JWT에서 추출한 사용자 ID
 * @param payload - 목표 생성 요청 데이터 DTO
 *
 * @throws USER_NOT_FOUND - 사용자 존재하지 않을 경우
 * @throws CATEGORY_NOT_FOUND - 카테고리가 존재하지 않거나 사용자 소유가 아닐 경우
 * @throws INVALID_DATE - 날짜 형식이 올바르지 않을 경우
 * @throws INVALID_DATE_RANGE - 시작일이 종료일보다 늦을 경우
 *
 * @returns 생성된 목표 정보 + 사용자 닉네임
 */
export const createGoalService = async (
  userId: number,
  payload: CreateGoalRequest
): Promise<CreateGoalResponse> => {
   // 요청 데이터 구조 분해
  const { title, categoryId, description, targetValue, startDate, endDate, quota } = payload;


   /**
   * 사용자 존재 여부 확인
   */
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
    },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  /**
   * 카테고리 유효성 검사 (본인 소유인지 포함)
   */
  console.log('🔥 [CREATE] userId:', userId);
  console.log('🔥 [CREATE] categoryId:', categoryId);
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
  });

  if (!category) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  /**
   *  날짜 파싱 및 검증
   */
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  // 잘못된 날짜 형식 체크
  if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
    throw new Error('INVALID_DATE');
  }

  // 시작일 > 종료일 체크
  if (parsedStartDate > parsedEndDate) {
    throw new Error('INVALID_DATE_RANGE');
  }

  /**
   * 목표 생성
   * POST /goals
   */
  const createdGoal = await prisma.goal.create({
    data: {
      userId,
      categoryId,
      title,
      description,
      status: 'active', // 기본 상태
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      currentValue: 0, // 초기 진행도
      targetValue,
      quota,
    },
    select: {
      id: true,
      title: true,
      categoryId: true,
      status: true,
      currentValue: true,
      targetValue: true,
      quota: true,
    },
  });

  /**
   * 응답 반환 (닉네임 포함)
   */

  return {
    ...createdGoal,
    nickname: user.nickname,
  };
};

/**
 * 전체 목표 리스트 조회 서비스
 *
 * @description
 * 로그인한 사용자의 모든 목표를 조회하고
 * 진행률(progressRate)을 계산하여 반환
 *
 * @param userId - 인증된 사용자 ID
 *
 * @returns 목표 리스트 배열
 */
export const getGoalListService = async (
  userId: number
): Promise<GoalListResponse> => {
   /**
   * 목표 목록 조회 (마감일 기준 오름차순)
   */
  const goals = await prisma.goal.findMany({
    where: {
      userId,
    },
    orderBy: {
      endDate: 'asc',
    },
    select: {
      id: true,
      title: true,
      description: true,
      endDate: true,
      currentValue: true,
      targetValue: true,
    },
  });

  /**
   * 진행률 계산 및 데이터 가공
   */
  const formattedGoals = goals.map((goal) => {
    // 진행률 계산 (%)
    const progressRate =
      goal.targetValue > 0
        ? Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100)
        : 0;

    return {
      id: goal.id,
      title: goal.title,
      endDate: goal.endDate.toISOString().split('T')[0], // YYYY-MM-DD 형식으로 변환
      description: goal.description,
      progressRate,
    };
  });

  /**
   * 최종 응답 반환
   */
  return {
    goals: formattedGoals,
  };
};

/**
 * 개별 목표 조회 API
 * 서비스 파라미터 타입 
*/
interface GetGoalDetailServiceParams {
  userId: number;
  goalId: number;
  startDate?: string;
  endDate?: string;
}

/**
 * 날짜를 00:00:00으로 맞춤 (날짜 비교용)
*/
const toStartOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

/**
 * 날짜를 23:59:59로 맞춤 (조회 범위 끝 포함용)
*/
const toEndOfDay = (date: Date): Date => {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
};

/**
 * 날짜 + N일 
*/
const addDays = (date: Date, days: number): Date => {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
};

/**
 * Date => YYYY-MM-DD 변환
*/
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * 날짜 범위 배열 생성 (start ~ end) 
*/
const getDateRange = (start: Date, end: Date): Date[] => {
  const dates: Date[] = [];
  let current = toStartOfDay(start);

  while (current <= end) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }

  return dates;
};

/**
 * 남은 일수 계산
 */
const calculateDaysRemaining = (endDate: Date): number => {
  const today = toStartOfDay(new Date());
  const end = toStartOfDay(endDate);

  const diffMs = end.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

/**
 *  개별 목표 상세 조회 서비스
 *
 * 역할:
 * - 목표 정보 + 카테고리 조회
 * - 기간 내 GoalLog 조회 (일자별 진행)
 * - TimerLog 조회 (공부 시간)
 * - 응답 DTO 형태로 가공
 *
 * 핵심 로직:
 * 1. 날짜 범위 계산 (기본값 포함)
 * 2. goal 조회 (권한 포함)
 * 3. GoalLog / TimerLog 병렬 조회
 * 4. Map으로 변환 (성능 최적화)
 * 5. 날짜 배열 생성 후 dailyProgress 구성
 * 
 */
export const getGoalDetailService = async ({
  userId,
  goalId,
  startDate,
  endDate,
}: GetGoalDetailServiceParams): Promise<GoalDetailResponse> => {
   /**
   * =========================================================
   * 1. 날짜 범위 설정
   * 기본값: today-7 ~ today+14
   * =========================================================
   */
  const today = toStartOfDay(new Date());

  const defaultStartDate = addDays(today, -7);
  const defaultEndDate = addDays(today, 14);

  const queryStartDate = startDate
    ? toStartOfDay(new Date(startDate))
    : defaultStartDate;

  const queryEndDate = endDate
    ? toEndOfDay(new Date(endDate))
    : toEndOfDay(defaultEndDate);

  //잘못된 날짜 범위
  if (queryStartDate > queryEndDate) {
    throw new Error('INVALID_DATE_RANGE');
  }

  /**
   * =========================================================
   *  2. 목표 조회 (권한 포함)
   * - userId 포함 → 다른 사람 목표 접근 방지
   * =========================================================
   */
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    include: {
      category: true,
    },
  });

  if (!goal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  /**
   * =========================================================
   * 3. 로그 데이터 조회 (병렬 처리)
   *
   * GoalLog → 일자별 목표 진행량
   * TimerLog → 공부 시간
   * aggregate → 총 공부 시간
   * =========================================================
   */
  const [goalLogs, timerLogs, totalTimerAggregate] = await Promise.all([
    prisma.goalLog.findMany({
      where: {
        goalId: goal.id,
        userId,
        achievedAt: {
          gte: queryStartDate,
          lte: queryEndDate,
        },
      },
      orderBy: {
        achievedAt: 'asc',
      },
    }),

    prisma.timerLog.findMany({
      where: {
        goalId: goal.id,
        timerDate: {
          gte: queryStartDate,
          lte: queryEndDate,
        },
      },
      orderBy: {
        timerDate: 'asc',
      },
    }),

    prisma.timerLog.aggregate({
      where: {
        goalId: goal.id,
      },
      _sum: {
        durationSec: true,
      },
    }),
  ]);

  const totalStudyTime = totalTimerAggregate._sum.durationSec ?? 0;

  /**
   * =========================================================
   * 4. 진행률 계산
   * =========================================================
   */
  const rate =
    goal.targetValue > 0
      ? Math.min(
          Math.floor((goal.currentValue / goal.targetValue) * 100),
          100
        )
      : 0;

  /**
   * =========================================================
   * 5. Map 변환 (O(1) 조회 최적화)
   * =========================================================
   */
  const goalLogMap = new Map(
    goalLogs.map((log) => [formatDate(log.achievedAt), log])
  );

  const timerLogMap = new Map<string, number>();

  for (const timerLog of timerLogs) {
    if (!timerLog.timerDate) continue;

    const key = formatDate(timerLog.timerDate);
    const prev = timerLogMap.get(key) ?? 0;

    // 하루에 여러 타이머 -> 합산
    timerLogMap.set(key, prev + timerLog.durationSec);
  }

  /**
   * =========================================================
   * 6. 날짜 배열 생성 후 dailyProgress 구성
   * =========================================================
   */
  const dateRange = getDateRange(queryStartDate, toStartOfDay(queryEndDate));

  const dailyProgress: DailyProgressItem[] = dateRange.map((date) => {
    const dateString = formatDate(date);

    const goalLog = goalLogMap.get(dateString);
    const studyTime = timerLogMap.get(dateString) ?? 0;

    /**
     *  목표 기간 내부인지 확인
     * - 목표 시작 전 / 종료 후는 0 처리
     */
    const isWithinGoalPeriod =
      toStartOfDay(date) >= toStartOfDay(goal.startDate) &&
      toStartOfDay(date) <= toStartOfDay(goal.endDate);

    const targetAmount = isWithinGoalPeriod
      ? (goalLog?.targetValue ?? goal.quota)
      : 0;

    const completedAmount = isWithinGoalPeriod
      ? (goalLog?.actualValue ?? 0)
      : 0;

    return {
      date: dateString,
      targetAmount,
      completedAmount,
      isCompleted: targetAmount > 0 ? completedAmount >= targetAmount : false, //목표 달성 여부
      studyTime,
      isToday: dateString === formatDate(today), //오늘 여부
    };
  });

  /**
   * =========================================================
   * 7. 최종 응답 DTO 구성
   * =========================================================
   */
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    category: goal.category.name,

    progress: {
      rate,
      currentAmount: goal.currentValue,
      targetAmount: goal.targetValue,
      totalStudyTime,
      unit: goal.category.unit,
    },

    period: {
      startDate: formatDate(goal.startDate),
      endDate: formatDate(goal.endDate),
      daysRemaining: calculateDaysRemaining(goal.endDate),
    },

    dailyProgress,
  };
};