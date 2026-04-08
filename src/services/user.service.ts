import prisma from '../config/prisma';

import { AppError } from '../errors/app.error';

import { User, UserProfileResponse } from '../types/user.type';
import { getQuotasByUser } from '../utils/quota.util';
import { formatDateString } from '../utils/time.util';

const mapToUserResponse = async (user: User) => {
  const dateString = formatDateString(user.createdAt);
  const quotaMap = await getQuotasByUser(user.id);

  return {
    userId: user.id,
    nickname: user.nickname,
    profileImageUrl: user.profileImageUrl,
    totalTime: user.totalTime,
    goals: user.goals.map(({ id, quota, ...rest }) => ({
      ...rest,
      id,
      todayQuota: quotaMap.get(id) ?? quota,
    })),
    createdAt: dateString,
  };
};

export const getUserById = async (
  userId: number,
): Promise<UserProfileResponse> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      profileImageUrl: true,
      totalTime: true,
      goals: {
        select: {
          id: true,
          title: true,
          quota: true,
        },
      },
      createdAt: true,
    },
  });

  if (!user) {
    throw new AppError('USER_NOT_FOUND');
  }

  const userResponse = mapToUserResponse(user);

  return userResponse;
};

export const updateNickname = async (userId: number, newNickname: string) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { nickname: newNickname },
    select: {
      id: true,
      nickname: true,
      profileImageUrl: true,
      totalTime: true,
      goals: {
        select: {
          id: true,
          title: true,
          quota: true,
        },
      },
      createdAt: true,
    },
  });

  const userResponse = mapToUserResponse(user);

  return userResponse;
};
