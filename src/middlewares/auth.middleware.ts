import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.user = {
    id: 1,
    nickname: 'testUser',
  };

  next();
};