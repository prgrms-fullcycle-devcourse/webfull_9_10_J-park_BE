import prisma from '../config/prisma';
import { UserProfile } from '../types/user.type';

export const getUserById = async (userId: number): Promise<UserProfile> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      profile_image_url: true,
      total_time: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return user;
};
