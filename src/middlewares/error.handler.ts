import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

import { AppError } from '../errors/app.error';

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(' [Error Log]:', err.stack); // 에러 로그 확인용

  const statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || '서버 내부에서 에러가 발생했습니다.';

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
};
