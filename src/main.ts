import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { StatusCodes } from 'http-status-codes';

import prisma from './config/prisma';
import { ApiResponse } from './types/response';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(helmet());
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req: Request, res: Response<ApiResponse>) => {
  return res.status(StatusCodes.OK).json({
    success: true,
    message: `API Successful`,
    data: null,
  });
});

app.get(
  '/user',
  async (
    req: Request,
    res: Response<ApiResponse<{ user: string; allNicknames: string[] } | null>>,
  ) => {
    try {
      const newUser = await prisma.user.create({
        data: {
          nickname: `User ${Math.floor(Math.random() * 1000)}`,
        },
      });

      const allUsers = await prisma.user.findMany({
        select: {
          nickname: true,
        },
      });

      const allNicknames = allUsers.map((user) => user.nickname);

      return res.status(StatusCodes.OK).json({
        success: true,
        message: `사용자 생성 완료`,
        data: {
          user: newUser.nickname,
          allNicknames,
        },
      });
    } catch (err) {
      console.error(`에러 발생: ${err}`);
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: `에러 발생`,
        data: null,
      });
    }
  },
);

app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
