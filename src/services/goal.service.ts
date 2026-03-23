import prisma from '../config/prisma';
import {
  CreateGoalRequestDto,
  CreateGoalResponseDto,
} from '../types/goal.type';

export const createGoalService = async (
  userId: number,
  payload: CreateGoalRequestDto
): Promise<CreateGoalResponseDto> => {
  const { title, categoryId, description, targetValue, startDate, endDate, quota } = payload;

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

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
  });

  if (!category) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  const parsedStartDate = new Date(startDate);
  const parsedEndDate = new Date(endDate);

  if (Number.isNaN(parsedStartDate.getTime()) || Number.isNaN(parsedEndDate.getTime())) {
    throw new Error('INVALID_DATE');
  }

  if (parsedStartDate > parsedEndDate) {
    throw new Error('INVALID_DATE_RANGE');
  }

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

  return {
    ...createdGoal,
    nickname: user.nickname,
  };
};