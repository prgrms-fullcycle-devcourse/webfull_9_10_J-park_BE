import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ApiResponse } from '../types/response';
import { Category } from '../types/category.type';
import { getAllCategories } from '../services/category.service';

export const readCategories = async (
  req: Request,
  res: Response<ApiResponse<Category[]>>,
) => {
  try {
    const allCategories = await getAllCategories();

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '카테고리 목록',
      data: allCategories,
    });
  } catch (err) {
    console.error(`에러 발생: ${err}`);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};
