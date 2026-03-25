import { StatusCodes } from 'http-status-codes';

export const ERROR_CODES = {
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

  // 500
  INVALID_GOAL_LOG: {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    code: 'INVALID_GOAL_LOG',
    message: '목표 기록 정보를 불러오는 과정에서 오류가 발생했습니다.',
  },
  INVALID_TIMER_STATE: {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    code: 'INVALID_TIMER_STATE',
    message: '실행 중인 타이머 상태가 올바르지 않습니다.',
  },
};

export type ErrorCodeKey = keyof typeof ERROR_CODES;
