import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { AppError } from '../errors/app.error';
import { ApiResponse } from '../types/response';

import {
  getMyRank,
  getTopRanks,
  getUserRankings,
} from '../services/ranking.service';
import { RankResult } from '../types/ranking.type';

export const getRanks = async (
  req: Request,
  res: Response<ApiResponse<RankResult>>,
) => {
  const userId = req.user!.userId;
  const page = Number(req.query.page as string) || 1;
  const limit = Number(req.query.limit as string) || 30;

  try {
    const [myRanking, topThree, rankingList] = await Promise.all([
      getMyRank(userId),
      getTopRanks(),
      getUserRankings(page, limit),
    ]);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '전체 랭킹',
      data: {
        myRanking,
        topRankings: topThree,
        ranks: rankingList,
      },
    });
  } catch (err) {
    console.error(`Get Ranks Error: ${err}`);

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
