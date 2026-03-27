import prisma from '../../src/config/prisma';
import { getGoalDetailService } from '../../src/services/goal.service';

jest.mock('../../src/config/prisma', () => ({
  __esModule: true,
  default: {
    goal: {
      findFirst: jest.fn(),
    },
    goalLog: {
      findMany: jest.fn(),
    },
    timerLog: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
  },
}));

jest.mock('../../src/utils/goal.util', () => ({
  addDays: jest.fn((date: Date, days: number) => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
  }),
  calculateDaysRemaining: jest.fn(() => 10),
  calculateProgressRate: jest.fn(() => 50),
  formatDate: jest.fn((date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }),
  getDateRange: jest.fn(() => [
    new Date('2026-03-27'),
    new Date('2026-03-28'),
  ]),
  isValidDateString: jest.fn(() => true),
  toEndOfDay: jest.fn((date: Date) => new Date(date.setHours(23, 59, 59, 999))),
  toStartOfDay: jest.fn((date: Date) => new Date(date.setHours(0, 0, 0, 0))),
}));

describe('getGoalDetailService', () => {
  const mockGoalFindFirst = prisma.goal.findFirst as jest.Mock;
  const mockGoalLogFindMany = prisma.goalLog.findMany as jest.Mock;
  const mockTimerLogFindMany = prisma.timerLog.findMany as jest.Mock;
  const mockTimerLogAggregate = prisma.timerLog.aggregate as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('목표가 없으면 GOAL_NOT_FOUND 에러를 던진다', async () => {
    mockGoalFindFirst.mockResolvedValue(null);

    await expect(
      getGoalDetailService({
        userId: 1,
        goalId: 999,
        startDate: '2026-03-20',
        endDate: '2026-03-30',
      }),
    ).rejects.toThrow('GOAL_NOT_FOUND');
  });

  it('정상적으로 개별 목표 상세 정보를 반환한다', async () => {
    mockGoalFindFirst.mockResolvedValue({
      id: 1,
      userId: 1,
      categoryId: 1,
      title: '독서 목표',
      description: '하루 10페이지 읽기',
      quota: 10,
      currentValue: 50,
      targetValue: 100,
      startDate: new Date('2026-03-20'),
      endDate: new Date('2026-04-10'),
      createdAt: new Date(),
      updatedAt: new Date(),
      category: {
        id: 1,
        userId: 1,
        name: '책',
        unit: '페이지',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as any);

    mockGoalLogFindMany.mockResolvedValue([
      {
        id: 1,
        goalId: 1,
        userId: 1,
        achievedAt: new Date('2026-03-27'),
        actualValue: 8,
        targetValue: 10,
        createdAt: new Date(),
      },
    ] as any);

    mockTimerLogFindMany.mockResolvedValue([
      {
        id: 1,
        goalId: 1,
        timerDate: new Date('2026-03-27'),
        durationSec: 1200,
        createdAt: new Date(),
      },
    ] as any);

    mockTimerLogAggregate.mockResolvedValue({
      _sum: {
        durationSec: 3600,
      },
    } as any);

    const result = await getGoalDetailService({
      userId: 1,
      goalId: 1,
      startDate: '2026-03-20',
      endDate: '2026-03-30',
    });

    expect(mockGoalFindFirst).toHaveBeenCalledWith({
      where: {
        id: 1,
        userId: 1,
      },
      include: {
        category: true,
      },
    });

expect(result).toEqual({
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
    daysRemaining: 10,
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
    {
      date: '2026-03-28',
      targetAmount: 10,
      completedAmount: 0,
      isCompleted: false,
      studyTime: 0,
      isToday: false,
        },
      ],
    });
  });

  it('timerDate가 null인 경우 studyTime은 0으로 처리된다', async () => {
    mockGoalFindFirst.mockResolvedValue({
      id: 1,
      userId: 1,
      categoryId: 1,
      title: '독서 목표',
      description: '하루 10페이지 읽기',
      quota: 10,
      currentValue: 50,
      targetValue: 100,
      startDate: new Date('2026-03-20'),
      endDate: new Date('2026-04-10'),
      createdAt: new Date(),
      updatedAt: new Date(),
      category: {
        id: 1,
        userId: 1,
        name: '책',
        unit: '페이지',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    } as any);

    mockGoalLogFindMany.mockResolvedValue([]);
    mockTimerLogFindMany.mockResolvedValue([
      {
        id: 1,
        goalId: 1,
        timerDate: null,
        durationSec: 1200,
        createdAt: new Date(),
      },
    ] as any);

    mockTimerLogAggregate.mockResolvedValue({
      _sum: {
        durationSec: 1200,
      },
    } as any);

    const result = await getGoalDetailService({
      userId: 1,
      goalId: 1,
      startDate: '2026-03-20',
      endDate: '2026-03-30',
    });

    expect(result.dailyProgress[0].studyTime).toBe(0);
  });
});