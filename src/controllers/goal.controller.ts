import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createGoalService, getGoalListService } from '../services/goal.service';
import { CreateGoalRequest } from '../types/goal.type';

/**
 * 목표 생성 컨트롤러
 */
export const createGoalController = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 토큰입니다.',
        },
      });
    }

    const { title, categoryId, description, targetValue, startDate, endDate, quota } =
      req.body as CreateGoalRequest;

    if (
      !title ||
      categoryId === undefined ||
      targetValue === undefined ||
      !startDate ||
      !endDate ||
      quota === undefined
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: '필수값이 누락되었습니다.',
        },
      });
    }

    const result = await createGoalService(user.userId, {
      title,
      categoryId,
      description,
      targetValue,
      startDate,
      endDate,
      quota,
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: '목표 생성 성공',
      data: result,
    });
  } catch (error) {
    console.error('createGoalController error:', error);

    if (error instanceof Error) {
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: '사용자를 찾을 수 없습니다.',
          },
        });
      }

      if (error.message === 'CATEGORY_NOT_FOUND') {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: '카테고리를 찾을 수 없습니다.',
          },
        });
      }

      if (error.message === 'INVALID_DATE') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'INVALID_DATE',
            message: '유효하지 않은 날짜 형식입니다.',
          },
        });
      }

      if (error.message === 'INVALID_DATE_RANGE') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: '시작일은 종료일보다 늦을 수 없습니다.',
          },
        });
      }
    }

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};

/**
 * 전체 목표 리스트 조회 컨트롤러
 */
export const getGoalListController = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 토큰입니다.',
        },
      });
    }

    const result = await getGoalListService(user.userId);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '전체 목표 리스트',
      data: result,
    });
  } catch (error) {
    console.error('getGoalListController error:', error);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};