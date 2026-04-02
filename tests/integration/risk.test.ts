import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../../src/app';
import prisma from '../../src/config/prisma';

describe('Risk API', () => {
  let authToken: string;
  let invalidToken: string;
  let myUserId: number;

  beforeEach(async () => {
    const me = await prisma.user.create({
      data: {
        nickname: `TEST_USER_${Date.now()}`,
        totalTime: 120000,
      },
      select: { id: true },
    });

    myUserId = me.id;

    // 카테고리 생성 (Goal 생성에 필요)
    const category = await prisma.category.create({
      data: {
        name: `테스트_카테고리`,
        unit: '페이지',
        userId: myUserId,
      },
      select: {
        id: true,
      },
    });

    const categoryId = category.id;

    // 목표 생성 (테스트 대상 핵심 데이터)
    await prisma.goal.createMany({
      data: [
        {
          title: `테스트_목표1`,
          description: '테스트 목표 1 설명입니다.',
          targetValue: 100,
          quota: 10,
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-31'),
          userId: myUserId,
          categoryId,
          status: 'active',
          currentValue: 30,
        },
        {
          title: `테스트_목표2`,
          description: '테스트 목표 2 설명입니다.',
          targetValue: 100,
          quota: 10,
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-31'),
          userId: myUserId,
          categoryId,
          status: 'active',
          currentValue: 30,
        },
        {
          title: `테스트_목표3`,
          description: '테스트 목표 3 설명입니다.',
          targetValue: 100,
          quota: 10,
          startDate: new Date('2026-03-01'),
          endDate: new Date('2026-03-31'),
          userId: myUserId,
          categoryId,
          status: 'active',
          currentValue: 30,
        },
      ],
    });

    authToken = jwt.sign({ id: myUserId }, process.env.JWT_SECRET!, {
      expiresIn: '10m',
    });

    invalidToken = jwt.sign({ id: 999999 }, process.env.JWT_SECRET!, {
      expiresIn: '10m',
    });
  });

  afterEach(async () => {
    await prisma.goalLog.deleteMany({
      where: {
        userId: myUserId,
      },
    });

    await prisma.goal.deleteMany({
      where: {
        userId: myUserId,
      },
    });

    await prisma.category.deleteMany({
      where: {
        userId: myUserId,
      },
    });

    await prisma.user.delete({
      where: { id: myUserId },
    });

    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /risks', () => {
    describe('200 - OK', () => {
      it('나의 위험도를 조회한다.', async () => {
        const res = await request(app)
          .get('/risks')
          .set('Cookie', [`token=${authToken}`]);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('현재 위험도');

        const { data } = res.body;

        expect(data).toMatchObject({
          score: expect.any(Number),
          level: expect.any(Number),
        });

        expect(data.score).toBeGreaterThanOrEqual(0);
        expect(data.score).toBeLessThanOrEqual(100);
      });
    });

    describe('401 - UNAUTHORIZED', () => {
      it('인증되지 않은 요청일 경우 반환한다', async () => {
        const res = await request(app)
          .get('/risks')
          .set('Cookie', [`token=${invalidToken}`]);

        expect(res.status).toBe(401);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'UNAUTHORIZED',
              message: '유효하지 않은 토큰입니다.',
            }),
          }),
        );
      });
    });

    describe('500 - INTERNAL_SERVER_ERROR', () => {
      it('서버 내부 예외가 발생할 경우 반환한다', async () => {
        const prismaSpy = jest
          .spyOn(prisma.goal, 'findMany')
          .mockRejectedValueOnce(new Error('DB Error'));

        const res = await request(app)
          .get('/risks')
          .set('Cookie', [`token=${authToken}`]);

        expect(res.status).toBe(500);
        expect(res.body).toEqual(
          expect.objectContaining({
            success: false,
            error: expect.objectContaining({
              code: 'INTERNAL_SERVER_ERROR',
              message: '서버 오류가 발생했습니다.',
            }),
          }),
        );

        prismaSpy.mockRestore();
      });
    });
  });
});
