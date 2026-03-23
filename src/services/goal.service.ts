import prisma from '../config/prisma';
import {
  CreateGoalRequestDto,
  CreateGoalResponseDto,
} from '../types/goal.type';

/**
 * 목표 생성 서비스
 * @param userId - 인증된 사용자 ID (JWT에서 추출)
 * @param payload - 목표 생성 요청 데이터
 */

export const createGoalService = async (
  userId: number,
  payload: CreateGoalRequestDto
): Promise<CreateGoalResponseDto> => {
  // 요청 body에서 필요한 값 추출
  const { title, categoryId, description, targetValue, startDate, endDate, quota } = payload;
  
  /**
  * 1. 사용자 존재 여부 확인
  * - JWT는 유효하지만 DB에 사용자가 없을 수도 있기 때문에 검증
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
   * 2. 카테고리 검증
   * - 해당 사용자의 카테고리인지 확인 (보안 중요)
   * - 다른 유저의 categoryId를 사용하지 못하게 막는 로직
   */
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId, // 반드시 본인 소유 카테고리여야 함
    },
  });

  if (!category) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  /**
   * 3. 날짜 검증
   * - 문자열 → Date 객체 변환
   */
  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  // 유효한 날짜인지 체크
  if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
    throw new Error('INVALID_DATE');
  }

  // 시작일 > 종료일이면 잘못된 범위
  if (parsedStartDate > parsedEndDate) {
    throw new Error('INVALID_DATE_RANGE');
  }

   /**
   * 4. 목표 생성
   */
  const createdGoal = await prisma.goal.create({
    data: {
      userId,
      categoryId,
      title,
      description,
      status: 'active',
      startDate: parsedStartDate,
      endDate: parsedEndDate,
      currentValue: 0,
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
   * 5. 응답 데이터 구성
   * - 사용자 nickname 추가
   */
  return {
    ...createdGoal,
    nickname: user.nickname,
  };
};