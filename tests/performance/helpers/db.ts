import prisma from '../../../src/config/prisma';
import { getLocalMidnight } from './date';
import { makeToken } from './request';

type SeedResult = {
  userId: number;
  token: string;
  goalIds: number[];
};

// 테스트 데이터 정리
export const cleanupPerformanceData = async (testPrefix: string) => {
  const testUsers = await prisma.user.findMany({
    where: {
      nickname: {
        startsWith: testPrefix,
      },
    },
    select: {
      id: true,
    },
  });

  const userIds = testUsers.map((user) => user.id);

  if (userIds.length > 0) {
    await prisma.timerLog.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await prisma.goalLog.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await prisma.goal.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await prisma.category.deleteMany({
      where: {
        userId: {
          in: userIds,
        },
      },
    });

    await prisma.user.deleteMany({
      where: {
        id: {
          in: userIds,
        },
      },
    });
  }
};

// 성능용 데이터 시드
export const seedPerformanceData = async (
  goalCount: number,
  goalLogCount: number,
  timerLogCount: number,
  testPrefix: string,
): Promise<SeedResult> => {
  const user = await prisma.user.create({
    data: {
      nickname: `${testPrefix}_USER`,
      totalTime: 0,
    },
  });

  const category = await prisma.category.create({
    data: {
      userId: user.id,
      name: `${testPrefix}_CATEGORY`,
      unit: '시간',
    },
  });

  const goalData = Array.from({ length: goalCount }).map((_, i) => ({
    userId: user.id,
    categoryId: category.id,
    title: `${testPrefix}_GOAL_${i}`,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    quota: 100 % 7,
    currentValue: i,
    targetValue: 100,
  }));

  await prisma.goal.createMany({
    data: goalData,
  });

  const goals = await prisma.goal.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  const goalIds = goals.map((goal) => goal.id);

  const midnight = getLocalMidnight();

  // goalLog 생성
  const goalLogData = Array.from({ length: goalLogCount }).map((_, i) => {
    const goalId = goalIds[i % goalIds.length];
    const achievedAt = new Date(midnight);
    achievedAt.setDate(
      achievedAt.getDate() - Math.floor(i / Math.max(1, goalIds.length)),
    );

    return {
      userId: user.id,
      goalId,
      achievedAt,
      targetValue: 100,
      actualValue: i % 20,
      timeSpent: (i % 10) * 600,
    };
  });

  // goalId + achievedAt unique 충돌 가능성 방지
  for (let i = 0; i < goalLogData.length; i += 1) {
    // createMany + skipDuplicates를 써도 되지만,
    // 여기서는 goalLog를 timerLog와 연결하기 위해 개별 생성 후 매핑하기 쉽게 둠
    await prisma.goalLog.create({
      data: goalLogData[i],
    });
  }

  const allGoalLogs = await prisma.goalLog.findMany({
    where: {
      userId: user.id,
      goal: {
        title: { startsWith: testPrefix },
      },
    },
    select: {
      id: true,
      goalId: true,
      achievedAt: true,
    },
  });

  // timerLog 생성
  const timerLogData = Array.from({ length: timerLogCount }).map((_, i) => {
    const goalId = goalIds[i % goalIds.length];
    const matchingGoalLog =
      allGoalLogs.find((g) => g.goalId === goalId) ?? allGoalLogs[0];

    const startTime = new Date(Date.now() - (i + 1) * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 25 * 60 * 1000);

    return {
      userId: user.id,
      goalId,
      goalLogId: matchingGoalLog.id,
      timerDate: new Date(
        matchingGoalLog.achievedAt.getFullYear(),
        matchingGoalLog.achievedAt.getMonth(),
        matchingGoalLog.achievedAt.getDate(),
      ),
      startTime,
      endTime,
      durationSec: 25 * 60,
    };
  });

  // createMany 사용
  if (timerLogData.length > 0) {
    await prisma.timerLog.createMany({
      data: timerLogData,
    });
  }

  return {
    userId: user.id,
    token: makeToken(user.id),
    goalIds,
  };
};
