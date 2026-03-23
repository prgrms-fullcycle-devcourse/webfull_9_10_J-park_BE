import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getUserById } from '../services/user.service';
import { ApiResponse } from '../types/response';
import { UserProfile } from '../types/user.type';

export const getMe = async (
  req: Request,
  res: Response<ApiResponse<UserProfile>>,
) => {
  const userId = req.user!.userId;

  try {
    const user = await getUserById(userId);
    return res.status(StatusCodes.OK).json({
      success: true,
      message: '내 정보 보기',
      data: user,
    });
  } catch (err) {
    console.error(`getMe error: ${err}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};
