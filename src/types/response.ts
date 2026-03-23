export type ApiResponse<T = null> =
  | {
      success: true;
      message: string;
      data: T;
    }
  | {
      success: false;
      message: string;
      data?: null;
    };
