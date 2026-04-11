import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { StatusCodes } from 'http-status-codes';
import morgan from 'morgan';

import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

import { ApiResponse } from './types/response';

import categoryRouter from './routes/category.route';
import goalRoutes from './routes/goal.routes';
import rankRouter from './routes/ranking.route';
import timerRoutes from './routes/timer.route';
import userRouter from './routes/users.routes';
import riskRouter from './routes/risk.route';
import devRouter from './routes/dev.route';

const app = express();

// 미들웨어 설정
app.use(helmet());
app.use(cookieParser());
app.use(morgan(':method :url :status - :response-time ms'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// cors 설정 추가
const originsString = process.env.ALLOWED_ORIGINS || '';
const allowedOrigins = originsString
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: [...allowedOrigins, /^http:\/\/localhost(:\d+)?$/], // 추후 배포 시 localhost 제거
    credentials: true,
    methods: 'GET,POST,PATCH,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  }),
);

app.get('/', (req: Request, res: Response<ApiResponse>) => {
  return res.status(StatusCodes.OK).json({
    success: true,
    message: `API Successful`,
    data: null,
  });
});

//라우터 연결
app.use('/goals', goalRoutes);
app.use('/users', userRouter);
app.use('/categories', categoryRouter);
app.use('/rankings', rankRouter);
app.use('/timers', timerRoutes);
app.use('/risks', riskRouter);
app.use('/dev', devRouter);

export default app;
