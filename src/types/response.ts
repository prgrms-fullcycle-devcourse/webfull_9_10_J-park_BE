export type ApiResponse<T = null> =
  | {
      success: true;
      message: string;
      data: T;
    }
  | {
      success: false;
      error: {
        code: string;
        message: string;
      };
    };
