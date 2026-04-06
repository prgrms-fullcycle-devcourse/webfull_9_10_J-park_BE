import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { AppError } from '../errors/app.error';
import { ApiResponse } from '../types/response';

import { getUserById, updateNickname } from '../services/user.service';
import { UserProfileResponse } from '../types/user.type';

export const getMe = async (
  req: Request,
  res: Response<ApiResponse<UserProfileResponse>>,
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

    const appError =
      err instanceof AppError ? err : new AppError('INTERNAL_SERVER_ERROR');

    return res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
      },
    });
  }
};

export const updateProfile = async (
  req: Request,
  res: Response<ApiResponse<UserProfileResponse>>,
) => {
  try {
    const { userId } = req.user!;
    const { name } = req.body;

    if (!name) {
      throw new AppError('MISSING_NICKNAME');
    }

    const updatedUser = await updateNickname(userId, name);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '사용자 정보 수정 완료',
      data: updatedUser,
    });
  } catch (err) {
    console.error(`updateUser error: ${err}`);

    const appError =
      err instanceof AppError ? err : new AppError('INTERNAL_SERVER_ERROR');

    return res.status(appError.statusCode).json({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
      },
    });
  }
};
