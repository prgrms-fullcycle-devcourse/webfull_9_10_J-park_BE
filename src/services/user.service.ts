import prisma from '../config/prisma';
import { User, UserProfileResponse } from '../types/user.type';
import { formatDateString } from '../utils/time.util';

const mapToUserResponse = (user: User) => {
  const dateString = formatDateString(user.createdAt);

  return {
    userId: user.id,
    nickname: user.nickname,
    profileImageUrl: user.profileImageUrl,
    totalTime: user.totalTime,
    goals: user.goals.map(({ quota, ...rest }) => ({
      ...rest,
      todayQuota: quota,
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
    throw new Error('USER_NOT_FOUND');
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
