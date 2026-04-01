import { StatusCodes } from 'http-status-codes';

export const ERROR_CODES = {
  // 400
  BAD_REQUEST: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'BAD_REQUEST',
    message: '요청 형식이 올바르지 않습니다.',
  },

  // 404
  GOAL_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'GOAL_NOT_FOUND',
    message: '목표를 찾을 수 없습니다.',
  },
  RUNNING_TIMER_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'RUNNING_TIMER_NOT_FOUND',
    message: '실행 중인 타이머가 없습니다.',
  },

  // 409
  TIMER_ALREADY_RUNNING: {
    statusCode: StatusCodes.CONFLICT,
    code: 'TIMER_ALREADY_RUNNING',
    message: '이미 실행 중인 타이머가 있습니다.',
  },
};

export type ErrorCodeKey = keyof typeof ERROR_CODES;
