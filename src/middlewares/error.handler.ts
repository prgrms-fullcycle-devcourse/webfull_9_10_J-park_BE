// src/middlewares/error.handler.ts
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(' [Error Log]:', err.stack); // 에러 로그 확인용

  const statusCode = err.status || StatusCodes.INTERNAL_SERVER_ERROR;
  const message = err.message || '서버 내부에서 에러가 발생했습니다.';

  res.status(statusCode).json({
    success: false,
    message: message,
  });
};
