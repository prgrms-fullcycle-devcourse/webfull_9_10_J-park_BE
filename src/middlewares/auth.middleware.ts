import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { StatusCodes } from 'http-status-codes';

import prisma from '../config/prisma';
import { generateRandomUsername } from '../utils/nickname.util';

export const authUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    let { token } = req.cookies;

    if (!token) {
      // 쿠키 부여
      const randomUsername = generateRandomUsername();

      const newUser = await prisma.user.create({
        data: {
          nickname: randomUsername,
          updatedAt: new Date(),
        },
      });

      token = jwt.sign({ id: newUser.id }, process.env.JWT_SECRET as string, {
        expiresIn: '7d',
      });

      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      req.user = { userId: newUser.id };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: number;
    };

    req.user = { userId: decoded.id };

    return next();
  } catch (err) {
    console.error('Authenticate Error: ', err);
    res.clearCookie('token');
    return res.status(StatusCodes.UNAUTHORIZED).json();
  }
};
