import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.user = {
    userId: 1,
    userName: 'testUser',
  };

  next();
};