import prisma from '../../src/config/prisma';
import { AppError } from '../errors/app.error';
import { CountOption } from '../types/dev.type';

export const GOAL_TITLES = [
  '알고리즘 문제 풀이',
  '코딩 테스트 준비',
  '자료구조 복습',
  'CS 기초 공부',
  '운영체제 공부',
  '네트워크 공부',
  '데이터베이스 공부',
  '시스템 설계 학습',
  '백엔드 개발 공부',
  '프론트엔드 개발 공부',
  'React 학습',
  'Node.js 학습',
  'TypeScript 공부',
  'JavaScript 심화 학습',
  'Spring Boot 학습',
  'API 설계 공부',
  '클린 코드 학습',
  '리팩토링 연습',
  '기술 문서 읽기',
  '개발 서적 읽기',
  '강의 수강',
  '프로젝트 구현',
  '사이드 프로젝트 진행',
  '포트폴리오 정리',
  '이력서 작성',
  '면접 대비 공부',
  '기술 질문 정리',
  '오답 노트 정리',
  '문제 풀이 복습',
  '개발 블로그 작성',
];

// conut 변환
export const resolveCount = (value: CountOption): number => {
  // 숫자인 경우 그대로
  if (typeof value === 'number') {
    if (!Number.isInteger(value) || value <= 0) {
      throw new AppError('BAD_REQUEST');
    }

    return value;
  }

  // 객체(min, max)인 경우 그 사이의 랜덤값으로
  const { min, max } = value;

  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    throw new AppError('BAD_REQUEST');
  }
  if (min <= 0 || max <= 0) {
    throw new AppError('BAD_REQUEST');
  }
  if (min > max) {
    throw new AppError('BAD_REQUEST');
  }

  // 🔥 랜덤 값 생성
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// 과거 랜덤 날짜 생성
const getRandomPastDate = (maxDaysAgo: number) => {
  const now = new Date();
  const pastTime =
    now.getTime() -
    Math.floor(Math.random() * maxDaysAgo) * 24 * 60 * 60 * 1000;

  return new Date(pastTime);
};

// 여러 아이템 중 랜덤 1개 선택
const getRandomItem = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// 랜덤 목표 생성
export const createRandomGoals = async (
  userId: number,
  goalCount: CountOption = 5,
) => {
  // 카테고리 데이터
  const categories = await prisma.category.findMany({
    select: { id: true },
  });

  // 목표 수 정하기
  const cnt = resolveCount(goalCount);
  const goalData = Array.from({ length: cnt }, (_) => {
    // 목표 이름, 카테고리 랜덤 생성
    const title = GOAL_TITLES[Math.floor(Math.random() * GOAL_TITLES.length)];
    const randomCategory = getRandomItem(categories);

    // 목표 시작/종료일 랜덤 생성
    const startDate = getRandomPastDate(7);
    const endDate = new Date(
      startDate.getTime() +
        Math.floor(Math.random() * 30 + 7) * 24 * 60 * 60 * 1000,
    );

    // 목표 분량 랜덤 생성 및 할당량 계산
    const targetValue = Math.floor(Math.random() * 1000 + 10);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const quota = Math.ceil(targetValue / diffDays);

    return {
      userId,
      categoryId: randomCategory.id,
      title,
      startDate,
      endDate,
      quota,
      targetValue,
    };
  });

  const result = await prisma.goal.createMany({
    data: goalData,
  });

  return result.count;
};

type CreateRandomTimerLogsOption = {
  userId: number;
  goalId: number;
  goalLogId: number;
  timerDate: Date;
  timerLogCount: CountOption;
};

// timerDate에 해당하는 timer data 랜덤 생성

const getRandomTimersInDay = (timerDate: Date, num: number) => {
  const base = new Date(timerDate);
  base.setHours(0, 0, 0, 0);
  const baseMs = base.getTime();

  // 타이머 시간을 timerLogCount*2개 생성 후 정렬 -> 순서대로 시작시간, 종료시간 가져가기
  const times = Array.from({ length: num * 2 }).map(() => {
    return baseMs + Math.floor(Math.random() * 24 * 60 * 60 * 1000);
  });

  times.sort((a, b) => a - b);

  const timers = []; // (startTime, endTime, durationSec)
  let timeSpent = 0;

  for (let i = 0; i < num * 2; i += 2) {
    const startTime = times[i];
    const endTime = times[i + 1];
    const durationSec = endTime - startTime;
    timeSpent += durationSec;

    timers.push({
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      durationSec,
    });
  }

  return {
    timeSpent,
    timers,
  };
};

const createRandomTimerLogs = async ({
  userId,
  goalId,
  goalLogId,
  timerDate,
  timerLogCount = 3,
}: CreateRandomTimerLogsOption) => {
  const timerLogCnt = resolveCount(timerLogCount);

  // timerDate에 해당하는 timer data 랜덤 생성
  // timers = [(startTime, endTime, durationSec), ...]
  const timers = getRandomTimersInDay(timerDate, timerLogCnt);

  // 생성된 데이터를 timerLog에 저장
  await prisma.timerLog.createMany({
    data: timers.timers.map(({ startTime, endTime, durationSec }) => ({
      userId,
      goalId,
      goalLogId,
      timerDate,
      startTime,
      endTime,
      durationSec,
    })),
  });

  // goalLog 업데이트
  await prisma.goalLog.update({
    where: { id: goalLogId },
    data: { timeSpent: timers.timeSpent },
  });
};

// 범위 내 n개의 achievedAt 생성 및 정렬
const pickDateinRange = (startDate: Date, endDate: Date, cnt: number) => {
  // 기간 내 모든 날짜 생성
  const dates: Date[] = [];

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  // 배열 섞기
  const shuffle = (array: Array<Date>) => {
    array.sort(() => Math.random() - 0.5);
  };

  shuffle(dates);

  // n개 데이터 뽑은 후 정렬하여 반환
  const n = Math.min(cnt, dates.length);
  return dates.slice(0, n).sort((a, b) => a.getTime() - b.getTime());
};

// 랜덤 goal_log 생성 (내부에서 timer_log 생성)
type CreateRandomGoalLogsOptions = {
  userId: number;
  goalId: number;
  quota: number;
  goalLogCount: CountOption;
  timerLogCount: CountOption;
  startDate: Date;
  endDate: Date;
};

export const createRandomGoalLogs = async ({
  userId,
  goalId,
  quota,
  goalLogCount = 10,
  timerLogCount = 3,
  startDate,
  endDate,
}: CreateRandomGoalLogsOptions) => {
  // goalLogCnt 만큼의 goalLog 데이터 생성
  const goalLogCnt = resolveCount(goalLogCount);

  // 범위 내 n개의 achievedAt 생성 및 정렬
  const dates = pickDateinRange(startDate, endDate, goalLogCnt);

  await prisma.goalLog.createMany({
    data: dates.map((achievedAt) => ({
      userId,
      goalId,
      actualValue: quota + Math.floor((Math.random() - 0.5) * 10),
      targetValue: quota,
      timeSpent: 0,
      achievedAt,
    })),
  });

  const goallogs = await prisma.goalLog.findMany({
    where: {
      goalId,
      achievedAt: {
        in: dates,
      },
    },
    select: {
      id: true,
      achievedAt: true,
    },
  });

  // goalLogId에 따른 timerLog 생성
  goallogs.forEach(async (goallog) => {
    await createRandomTimerLogs({
      userId,
      goalId,
      goalLogId: goallog.id,
      timerDate: goallog.achievedAt,
      timerLogCount,
    });
  });
};
