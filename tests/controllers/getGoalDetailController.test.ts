import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import { getGoalDetailController } from '../../src/controllers/goal.controller';
import { getGoalDetailService } from '../../src/services/goal.service';

jest.mock('../../src/services/goal.service', () => ({
  getGoalDetailService: jest.fn(),
}));

const mockedGetGoalDetailService = getGoalDetailService as jest.Mock;

describe('getGoalDetailController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      user: { userId: 1 },
      params: { goalId: '1' },
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it('인증되지 않은 사용자인 경우 401을 반환한다', async () => {
    req.user = undefined;

    await getGoalDetailController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.UNAUTHORIZED);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: '유효하지 않은 토큰입니다.',
      },
    });
  });

  it('goalId가 숫자가 아니면 400을 반환한다', async () => {
    req.params = { goalId: 'abc' };

    await getGoalDetailController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: '유효한 goalId가 필요합니다.',
      },
    });
  });

  it('startDate 형식이 잘못되면 400을 반환한다', async () => {
    req.query = { startDate: '2026/03/27' };

    await getGoalDetailController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'startDate 형식은 YYYY-MM-DD 이어야 합니다.',
      },
    });
  });

  it('endDate 형식이 잘못되면 400을 반환한다', async () => {
    req.query = { endDate: '03-27-2026' };

    await getGoalDetailController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'endDate 형식은 YYYY-MM-DD 이어야 합니다.',
      },
    });
  });

  it('정상 요청이면 200과 데이터를 반환한다', async () => {
    const mockData = {
      id: 1,
      title: '독서 목표',
      description: '하루 10페이지 읽기',
      category: '책',
      progress: {
        rate: 50,
        currentAmount: 50,
        targetAmount: 100,
        totalStudyTime: 3600,
        unit: '페이지',
      },
      period: {
        startDate: '2026-03-20',
        endDate: '2026-04-10',
        daysRemaining: 14,
      },
      dailyProgress: [
        {
          date: '2026-03-27',
          targetAmount: 10,
          completedAmount: 8,
          isCompleted: false,
          studyTime: 1200,
          isToday: true,
        },
      ],
    };

    mockedGetGoalDetailService.mockResolvedValue(mockData);

    req.query = {
      startDate: '2026-03-20',
      endDate: '2026-04-10',
    };

    await getGoalDetailController(req as Request, res as Response);

    expect(mockedGetGoalDetailService).toHaveBeenCalledWith({
      userId: 1,
      goalId: 1,
      startDate: '2026-03-20',
      endDate: '2026-04-10',
    });

    expect(res.status).toHaveBeenCalledWith(StatusCodes.OK);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: '개별 목표 상세 정보',
      data: mockData,
    });
  });

  it('서비스에서 GOAL_NOT_FOUND 에러가 나면 404를 반환한다', async () => {
    mockedGetGoalDetailService.mockRejectedValue(new Error('GOAL_NOT_FOUND'));

    await getGoalDetailController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.NOT_FOUND);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'GOAL_NOT_FOUND',
        message: '해당 목표를 찾을 수 없습니다.',
      },
    });
  });

  it('서비스에서 INVALID_DATE_RANGE 에러가 나면 400을 반환한다', async () => {
    mockedGetGoalDetailService.mockRejectedValue(new Error('INVALID_DATE_RANGE'));

    await getGoalDetailController(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(StatusCodes.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'startDate는 endDate보다 늦을 수 없습니다.',
      },
    });
  });

  it('예상치 못한 에러가 발생하면 500을 반환한다', async () => {
    mockedGetGoalDetailService.mockRejectedValue(new Error('UNKNOWN_ERROR'));

    await getGoalDetailController(req as Request, res as Response);

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