import { createGoalService } from '../../src/services/goal.service';
import prisma from '../../src/config/prisma';
import { isValidDateString } from '../../src/utils/goal.util';

jest.mock('../../src/config/prisma', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    goal: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../../src/utils/goal.util', () => ({
  isValidDateString: jest.fn(),
}));

describe('createGoalService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('사용자가 없으면 USER_NOT_FOUND를 던진다', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      createGoalService(1, {
        title: '목표 1',
        categoryId: 1,
        detail: '설명',
        totalAmount: 100,
        startDate: '2026-03-27',
        endDate: '2026-03-30',
      }),
    ).rejects.toThrow('USER_NOT_FOUND');
  });

  it('카테고리가 없으면 CATEGORY_NOT_FOUND를 던진다', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      nickname: 'tester',
    });

    (prisma.category.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(
      createGoalService(1, {
        title: '목표 1',
        categoryId: 1,
        detail: '설명',
        totalAmount: 100,
        startDate: '2026-03-27',
        endDate: '2026-03-30',
      }),
    ).rejects.toThrow('CATEGORY_NOT_FOUND');
  });

  it('날짜 형식이 잘못되면 INVALID_DATE를 던진다', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      nickname: 'tester',
    });

    (prisma.category.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      userId: 1,
      name: '공부',
    });

    (isValidDateString as jest.Mock).mockReturnValue(false);

    await expect(
      createGoalService(1, {
        title: '목표 1',
        categoryId: 1,
        detail: '설명',
        totalAmount: 100,
        startDate: 'invalid-date',
        endDate: '2026-03-30',
      }),
    ).rejects.toThrow('INVALID_DATE');
  });

  it('시작일이 종료일보다 늦으면 INVALID_DATE_RANGE를 던진다', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      nickname: 'tester',
    });

    (prisma.category.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      userId: 1,
      name: '공부',
    });

    (isValidDateString as jest.Mock).mockReturnValue(true);

    await expect(
      createGoalService(1, {
        title: '목표 1',
        categoryId: 1,
        detail: '설명',
        totalAmount: 100,
        startDate: '2026-03-31',
        endDate: '2026-03-30',
      }),
    ).rejects.toThrow('INVALID_DATE_RANGE');
  });

  it('정상적으로 목표를 생성하고 nickname을 포함해 반환한다', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      nickname: 'tester',
    });

    (prisma.category.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      userId: 1,
      name: '공부',
    });

    (isValidDateString as jest.Mock).mockReturnValue(true);

    (prisma.goal.create as jest.Mock).mockResolvedValue({
      id: 1,
      title: '목표 1',
      categoryId: 1,
      status: 'active',
      currentValue: 0,
      targetValue: 100,
      quota: 25,
    });

    const result = await createGoalService(1, {
      title: '목표 1',
      categoryId: 1,
      detail: '설명',
      totalAmount: 100,
      startDate: '2026-03-27',
      endDate: '2026-03-30',
    });

    expect(prisma.goal.create).toHaveBeenCalledWith({
      data: {
        userId: 1,
        categoryId: 1,
        title: '목표 1',
        description: '설명',
        status: 'active',
        startDate: new Date('2026-03-27'),
        endDate: new Date('2026-03-30'),
        currentValue: 0,
        targetValue: 100,
        quota: 25,
      },
      select: {
        id: true,
        title: true,
        categoryId: true,
        status: true,
        currentValue: true,
        targetValue: true,
        quota: true,
      },
    });

    expect(result).toEqual({
      id: 1,
      title: '목표 1',
      categoryId: 1,
      status: 'active',
      currentValue: 0,
      targetValue: 100,
      quota: 25,
      nickname: 'tester',
    });
  });

  it('quota를 올림 계산한다', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      nickname: 'tester',
    });

    (prisma.category.findFirst as jest.Mock).mockResolvedValue({
      id: 1,
      userId: 1,
      name: '공부',
    });

    (isValidDateString as jest.Mock).mockReturnValue(true);

    (prisma.goal.create as jest.Mock).mockResolvedValue({
      id: 2,
      title: '목표 2',
      categoryId: 1,
      status: 'active',
      currentValue: 0,
      targetValue: 10,
      quota: 4,
    });

    const result = await createGoalService(1, {
      title: '목표 2',
      categoryId: 1,
      detail: '설명',
      totalAmount: 10,
      startDate: '2026-03-27',
      endDate: '2026-03-29',
    });

    expect(prisma.goal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          quota: 4,
        }),
      }),
    );

    expect(result.quota).toBe(4);
  });
});