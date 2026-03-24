import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ApiResponse } from '../types/response';
import {
  getMyRank,
  getTopRanks,
  getUserRankings,
} from '../services/ranking.service';
import { formatMSToTimeString } from '../utils/time.util';

export const getRanks = async (
  req: Request,
  res: Response<ApiResponse<RankResult>>,
) => {
  const userId = req.user!.userId;
  const page = Number(req.query.page as string) || 1;
  const limit = Number(req.query.limit as string) || 30;

  try {
    const [myRankData, topRankData, paginatedRankData] = await Promise.all([
      getMyRank(userId),
      getTopRanks(),
      getUserRankings(page, limit),
    ]);

    const skip = (page - 1) * limit;

    // 내 순위 정보
    const myRanking = myRankData ?? { myRanking: 0 };

    // 전체 랭킹 리스트
    const rankingList = paginatedRankData.map((user, index) => ({
      ...user,
      rank: skip + index + 1,
      totalTime: formatMSToTimeString(user.totalTime),
    }));

    // 상위 랭커
    const topThree = topRankData.map((user, index) => ({
      ...user,
      rank: index + 1,
      totalTime: formatMSToTimeString(user.totalTime),
    }));

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
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};
