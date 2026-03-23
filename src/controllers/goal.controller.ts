import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createGoalService } from '../services/goal.service';
import { CreateGoalRequestDto } from '../types/goal.type';

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
      req.body as CreateGoalRequestDto;

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

    if (
      typeof title !== 'string' ||
      typeof categoryId !== 'number' ||
      (description !== undefined && typeof description !== 'string') ||
      typeof targetValue !== 'number' ||
      typeof startDate !== 'string' ||
      typeof endDate !== 'string' ||
      typeof quota !== 'number'
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: '요청 데이터 타입이 올바르지 않습니다.',
        },
      });
    }

    if (title.trim().length === 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'INVALID_TITLE',
          message: '목표 이름은 비어 있을 수 없습니다.',
        },
      });
    }

    if (targetValue <= 0 || quota <= 0) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: '목표 총량과 하루 할당량은 1 이상이어야 합니다.',
        },
      });
    }

    if (quota > targetValue) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'INVALID_QUOTA',
          message: '하루 할당량은 목표 총량보다 클 수 없습니다.',
        },
      });
    }

    const createdGoal = await createGoalService(user.userId, {
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
      message: '목표 생성 완료',
      data: createdGoal,
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
            message: '해당 카테고리를 찾을 수 없습니다.',
          },
        });
      }

      if (error.message === 'INVALID_DATE') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'INVALID_DATE',
            message: '날짜 형식이 올바르지 않습니다.',
          },
        });
      }

      if (error.message === 'INVALID_DATE_RANGE') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: '종료일은 시작일보다 빠를 수 없습니다.',
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