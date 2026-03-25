import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { getUserById, updateNickname } from '../services/user.service';
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

export const updateProfile = async (
  req: Request,
  res: Response<ApiResponse<UserProfile>>,
) => {
  try {
    const { userId } = req.user!;
    const { nickname } = req.body;

    if (!nickname) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: '닉네임이 주어지지 않았습니다.',
        },
      });
    }

    const updatedUser = await updateNickname(userId, nickname);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '사용자 정보 수정 완료',
      data: updatedUser,
    });
  } catch (err) {
    console.error(`updateUser error: ${err}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};
