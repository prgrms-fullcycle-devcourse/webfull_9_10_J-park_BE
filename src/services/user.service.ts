import prisma from '../config/prisma';

import { AppError } from '../errors/app.error';

import { KakaoTokenResponse, KakaoUserResponse } from '../types/auth.type';
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

export const getUserByEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
    },
  });

  return user;
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

export const getKakaoAuthInfo = () => {
  const baseUrl = 'https://kauth.kakao.com/oauth/authorize';
  const state = Math.random().toString(36).substring(2, 15);

  const config = {
    client_id: process.env.KT_CLIENT!,
    redirect_uri: `${process.env.URL}/users/kakao/finish`,
    response_type: 'code',
    scope: 'profile_nickname,account_email',
    state,
  };
  const params = new URLSearchParams(config).toString();
  const url = `${baseUrl}?${params}`;

  return { state, url };
};

export const getKakaoAuthToken = async (
  code: string,
): Promise<KakaoTokenResponse> => {
  const baseUrl = 'https://kauth.kakao.com/oauth/token';
  const config = {
    grant_type: 'authorization_code',
    client_id: process.env.KT_CLIENT!,
    client_secret: process.env.KT_CLIENT_SECRET!,
    redirect_uri: `${process.env.URL}/users/kakao/finish`,
    code: code as string,
  };
  const params = new URLSearchParams(config).toString();
  const url = `${baseUrl}?${params}`;

  try {
    // Access Token 요청
    const tokenRequest = await (
      await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json;charset=UTF-8',
        },
      })
    ).json();
    return tokenRequest;
  } catch (err) {
    console.error(`Kakao Auth Token Err: ${err}`);
    throw new AppError('INTERNAL_SERVER_ERROR'); // KAKAO ERROR
  }
};

export const getKakaoEmail = async (
  tokenRequest: KakaoTokenResponse,
): Promise<string | undefined> => {
  const { access_token: accessToken } = tokenRequest;
  const apiUrl = 'https://kapi.kakao.com/v2/user/me';

  // 사용자 정보 요청
  const userData: KakaoUserResponse = await (
    await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
    })
  ).json();

  const email =
    userData.kakao_account.is_email_valid &&
    userData.kakao_account.is_email_verified
      ? userData.kakao_account.email
      : undefined;

  return email;
};

export const createKakaoUser = async (email: string, anonymousId: number) => {
  // create an account with KakaoTalk info
  const user = await prisma.user.update({
    where: { id: anonymousId },
    data: {
      email,
      // nickname: userData.kakao_account.profile['nickname'],
      password: null,
      // socialLogin: true,
    },
    select: { id: true },
  });

  return user;
};

export const deleteAnonymousUser = async (
  anonymousId: number,
  userId: number,
) => {
  if (anonymousId && anonymousId != userId) {
    await prisma.user
      .delete({
        where: { id: anonymousId },
      })
      .catch(() => {
        console.error('Failed to delete anonymous user');
      });
  }
};
