import { ERROR_CODES, ErrorCodeKey } from './error.code';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(errorKey: ErrorCodeKey) {
    const error = ERROR_CODES[errorKey];

    super(error.message);

    this.name = 'AppError';
    this.statusCode = error.statusCode;
    this.code = error.code;
  }
}
