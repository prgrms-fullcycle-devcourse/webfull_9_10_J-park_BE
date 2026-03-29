import { CookieOptions, NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import jwt from 'jsonwebtoken';

import prisma from '../config/prisma';
import { generateRandomUsername } from '../utils/nickname.util';

const authCookieOptions: CookieOptions = {
  sameSite: 'none',
  secure: true,
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

/**
 * 인증 미들웨어 (익명 사용자 자동 생성 포함)
 *
 * 동작 방식:
 * 1. 쿠키에 토큰이 없으면 → 익명 사용자 생성 후 JWT 발급
 * 2. 토큰이 있으면 → JWT 검증 후 사용자 조회 (3일안에 토큰이 만료될 경우 7일로 갱신)
 * 3. req.user에 사용자 정보 주입 후 다음 로직으로 이동
 */
export const authUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let { token } = req.cookies;

    //토큰이 없는경우 (첫 방문자) -> 익명 사용자 생성
    if (!token) {
      const randomUsername = generateRandomUsername();

      const newUser = await prisma.user.create({
        data: {
          nickname: randomUsername,
          updatedAt: new Date(),
        },
      });
      /**
       * JWT 생성
       * payload: 사용자 id
       */
      token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET as string, {
        expiresIn: '7d',
      });

      //쿠키에 토큰 저장
      res.cookie('token', token, authCookieOptions);

      req.user = { userId: newUser.id };
    } else {
      /**
       * 토큰이 있는 경우
       * → JWT 검증
       */
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
        id: number;
        exp: number; // 토큰의 만료 시간(초)
      };

      // 사용자 검증 단계
      const userExists = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true },
      });
      if (!userExists) {
        throw new Error('User not Found');
      }

      const currentTime = Math.floor(Date.now() / 1000);

      if (decoded.exp - currentTime < 3 * 24 * 60 * 60) {
        const newToken = jwt.sign(
          { id: decoded.id },
          process.env.JWT_SECRET as string,
          { expiresIn: '7d' },
        );

        res.cookie('token', newToken, authCookieOptions);
      }

      req.user = { userId: decoded.id };
    }

    return next();
  } catch (err) {
    console.error('Authenticate Error: ', err);
    //토큰 문제 말생 시 쿠키 제거
    res.clearCookie('token');

    return res.status(StatusCodes.UNAUTHORIZED).json();
  }
};
