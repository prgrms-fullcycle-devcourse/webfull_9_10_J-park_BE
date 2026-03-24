import { Request, Response } from 'express';
import { ApiResponse } from '../types/response';
import {
  getMyRank,
  getTopRanks,
  getUserRankings,
} from '../services/ranking.service';
import { StatusCodes } from 'http-status-codes';

export const getRanks = async (req: Request, res: Response<ApiResponse>) => {
  const userId = req.user!.userId;
  const page = Number(req.query.page as string) || 1;
  const limit = Number(req.query.limit as string) || 30;

  try {
    const [myRanking, topRankings, rankings] = await Promise.all([
      getMyRank(userId),
      getTopRanks(),
      getUserRankings(page, limit),
    ]);

    const skip = (page - 1) * limit;
    const ranks = rankings.map((user, index) => ({
      ...user,
      rank: skip + index + 1,
    }));

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '전체 랭킹',
      data: {
        myRanking,
        topRankings,
        ranks,
      },
    });
  } catch (err) {
    console.error(`Get Ranks Error: ${err}`);
  }
};
