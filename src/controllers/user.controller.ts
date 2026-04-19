import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

import { AppError } from '../errors/app.error';
import { ApiResponse } from '../types/response';

import { authCookieOptions } from '../middlewares/auth.middleware';
import {
  createKakaoUser,
  deleteAnonymousUser,
  getKakaoAuthInfo,
  getKakaoAuthToken,
  getKakaoEmail,
  getUser,
  getUserByEmail,
  updateNickname,
  updateProfileImageKey,
} from '../services/user.service';
import { UserProfileResponse } from '../types/user.type';

export const getMe = async (
  req: Request,
  res: Response<ApiResponse<UserProfileResponse>>,
) => {
  const { userId, isLoggedIn } = req.user!;

  try {
    const user = await getUser(userId, isLoggedIn);

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

export const updateProfile = async (req: Request, res: Response) => {
  const { userId } = req.user!;

  try {
    const { name: newNickname } = req.body;
    const imgFile = req.file;

    if ((newNickname && imgFile) || (!newNickname && !imgFile)) {
      throw new AppError('BAD_REQUEST');
    }

    if (newNickname) {
      try {
        const updatedNickname = await updateNickname(userId, newNickname);

        return res.status(StatusCodes.OK).json({
          success: true,
          message: '사용자 닉네임 수정 완료',
          data: updatedNickname,
        });
      } catch (err) {
        console.error(`Nickname update error: ${err}`);

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
    }

    if (imgFile) {
      try {
        const newFileKey = (imgFile as Express.MulterS3.File).key;

        const updatedProfileImageUrl = await updateProfileImageKey(
          userId,
          newFileKey,
        );

        return res.status(StatusCodes.OK).json({
          success: true,
          message: '사용자 프로필 이미지 수정 완료',
          data: updatedProfileImageUrl,
        });
      } catch (err) {
        console.error(`profile image upload error: ${err}`);

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
    }
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

export const startKakaoLogin = (req: Request, res: Response) => {
  const { state, url } = getKakaoAuthInfo();

  res.cookie('kakao_state', state, {
    // sameSite: 'none',
    // secure: process.env.NODE_ENV === 'production',
    // httpOnly: true,
    maxAge: 5 * 60 * 1000,
  });

  return res.redirect(url);
};

export const finishKakaoLogin = async (
  req: Request,
  res: Response<ApiResponse>,
) => {
  const { code, state } = req.query;
  const { kakao_state: kakaoState } = req.cookies;

  // State 검증 후 쿠키 삭제
  if (!state || state != kakaoState) {
    throw new AppError('INVALID_STATE');
  }
  res.clearCookie('kakao_state');

  try {
    const tokenRequest = await getKakaoAuthToken(code as string);

    if ('access_token' in tokenRequest) {
      const email = await getKakaoEmail(tokenRequest);

      if (!email) {
        // 이메일 권한이 없거나 선택하지 않은 경우
        throw new AppError('EMAIL_REQUIRED');
      }

      // 사용자 확인 및 생성
      const anonymousId = req.user?.userId;
      let user = await getUserByEmail(email);
      if (!user) {
        if (!anonymousId) {
          throw new AppError('USER_NOT_FOUND'); // ANONYMOUS ID NOT FOUND
        }

        user = await createKakaoUser(email, anonymousId);
      } else {
        // 익명 사용자의 데이터는? 추가(갱신), 삭제
        // 이미 기존에 로그인했던 사용자라면 익명 사용자 삭제
        await deleteAnonymousUser(anonymousId as number, user.id);
      }

      const token = jwt.sign(
        { id: user.id, type: 'authorized' },
        process.env.JWT_SECRET!,
        {
          expiresIn: '7d',
        },
      );

      res.cookie('token', token, authCookieOptions);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: '카카오 로그인 완료',
        data: null,
      });
    } else {
      // 카카오 API에서 토큰 요청 실패
      throw new AppError('KAKAO_SERVER_ERROR'); // KAKAO_API_ERROR
    }
  } catch (err) {
    console.error('KAKAO LOGIN ERR: ', err);

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

export const logout = async (
  req: Request,
  res: Response<ApiResponse>,
  next: NextFunction,
) => {
  const { isLoggedIn } = req.user!;

  if (!isLoggedIn) {
    return next(new AppError('NOT_LOGGED_IN'));
  }

  try {
    res.clearCookie('token', {
      ...authCookieOptions,
      maxAge: 0,
      expires: new Date(0),
    });

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '로그아웃 완료',
      data: null,
    });
  } catch (err) {
    console.error(`Logout Err: ${err}`);
    return next(new AppError('INTERNAL_SERVER_ERROR'));
  }
};
