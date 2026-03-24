import prisma from '../config/prisma';
import {
  CreateGoalRequest,
  CreateGoalResponse,
  GoalListResponse,
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