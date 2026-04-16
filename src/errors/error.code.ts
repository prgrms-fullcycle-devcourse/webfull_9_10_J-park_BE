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
  MISSING_NICKNAME: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'MISSING_NICKNAME',
    message: '닉네임이 주어지지 않았습니다.',
  },
  MISSING_FILE: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'MISSING_FILE',
    message: '파일이 존재하지 않습니다.',
  },
  INVALID_FILE_EXT: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'INVALID_FILE_EXT',
    message: '허용되지 않는 파일 형식입니다.',
  },
  FILE_TOO_LARGE: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'FILE_TOO_LARGE',
    message: '파일 용량이 너무 큽니다.',
  },
  UPLOAD_ERROR: {
    statusCode: StatusCodes.BAD_REQUEST,
    code: 'UPLOAD_ERROR',
    message: '파일 업로드 오류가 발생했습니다.',
  },

  // 401
  UNAUTHORIZED: {
    statusCode: StatusCodes.UNAUTHORIZED,
    code: 'UNAUTHORIZED',
    message: '유효하지 않은 토큰입니다.',
  },
  NOT_LOGGED_IN: {
    statusCode: StatusCodes.UNAUTHORIZED,
    code: 'NOT_LOGGED_IN',
    message: '로그인 상태에서만 로그아웃이 가능합니다.',
  },

  // 403
  EMAIL_REQUIRED: {
    statusCode: StatusCodes.FORBIDDEN,
    code: 'KAKAO_EMAIL_REQUIRED',
    message: '카카오 이메일 동의가 필요합니다.',
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
  QUOTA_RECOMMENDATION_NOT_FOUND: {
    statusCode: StatusCodes.NOT_FOUND,
    code: 'QUOTA_RECOMMENDATION_NOT_FOUND',
    message: '추천 할당량을 찾을 수 없습니다.',
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
  S3_SERVER_ERROR: {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    code: 'S3_SERVER_ERROR',
    message: 'AWS S3 서버 오류가 발생했습니다.',
  },

  // 502
  KAKAO_SERVER_ERROR: {
    statusCode: StatusCodes.BAD_GATEWAY,
    code: 'KAKAO_SERVER_ERROR',
    message: '카카오 API 오류가 발생했습니다.',
  },
};

export type ErrorCodeKey = keyof typeof ERROR_CODES;
