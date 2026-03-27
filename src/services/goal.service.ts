import prisma from '../config/prisma';
import {
  CreateGoalRequest,
  CreateGoalResponse,
  DeleteGoalResponse,
  GoalDetailResponse,
  GoalListResponse,
  TodayGoalsResponse,
  UpdateGoalRequest,
  UpdatedGoalResponse,
} from '../types/goal.type';
import {
  addDays,
  calculateDaysRemaining,
  calculateProgressRate,
  formatDate,
  getDateRange,
  isValidDateString,
  toEndOfDay,
  toStartOfDay,
} from '../utils/goal.util';

/**
 * 개별 목표 상세 조회 서비스 파라미터
 */
interface GetGoalDetailServiceParams {
  userId: number;
  goalId: number;
  startDate?: string;
  endDate?: string;
}

/**
 * 목표 수정 후 응답 데이터 생성
 *
 * 역할:
 * - 수정된 목표를 다시 조회 (category, goalLogs 포함)
 * - UpdatedGoalResponse 형태로 가공
 *
 * 주의:
 * - goalLogs의 actualValue / targetValue는 null 가능 → 기본값 처리 필요
 */
const buildUpdatedGoalResponse = async (
  userId: number,
  goalId: number,
): Promise<UpdatedGoalResponse> => {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    include: {
      category: true,
      goalLogs: {
        orderBy: {
          achievedAt: 'asc',
        },
      },
    },
  });

  if (!goal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    category: goal.category.name,
    progress: {
      rate: calculateProgressRate(goal.currentValue, goal.targetValue),
      currentAmount: goal.currentValue,
      targetAmount: goal.targetValue,
      unit: goal.category.unit,
    },
    period: {
      startDate: formatDate(goal.startDate),
      endDate: formatDate(goal.endDate),
      daysRemaining: calculateDaysRemaining(goal.endDate),
    },
    dailyProgress: goal.goalLogs.map((log) => ({
      /**
       * 날짜: 로그 생성일 기준 (YYYY-MM-DD)
       */
      date: formatDate(log.achievedAt),

      /**
       * quota:
       * - 실제 수행량(actualValue)
       * - null이면 0으로 보정 (응답 타입 number 유지)
       */
      quota: log.actualValue ?? 0,

      /**
       * 완료 여부:
       * - actualValue >= targetValue
       * - 둘 다 nullable이므로 안전하게 보정 후 비교
       */
      isCompleted: (log.actualValue ?? 0) >= (log.targetValue ?? 0),
    })),
  };
};

/**
 * 목표 생성 서비스
 *
 * 역할:
 * - 사용자/카테고리 유효성 확인
 * - 날짜 검증
 * - 목표 생성
 * - 생성 결과 반환
 */
export const createGoalService = async (
  userId: number,
  payload: CreateGoalRequest,
): Promise<CreateGoalResponse> => {
  const { title, categoryId, detail, totalAmount, startDate, endDate } =
    payload;

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
   * 카테고리 존재 여부 및 본인 소유 여부 확인
   */
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      // userId,
    },
  });

  if (!category) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  /**
   * 날짜 문자열 유효성 검사
   */
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    throw new Error('INVALID_DATE');
  }

  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  /**
   * 시작일이 종료일보다 늦은 경우 예외 처리
   */
  if (parsedStartDate > parsedEndDate) {
    throw new Error('INVALID_DATE_RANGE');
  }

  /**
   * 하루 할당량(quota) 계산
   * 시작일 ~ 종료일 포함
   */
  const diffTime = parsedEndDate.getTime() - parsedStartDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const quota = Math.ceil(totalAmount / diffDays);
  
  /**
   * 목표 생성
   */
  const createdGoal = await prisma.goal.create({
    data: {
      userId,
      categoryId,
      title,
      description: detail,
      status: 'active',
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      currentValue: 0,
      targetValue: totalAmount,
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
   * 생성된 목표 + 사용자 닉네임 반환
   */
  return {
    ...createdGoal,
    nickname: user.nickname,
  };
};

/**
 * 전체 목표 리스트 조회 서비스
 *
 * 역할:
 * - 사용자의 목표 전체 조회
 * - 마감일 오름차순 정렬
 * - 진행률/날짜 형식 가공
 */
export const getGoalListService = async (
  userId: number,
): Promise<GoalListResponse> => {
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

  return {
    goals: goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      endDate: formatDate(goal.endDate),
      description: goal.description,
      progressRate: calculateProgressRate(goal.currentValue, goal.targetValue),
    })),
  };
};

/**
 * 개별 목표 상세 조회 서비스
 *
 * 역할:
 * - 목표 + 카테고리 조회
 * - 기간 내 GoalLog / TimerLog 조회
 * - 일별 진행 현황 구성
 * - 상세 응답 DTO 반환
 */
export const getGoalDetailService = async ({
  userId,
  goalId,
  startDate,
  endDate,
}: GetGoalDetailServiceParams): Promise<GoalDetailResponse> => {
  /**
   * 조회 기간 설정
   *
   * 기본 정책:
   * - 기본값: 오늘 기준 -7일 ~ +14일
   * - 프론트에서 startDate / endDate 주면 그 값 사용
   *
   * 주의:
   * - startDate는 00:00 기준
   * - endDate는 23:59:59 기준
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

  if (queryStartDate > queryEndDate) {
    throw new Error('INVALID_DATE_RANGE');
  }

  /**
   * 목표 조회
   * - userId 포함해서 본인 목표만 조회
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
   * 기간 내 GoalLog / TimerLog 병렬 조회
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
  /**
   * 누적 공부 시간
   */
  const totalStudyTime = totalTimerAggregate._sum.durationSec ?? 0;
  /**
   * 날짜별 GoalLog / TimerLog 빠른 조회를 위한 Map 생성
   *
   * 왜 Map을 쓰는가?
   * - 특정 날짜의 로그를 O(1)로 조회하기 위해
   * - 배열 탐색 (O(n)) 대신 Map 사용
   *
   * key: YYYY-MM-DD 문자열
   * value: 해당 날짜의 로그
   */
  const goalLogMap = new Map(
    goalLogs.map((log) => [formatDate(log.achievedAt), log]),
  );
  /**
   * 날짜별 TimerLog 빠른 조회를 위한 Map 생성
   *
   * key: 'YYYY-MM-DD'
   * value: timerLog 객체
   *
   * 주의:
   * - timerDate는 nullable이므로 null 데이터는 제외
   * - formatDate는 Date만 받기 때문에 사전 필터링 필요
   */
  const timerLogMap = new Map(
    timerLogs
      /**
       * timerDate가 null인 데이터는 제외
       * (formatDate는 Date만 받기 때문)
       */
      .filter((log) => log.timerDate !== null)
      .map((log) => [formatDate(log.timerDate as Date), log]),
  );
  /**
   * 날짜 범위 배열 생성 후 일별 진행 현황 구성
   */
  const dateRange = getDateRange(queryStartDate, toStartOfDay(queryEndDate));
  /**
   * 날짜 범위 기준으로 일별 진행 데이터 생성
   *
   * 핵심 개념:
   * - 날짜 배열(dateRange)을 기준으로 하나씩 매핑
   * - 해당 날짜의 goalLog / timerLog를 Map에서 꺼내 사용
   */
  const dailyProgress = dateRange.map((date) => {
    const dateKey = formatDate(date);
    /**
     * 해당 날짜의 로그 조회 (없으면 undefined)
     */
    const goalLog = goalLogMap.get(dateKey);
    const timerLog = timerLogMap.get(dateKey);
    /**
     * 목표량:
     * - 로그가 있으면 targetValue
     * - 없으면 기본 quota 사용
     * - null 방지 위해 최종 fallback 필요하면 ?? 0 추가 가능
     */
    const targetAmount = goalLog?.targetValue ?? goal.quota;
    /**
     * 실제 수행량:
     * - 로그 없으면 0
     */
    const completedAmount = goalLog?.actualValue ?? 0;

    return {
      date: dateKey,
      targetAmount,
      completedAmount,
      /**
       * 완료 여부:
       * - 보정된 값 기준 비교
       */
      isCompleted: completedAmount >= targetAmount,
      /**
       * 공부 시간:
       * - timerLog 없으면 0
       */
      studyTime: timerLog?.durationSec ?? 0,
      /**
       * 오늘 여부:
       * - UI에서 강조 표시용
       */
      isToday: dateKey === formatDate(today),
    };
  });

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    category: goal.category.name,
    progress: {
      rate: calculateProgressRate(goal.currentValue, goal.targetValue),
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

/**
 * 개별 목표 수정 서비스
 *
 * 흐름:
 * 1. 목표 존재 + 본인 소유 여부 확인
 * 2. 수정 값 유효성 검사
 * 3. DB 업데이트
 * 4. 최신 상태 조회 후 응답 반환
 */
export const updateGoalService = async (
  userId: number,
  goalId: number,
  payload: UpdateGoalRequest,
): Promise<UpdatedGoalResponse> => {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select: {
      id: true,
      startDate: true,
    },
  });

  if (!goal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  const { targetValue, endDate } = payload;

  /**
   * 수정할 값이 하나도 없는 경우
   */
  if (targetValue === undefined && endDate === undefined) {
    throw new Error('EMPTY_UPDATE_DATA');
  }

  /**
   * 목표값 검증
   */
  if (targetValue !== undefined) {
    if (!Number.isInteger(targetValue) || targetValue <= 0) {
      throw new Error('INVALID_TARGET_VALUE');
    }
  }

  /**
   * 종료일 검증
   */
  let parsedEndDate: Date | undefined;

  if (endDate !== undefined) {
    if (!isValidDateString(endDate)) {
      throw new Error('INVALID_DATE');
    }

    parsedEndDate = new Date(endDate);

    if (goal.startDate > parsedEndDate) {
      throw new Error('INVALID_DATE_RANGE');
    }
  }

  /**
   * 목표 수정
   */
  await prisma.goal.update({
    where: {
      id: goalId,
    },
    data: {
      ...(targetValue !== undefined ? { targetValue } : {}),
      ...(parsedEndDate ? { endDate: parsedEndDate } : {}),
    },
  });

  /**
   * 수정된 목표 상세 응답 반환
   */
  return buildUpdatedGoalResponse(userId, goalId);
};

/**
 * 개별 목표 삭제 서비스
 *
 * 역할:
 * - 목표 존재 여부 / 권한 확인
 * - 목표 삭제
 * - 삭제 결과 반환
 *
 * 주의:
 * - goalLog, timerLog가 FK로 연결되어 있으면
 *   cascade 설정 없을 경우 삭제 실패 가능
 *
 * 해결 방법:
 * - transaction으로 로그 먼저 삭제 후 goal 삭제
 */
export const deleteGoalService = async (
  userId: number,
  goalId: number,
): Promise<DeleteGoalResponse> => {
  const goal = await prisma.goal.findFirst({
    where: {
      id: goalId,
      userId,
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (!goal) {
    throw new Error('GOAL_NOT_FOUND');
  }

  /**
   * 연관 로그가 FK로 묶여 있으면 아래 delete 하나로는 실패할 수 있음
   * 그 경우 transaction으로 goalLog / timerLog를 먼저 삭제해야 함
   */
  await prisma.goal.delete({
    where: {
      id: goalId,
    },
  });

  return {
    id: goal.id,
    title: goal.title,
  };
};

/**
 * 오늘 목표 리스트 조회 서비스
 *
 * 역할:
 * - 오늘 진행 중인 목표 조회
 * - 오늘의 TimerLog 조회
 * - 목표별 공부 시간 / 타이머 실행 여부 / 진행률 가공
 */
export const getTodayGoalsService = async (
  userId: number,
): Promise<TodayGoalsResponse> => {
  const today = new Date();
  const startOfToday = toStartOfDay(today);
  const endOfToday = toEndOfDay(today);

  /**
   * 오늘 기준 진행 중인 목표 조회
   * - startDate <= 오늘의 끝
   * - endDate >= 오늘의 시작
   */
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: 'active',
      startDate: {
        lte: endOfToday,
      },
      endDate: {
        gte: startOfToday,
      },
    },
    orderBy: {
      endDate: 'asc',
    },
    select: {
      id: true,
      title: true,
      currentValue: true,
      targetValue: true,
      category: {
        select: {
          unit: true,
        },
      },
    },
  });

  if (goals.length === 0) {
    return {
      totalStudyTime: 0,
      todayGoals: [],
    };
  }

  const goalIds = goals.map((goal) => goal.id);

  /**
   * 오늘의 타이머 로그 조회
   */
  const timerLogs = await prisma.timerLog.findMany({
    where: {
      goalId: {
        in: goalIds,
      },
      timerDate: {
        gte: startOfToday,
        lte: endOfToday,
      },
    },
    orderBy: {
      timerDate: 'asc',
    },
    select: {
      goalId: true,
      durationSec: true,
      endTime: true,
    },
  });

  /**
   * 목표별 공부 시간 합계 / 실행 중 여부 계산
   */
  const studyTimeMap = new Map<number, number>();
  const runningGoalSet = new Set<number>();

  timerLogs.forEach((log) => {
    const prevStudyTime = studyTimeMap.get(log.goalId) ?? 0;
    studyTimeMap.set(log.goalId, prevStudyTime + log.durationSec);

    if (log.endTime === null) {
      runningGoalSet.add(log.goalId);
    }
  });

  const todayGoals = goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    targetAmount: goal.targetValue,
    currentAmount: goal.currentValue,
    unit: goal.category.unit,
    studyTime: studyTimeMap.get(goal.id) ?? 0,
    completed: goal.currentValue >= goal.targetValue,
    isTimerRunning: runningGoalSet.has(goal.id),
    progressRate: calculateProgressRate(goal.currentValue, goal.targetValue),
  }));

  const totalStudyTime = todayGoals.reduce(
    (sum, goal) => sum + goal.studyTime,
    0,
  );

  return {
    totalStudyTime,
    todayGoals,
  };
};

/**
 * 오늘 목표 달성률 조회 서비스
 *
 * 역할:
 * - 오늘 기준 진행 중인 목표 조회
 * - 오늘 기록된 GoalLog / TimerLog 조회
 * - 완료 목표 수와 전체 공부 시간 계산
 *
 * 계산 기준:
 * - 날짜 범위는 로컬 시간 기준 "오늘 00:00 ~ 23:59:59.999"
 * - completedGoals:
 *   actualValue >= targetValue 인 목표 개수
 * - ratio:
 *   completedGoals / totalGoals * 100
 *
 * 주의:
 * - 현재 서비스는 한국에서만 사용하는 전제를 두고
 *   로컬 시간 기준으로 계산
 * - 서버/DB 시간대가 크게 달라지면 추후 timezone 보정 로직 추가 가능
 */
export const getTodayGoalCompletionService = async (userId: number) => {
  /**
   * 오늘 시작 / 끝 시각 계산
   *
   * 기존 util(toStartOfDay / toEndOfDay)을 그대로 사용해서
   * 최소 수정으로 현재 프로젝트 스타일 유지
   */

  const today = new Date();
  const startOfDay = toStartOfDay(today);
  const endOfDay = toEndOfDay(today);

  /**
   * 오늘 기준 진행 중인 목표 조회
   *
   * 조건:
   * - 본인 목표
   * - active 상태
   * - 시작일 <= 오늘 끝
   * - 종료일 >= 오늘 시작
   */
  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: 'active',
      startDate: {
        lte: endOfDay,
      },
      endDate: {
        gte: startOfDay,
      },
    },
    select: {
      id: true,
    },
  });

  const goalIds = goals.map((goal) => goal.id);

  /**
   * 오늘 진행 중인 목표가 하나도 없으면
   * 기본값 반환
   */
  if (goalIds.length === 0) {
    return {
      totalTime: 0,
      totalGoals: 0,
      completedGoals: 0,
      ratio: 0,
    };
  }

  /**
   * 오늘 GoalLog / TimerLog 병렬 조회
   *
   * GoalLog:
   * - 오늘 목표 완료 여부 판단용
   *
   * TimerLog:
   * - 오늘 전체 공부 시간 합산용
   */
  const [goalLogs, timerLogs] = await Promise.all([
    prisma.goalLog.findMany({
      where: {
        userId,
        goalId: {
          in: goalIds,
        },
        achievedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        goalId: true,
        targetValue: true,
        actualValue: true,
      },
    }),

    prisma.timerLog.findMany({
      where: {
        goalId: {
          in: goalIds,
        },
        timerDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        durationSec: true,
      },
    }),
  ]);

  /**
   * 오늘 완료된 목표 계산
   *
   * 완료 조건:
   * - actualValue, targetValue 둘 다 null이 아니고
   * - actualValue >= targetValue
   *
   * Set 사용 이유:
   * - 같은 goalId 로그가 여러 번 있어도
   *   완료 목표 수는 1개로만 세기 위함
   */
  const completedGoalIdSet = new Set<number>();

  for (const log of goalLogs) {
    if (
      log.actualValue !== null &&
      log.actualValue !== undefined &&
      log.targetValue !== null &&
      log.targetValue !== undefined &&
      log.actualValue >= log.targetValue
    ) {
      completedGoalIdSet.add(log.goalId);
    }
  }

  /**
   * 오늘 전체 공부 시간 계산
   *
   * durationSec는 초 단위이므로
   * 명세에 맞춰 밀리초(ms)로 변환
   */
  const totalTime =
    timerLogs.reduce((sum, log) => sum + log.durationSec, 0) * 1000;

  const totalGoals = goals.length;
  const completedGoals = completedGoalIdSet.size;

  /**
   * 목표 진행도(%)
   *
   * 예:
   * - 3개 중 1개 완료 -> 33
   * - 3개 중 2개 완료 -> 66
   */
  const ratio =
    totalGoals === 0 ? 0 : Math.floor((completedGoals / totalGoals) * 100);

  return {
    totalTime,
    totalGoals,
    completedGoals,
    ratio,
  };
};
