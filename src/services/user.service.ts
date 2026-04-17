import prisma from '../config/prisma';

import { AppError } from '../errors/app.error';

import { KakaoTokenResponse, KakaoUserResponse } from '../types/auth.type';
import { User, UserProfileResponse } from '../types/user.type';
import { getQuotasByUser } from '../utils/quota.util';
import { deleteFileFromS3 } from '../utils/s3.util';
import { formatDateString } from '../utils/time.util';

import {
  getCache,
  setCache,
  buildCacheKey,
  delCache,
  invalidateRankingCache,
} from '../utils/cache.util';

const getUserProfileCacheKey = (userId: number, isLoggedIn: boolean) =>
  buildCacheKey(
    'lampfire',
    'users',
    'profile',
    userId,
    isLoggedIn ? 'login' : 'anonymous',
  );

const getUserProfileCacheKeys = (userId: number) => [
  getUserProfileCacheKey(userId, true),
  getUserProfileCacheKey(userId, false),
];

/**
 * 사용자 응답 데이터 매핑 함수
 * - createdAt → YYYY-MM-DD 문자열 변환
 * - goals의 quota → 오늘 기준 quota로 변환
 */
const mapToUserResponse = async (
  user: User,
  isLoggedIn: boolean,
): Promise<UserProfileResponse> => {
  const dateString = formatDateString(user.createdAt);
  const quotaMap = await getQuotasByUser(user.id);

  return {
    userId: user.id,
    nickname: user.nickname,
    profileImageUrl: user.profileImageUrl,
    totalTime: user.totalTime,
    loginInfo: {
      isLoggedIn,
      email: user.email,
    },
    goals: user.goals.map(({ id, quota, ...rest }) => ({
      ...rest,
      id,
      todayQuota: quotaMap.get(id) ?? quota,
    })),
    createdAt: dateString,
  };
};

/**
 * 사용자 프로필 캐시 TTL
 * - 너무 길면 데이터 stale 발생
 * - 너무 짧으면 캐시 의미 없음
 * → 10초로 설정 (적절한 타협)
 */
const USER_PROFILE_CACHE_TTL = 10;

/**
 * 사용자 프로필 조회
 *
 * 흐름:
 * 1. 캐시 조회
 * 2. 캐시 없으면 DB 조회
 * 3. 응답 가공 (quota 포함)
 * 4. 캐시 저장
 */
export const getUser = async (
  userId: number,
  isLoggedIn: boolean,
): Promise<UserProfileResponse> => {
  const cacheKey = getUserProfileCacheKey(userId, isLoggedIn);

  // 1. 캐시 조회
  const cached = await getCache<UserProfileResponse>(cacheKey);
  if (cached) {
    return cached;
  }

  // 2. DB 조회
  const user = await getUserById(userId);

  if (!user) {
    throw new AppError('USER_NOT_FOUND');
  }

  // 3. 응답 가공
  const userResponse = await mapToUserResponse(user, isLoggedIn);

  // 4. 캐시 저장
  await setCache(cacheKey, userResponse, USER_PROFILE_CACHE_TTL);

  return userResponse;
};

const getUserById = async (userId: number) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nickname: true,
      email: true,
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

  return user;
};

/**
 * 이메일로 사용자 조회
 * - 로그인 시 사용
 */
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

/**
 * 닉네임 수정
 *
 * 흐름:
 * 1. DB 업데이트
 * 2. 응답 가공
 * 3. 캐시 무효화
 */
export const updateNickname = async (userId: number, newNickname: string) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { nickname: newNickname },
    select: {
      nickname: true,
    },
  });

  const userResponse = { nickname: updatedUser.nickname };

  // 캐시 무효화
  await delCache(getUserProfileCacheKeys(userId));
  await invalidateRankingCache();

  return userResponse;
};

/**
 * 프로필 이미지 수정
 *
 * 흐름:
 * 1. 기존 이미지 조회 (S3 삭제용)
 * 2. 기존 이미지 삭제
 * 3. DB 업데이트
 * 4. 응답 가공
 * 5. 캐시 무효화
 */
export const updateProfileImageUrl = async (
  userId: number,
  newImageUrl: string,
) => {
  // 기존 이미지 확인
  const user = await getUserById(userId);

  if (user.profileImageUrl) {
    // 기존 이미지 S3에서 삭제
    await deleteFileFromS3(user.profileImageUrl);
  }

  // DB 업데이트
  const updatedProfileImageUrl = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      profileImageUrl: newImageUrl,
    },
    select: {
      profileImageUrl: true,
    },
  });

  const response = { profileImageUrl: updatedProfileImageUrl.profileImageUrl };

  // 캐시 무효화
  await delCache(getUserProfileCacheKeys(userId));
  await invalidateRankingCache();

  return response;
};

/**
 * 카카오 로그인 URL 생성
 */
export const getKakaoAuthInfo = () => {
  const baseUrl = 'https://kauth.kakao.com/oauth/authorize';
  const state = Math.random().toString(36).substring(2, 15);

  const redirectUri =
    process.env.NODE_ENV === 'production'
      ? `${process.env.URL}/users/kakao/finish`
      : 'http://localhost:3000/users/kakao/finish';

  const config = {
    client_id: process.env.KT_CLIENT!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'profile_nickname,account_email',
    state,
  };

  const params = new URLSearchParams(config).toString();
  const url = `${baseUrl}?${params}`;

  return { state, url };
};

/**
 * 카카오 토큰 요청
 */
export const getKakaoAuthToken = async (
  code: string,
): Promise<KakaoTokenResponse> => {
  const baseUrl = 'https://kauth.kakao.com/oauth/token';
  const redirectUri =
    process.env.NODE_ENV === 'production'
      ? `${process.env.URL}/users/kakao/finish`
      : 'http://localhost:3000/users/kakao/finish';

  const config = {
    grant_type: 'authorization_code',
    client_id: process.env.KT_CLIENT!,
    client_secret: process.env.KT_CLIENT_SECRET!,
    redirect_uri: redirectUri,
    code: code as string,
  };

  const params = new URLSearchParams(config).toString();
  const url = `${baseUrl}?${params}`;

  try {
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
    throw new AppError('KAKAO_SERVER_ERROR');
  }
};

/**
 * 카카오 이메일 조회
 */
export const getKakaoEmail = async (
  tokenRequest: KakaoTokenResponse,
): Promise<string | undefined> => {
  const { access_token: accessToken } = tokenRequest;
  const apiUrl = 'https://kapi.kakao.com/v2/user/me';

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

/**
 * 카카오 유저 생성
 */
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

/**
 * 익명 유저 삭제
 */
export const deleteAnonymousUser = async (
  anonymousId: number,
  userId: number,
) => {
  if (anonymousId && anonymousId !== userId) {
    await prisma.user
      .delete({
        where: { id: anonymousId },
      })
      .catch(() => {
        console.error('Failed to delete anonymous user');
      });
  }
};
