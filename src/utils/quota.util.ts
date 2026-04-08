import prisma from '../config/prisma';
import { AppError } from '../errors/app.error';
import { addDays, toStartOfDay } from './goal.util';
import {
  QuotaRecommendationResult,
  GoalForRecommendation,
  BaseQuotaFeedbackResult,
} from '../types/quota.type';

/**
 * 값을 min ~ max 범위로 제한
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * 오늘자 목표 리스트 조회
 */
const getTodayGoals = async (
  userId: number,
): Promise<GoalForRecommendation[]> => {
  const today = new Date();
  const startOfToday = toStartOfDay(today);
  const nextStartOfToday = addDays(startOfToday, 1);

  const goals = await prisma.goal.findMany({
    where: {
      userId,
      status: 'active',
      startDate: {
        lt: nextStartOfToday,
      },
      endDate: {
        gte: startOfToday,
      },
    },
    select: {
      id: true,
      quota: true,
      startDate: true,
      endDate: true,
      targetValue: true,
      currentValue: true,
    },
  });

  return goals;
};

/**
 * 사용자 quota profile 조회
 * 없으면 baseBias = 0 으로 생성
 */
const getOrCreateUserQuotaProfile = async (userId: number) => {
  return prisma.userQuotaProfile.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      baseBias: 0,
      updatedAt: new Date(),
    },
  });
};

/**
 * 목표 기준으로 남은 양 / 남은 일수 계산
 */
const buildBaseQuotaContext = (goal: GoalForRecommendation) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = new Date(goal.endDate);

  const normalizedEndDate = new Date(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(),
  );

  const remainingDays = Math.max(
    1,
    Math.ceil(
      (normalizedEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    ) + 1,
  );

  const remainingUnits = Math.max(0, goal.targetValue - goal.currentValue);

  return {
    goalId: goal.id,
    remainingUnits,
    remainingDays,
  };
};

/**
 * 각 Bias를 반영한 추천 quota 계산
 */
const calculateRecommendedQuota = (
  baseQuota: number,
  baseBias: number,
): number => {
  const recommendQuota = Math.round(baseQuota + baseBias);

  return Math.max(1, recommendQuota);
};

// 할당량 계산
const recommendQuota = async (
  userId: number,
  recommendationDate: Date,
  goal: GoalForRecommendation,
) => {
  // 이 목표에 대해서 새로운 할당량을 추천받을 경우,
  // 이전 날짜 할당량에 대한 수행(공부)은 종료되었다고 판단합니다.
  // 따라서 해당 시점에서 지난 할당량 추천에 대한 평가를 진행합니다.
  const openedRecommendations = await prisma.quotaRecommendation.findMany({
    where: {
      userId,
      status: 'OPEN',
    },
  });

  // 현 시점 피드백이 진행되지 않은 추천 할당량에 대해 피드백 진행
  if (openedRecommendations.length > 0) {
    await Promise.all(
      openedRecommendations.map(async (recommendation) => {
        // 해당 날짜&목표의 실제 완료량 가져오기
        const goalLog = await prisma.goalLog.findUnique({
          where: {
            goalId_achievedAt: {
              goalId: recommendation.goalId,
              achievedAt: recommendation.recommendationDate,
            },
          },
          select: {
            actualValue: true,
          },
        });

        if (!goalLog) {
          throw new Error('goalLog를 찾을 수 없습니다.');
        }
        const actualValue = goalLog.actualValue ?? 0;

        await updateQuotaFeedbackService(
          userId,
          recommendation.id,
          actualValue,
        );
      }),
    );
  }

  const context = buildBaseQuotaContext(goal);
  const profile = await getOrCreateUserQuotaProfile(userId);

  // 기본 quota 계산
  const baseQuota = Math.max(
    1,
    Math.ceil(context.remainingUnits / Math.max(context.remainingDays, 1)),
  );

  const recommendedQuota = calculateRecommendedQuota(
    baseQuota,
    profile.baseBias,
  );

  // 추천 결과 저장
  const savedRecommendation = await prisma.quotaRecommendation.create({
    data: {
      userId,
      goalId: goal.id,
      recommendationDate,
      remainingUnits: context.remainingUnits,
      remainingDays: context.remainingDays,
      baseQuota,
      baseBiasSnapshot: profile.baseBias,
      recommendedQuota,
    },
  });

  return {
    recommendationId: savedRecommendation.id,
    remainingUnits: context.remainingUnits,
    remainingDays: context.remainingDays,
    baseQuota,
    baseBias: profile.baseBias,
    recommendedQuota,
  };
};

/**
 * quota 추천 결과를 받아 baseBias 업데이트
 * quota recommendation 기록은 있는데, feedbck 기록이 없을 경우 수행
 */
const updateQuotaFeedbackService = async (
  userId: number,
  recommendationId: number,
  actualCompleted: number,
): Promise<BaseQuotaFeedbackResult> => {
  const recommendation = await prisma.quotaRecommendation.findUnique({
    where: {
      id: recommendationId,
    },
    select: {
      userId: true,
      baseBiasSnapshot: true,
      recommendedQuota: true,
    },
  });

  if (!recommendation) {
    throw new AppError('QUOTA_RECOMMENDATION_NOT_FOUND');
  }

  const completionRate = calculateCompletionRate(
    recommendation.recommendedQuota,
    actualCompleted,
  );

  // 새 할당량 = 이전 할당량 + 학습률 * 성공 정도
  // 값이 너무 튀지 않도록 -3 ~ 3 범위 내의 값으로 조정
  const updatedBaseBias = clamp(
    recommendation.baseBiasSnapshot + 0.3 * (completionRate - 0.85),
    -3,
    3,
  );

  const finalReward = clamp(completionRate, 0, 1.2);

  await prisma.$transaction([
    // 피드백 결과 저장
    prisma.quotaFeedback.create({
      data: {
        recommendationId,
        actualCompleted,
        completionRate,
        finalReward,
      },
    }),

    // 유저의 baseBias 업데이트
    prisma.userQuotaProfile.update({
      where: { userId },
      data: { baseBias: updatedBaseBias },
    }),

    // quotaRecommendation의 피드백 상태를 완료로 변경
    prisma.quotaRecommendation.update({
      where: { id: recommendationId },
      data: { status: 'CLOSED' },
    }),
  ]);

  return {
    recommendationId,
    actualCompleted,
    completionRate,
    finalReward,
    updatedBaseBias,
  };
};

export const getQuotaByGoal = async (
  userId: number,
  goalId: number,
  recommendationDate: Date = new Date(),
): Promise<QuotaRecommendationResult> => {
  recommendationDate.setHours(0, 0, 0, 0);

  // 오늘 날짜에 대한 할당량을 가져오고 반환
  const quotaRecommendation = await prisma.quotaRecommendation.findUnique({
    where: {
      goalId_recommendationDate: {
        goalId,
        recommendationDate,
      },
    },
    select: {
      recommendedQuota: true,
    },
  });

  if (quotaRecommendation) {
    return new Map<number, number>([
      [goalId, quotaRecommendation.recommendedQuota],
    ]);
  }

  // 할당량이 존재하지 않을 경우 연산 수행 후 반환
  const goal = await prisma.goal.findUnique({
    where: { id: goalId },
    select: {
      id: true,
      quota: true,
      startDate: true,
      endDate: true,
      targetValue: true,
      currentValue: true,
    },
  });

  if (!goal) {
    throw new AppError('GOAL_NOT_FOUND');
  }

  const createdRecommendation = await recommendQuota(
    userId,
    recommendationDate,
    goal,
  );

  return new Map<number, number>([
    [goalId, createdRecommendation.recommendedQuota],
  ]);
};

/**
 * userId에 다른 여러 목표의 추천 할당량을 가져옴.
 * 특정 목표에 대해 추천 할당량이 존재하지 않을 경우 계산 수행
 */
export const getQuotasByUser = async (
  userId: number,
  recommendationDate: Date = new Date(),
): Promise<QuotaRecommendationResult> => {
  recommendationDate.setHours(0, 0, 0, 0);

  // userId에 해당하는 오늘자 목표 리스트를 가져옴
  const goals = await getTodayGoals(userId);

  // 현재 테이블에 존재하는 오늘자 추천 할당량 리스트를 가져옴
  const existingRecommendations = await prisma.quotaRecommendation.findMany({
    where: {
      userId,
      recommendationDate,
    },
    select: {
      goalId: true,
      recommendedQuota: true,
    },
  });

  const existingGoalIds = new Set(
    existingRecommendations.map((item) => item.goalId),
  );

  // 생성되지 않은 할당량 필터링
  const missingRecommendations = goals
    .filter((goal) => !existingGoalIds.has(goal.id))
    .map((goal) => ({
      userId,
      goalId: goal.id,
      recommendationDate,
      recommendedQuota: goal.quota,
    }));

  // 생성되지 않은 할당량에 대해서만 할당량 계산 로직 수행
  if (missingRecommendations.length > 0) {
    await Promise.all(
      goals.map((goal) => recommendQuota(userId, recommendationDate, goal)),
    );
  }

  return new Map<number, number>(
    missingRecommendations.map((item) => [item.goalId, item.recommendedQuota]),
  );
};

/**
 * completionRate 계산
 */
export const calculateCompletionRate = (
  recommendedQuota: number,
  actualCompleted: number,
): number => {
  if (recommendedQuota <= 0) {
    return 0;
  }

  return actualCompleted / recommendedQuota;
};
