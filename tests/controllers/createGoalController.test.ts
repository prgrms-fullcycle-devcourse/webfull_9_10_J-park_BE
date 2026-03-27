import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { createGoalController } from '../../src/controllers/goal.controller';
import { createGoalService } from '../../src/services/goal.service';

jest.mock('../../src/services/goal.service', () => ({
  createGoalService: jest.fn(),
}));

const mockedCreateGoalService = createGoalService as jest.MockedFunction<
  typeof createGoalService
>;

describe('createGoalController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it('유저 정보가 없으면 401을 반환한다', async () => {
    req.user = undefined;

    await createGoalController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '유효하지 않은 토큰입니다.',
      },
    });
  });

  it('필수값이 누락되면 400을 반환한다', async () => {
    req.user = { userId: 1 };
    req.body = {
      title: '목표 1',
      categoryId: 1,
      // detail 누락
      totalAmount: 100,
      startDate: '2026-03-27',
      endDate: '2026-03-30',
    };

    await createGoalController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: '필수값이 누락되었습니다.',
      },
    });
  });

  it('목표 생성 성공 시 201을 반환한다', async () => {
    req.user = { userId: 1 };
    req.body = {
      title: '목표 1',
      categoryId: 1,
      detail: '설명',
      totalAmount: 100,
      startDate: '2026-03-27',
      endDate: '2026-03-30',
    };

    mockedCreateGoalService.mockResolvedValue({
      id: 1,
      title: '목표 1',
      categoryId: 1,
      status: 'active',
      currentValue: 0,
      targetValue: 100,
      quota: 25,
      nickname: 'tester',
    });

    await createGoalController(req as Request, res as Response);

    expect(mockedCreateGoalService).toHaveBeenCalledWith(1, {
      title: '목표 1',
      categoryId: 1,
      detail: '설명',
      totalAmount: 100,
      startDate: '2026-03-27',
      endDate: '2026-03-30',
    });

    expect(res.status).toHaveBeenCalledWith(StatusCodes.CREATED);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: '목표 생성 완료',
      data: {
        id: 1,
        title: '목표 1',
        categoryId: 1,
        status: 'active',
        currentValue: 0,
        targetValue: 100,
        quota: 25,
        nickname: 'tester',
      },
    });
  });

  it('USER_NOT_FOUND 에러면 404를 반환한다', async () => {
    req.user = { userId: 1 };
    req.body = {
      title: '목표 1',
      categoryId: 1,
      detail: '설명',
      totalAmount: 100,
      startDate: '2026-03-27',
      endDate: '2026-03-30',
    };

    mockedCreateGoalService.mockRejectedValue(new Error('USER_NOT_FOUND'));

    await createGoalController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.',
      },
    });
  });

  it('CATEGORY_NOT_FOUND 에러면 404를 반환한다', async () => {
    req.user = { userId: 1 };
    req.body = {
      title: '목표 1',
      categoryId: 1,
      detail: '설명',
      totalAmount: 100,
      startDate: '2026-03-27',
      endDate: '2026-03-30',
    };

    mockedCreateGoalService.mockRejectedValue(new Error('CATEGORY_NOT_FOUND'));

    await createGoalController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'CATEGORY_NOT_FOUND',
        message: '카테고리를 찾을 수 없습니다.',
      },
    });
  });

  it('INVALID_DATE 에러면 400을 반환한다', async () => {
    req.user = { userId: 1 };
    req.body = {
      title: '목표 1',
      categoryId: 1,
      detail: '설명',
      totalAmount: 100,
      startDate: 'invalid-date',
      endDate: '2026-03-30',
    };

    mockedCreateGoalService.mockRejectedValue(new Error('INVALID_DATE'));

    await createGoalController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INVALID_DATE',
        message: '유효하지 않은 날짜 형식입니다.',
      },
    });
  });

  it('INVALID_DATE_RANGE 에러면 400을 반환한다', async () => {
    req.user = { userId: 1 };
    req.body = {
      title: '목표 1',
      categoryId: 1,
      detail: '설명',
      totalAmount: 100,
      startDate: '2026-03-31',
      endDate: '2026-03-30',
    };

    mockedCreateGoalService.mockRejectedValue(new Error('INVALID_DATE_RANGE'));

    await createGoalController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INVALID_DATE_RANGE',
        message: '시작일은 종료일보다 늦을 수 없습니다.',
      },
    });
  });

  it('알 수 없는 에러면 500을 반환한다', async () => {
    req.user = { userId: 1 };
    req.body = {
      title: '목표 1',
      categoryId: 1,
      detail: '설명',
      totalAmount: 100,
      startDate: '2026-03-27',
      endDate: '2026-03-30',
    };

    mockedCreateGoalService.mockRejectedValue(new Error('UNKNOWN_ERROR'));

    await createGoalController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  });
});