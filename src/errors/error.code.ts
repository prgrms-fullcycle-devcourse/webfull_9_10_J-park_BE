import { StatusCodes } from 'http-status-codes';

export const ERROR_CODES = {
  // 400
  BAD_REQUEST: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'BAD_REQUEST',
    message: '요청 형식이 올바르지 않습니다.',
  },
  INVALID_GOAL_ID: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'INVALID_GOAL_ID',
    message: '유효하지 않은 goalId입니다.',
  },
  INVALID_DATE: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'INVALID_DATE',
    message: '유효하지 않은 날짜 형식입니다.',
  },
  INVALID_DATE_RANGE: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'INVALID_DATE_RANGE',
    message: '시작일은 종료일보다 늦을 수 없습니다.',
  },
  INVALID_TARGET_VALUE: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'INVALID_TARGET_VALUE',
    message: 'totalAmount는 1 이상의 정수여야 합니다.',
  },
  EMPTY_UPDATE_DATA: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'EMPTY_UPDATE_DATA',
    message: '수정할 값이 없습니다.',
  },

  // 401
  UNAUTHORIZED: {
    statusCode: StatusCodes.UNAUTHORIZED,
    code: 'UNAUTHORIZED',
    message: '유효하지 않은 토큰입니다.',
  },

  // 404
  NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'NOT_FOUND',
    message: '요청한 리소스를 찾을 수 없습니다.',
  },
  USER_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'USER_NOT_FOUND',
    message: '사용자를 찾을 수 없습니다.',
  },
  GOAL_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'GOAL_NOT_FOUND',
    message: '목표를 찾을 수 없습니다.',
  },
  CATEGORY_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'CATEGORY_NOT_FOUND',
    message: '카테고리를 찾을 수 없습니다.',
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
  INTERNAL_SERVER_ERROR: {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
    message: '서버 오류가 발생했습니다.',
  },
};

export type ErrorCodeKey = keyof typeof ERROR_CODES;
