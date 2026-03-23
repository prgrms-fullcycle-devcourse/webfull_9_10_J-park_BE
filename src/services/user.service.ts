import prisma from '../config/prisma';
import { UserProfile } from '../types/user.type';

export const getUserById = async (userId: number): Promise<UserProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      profileImageUrl: true,
      totalTime: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return user;
};
