import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {
  createGoalService,
  getGoalListService,
  getTodayGoalsService,
  getTodayGoalCompletionService,
  getGoalDetailService,
  updateGoalService,
  deleteGoalService,
} from '../services/goal.service';
import {
  CreateGoalRequest,
  GetGoalDetailQuery,
  UpdateGoalRequest,
} from '../types/goal.type';

/**
 * 목표 생성 컨트롤러
 */
export const createGoalController = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 토큰입니다.',
        },
      });
    }

    const { title, categoryId, detail, totalAmount, startDate, endDate } =
      req.body as CreateGoalRequest;

    if (
      !title ||
      categoryId === undefined ||
      !detail ||
      totalAmount === undefined ||
      !startDate ||
      !endDate
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: '필수값이 누락되었습니다.',
        },
      });
    }

    const result = await createGoalService(user.userId, {
      title,
      categoryId,
      detail,
      totalAmount,
      startDate,
      endDate,
    });

    return res.status(StatusCodes.CREATED).json({
      success: true,
      message: '목표 생성 완료',
      data: result,
    });
  } catch (error) {
    console.error('createGoalController error:', error);

    if (error instanceof Error) {
      if (error.message === 'USER_NOT_FOUND') {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: '사용자를 찾을 수 없습니다.',
          },
        });
      }

      if (error.message === 'CATEGORY_NOT_FOUND') {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: {
            code: 'CATEGORY_NOT_FOUND',
            message: '카테고리를 찾을 수 없습니다.',
          },
        });
      }

      if (error.message === 'INVALID_DATE') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'INVALID_DATE',
            message: '유효하지 않은 날짜 형식입니다.',
          },
        });
      }

      if (error.message === 'INVALID_DATE_RANGE') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: '시작일은 종료일보다 늦을 수 없습니다.',
          },
        });
      }
    }

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};

/**
 * 전체 목표 리스트 조회 컨트롤러
 */
export const getGoalListController = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 토큰입니다.',
        },
      });
    }

    const result = await getGoalListService(user.userId);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '전체 목표 리스트',
      data: result,
    });
  } catch (error) {
    console.error('getGoalListController error:', error);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};

/**
 * 오늘 목표 리스트 조회 컨트롤러
 */
export const getTodayGoalsController = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 토큰입니다.',
        },
      });
    }

    const result = await getTodayGoalsService(user.userId);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '오늘 목표 리스트',
      data: result,
    });
  } catch (error) {
    console.error('getTodayGoalsController error:', error);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};

//오늘 목표 달성률 조회
export const getTodayGoalCompletionController = async (
  req: Request,
  res: Response,
) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 토큰입니다.',
        },
      });
    }

    const data = await getTodayGoalCompletionService(user.userId);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '오늘 목표 달성률',
      data,
    });
  } catch (error) {
    console.error('오늘 목표 달성률 조회 실패:', error);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};

/**
 * 개별 목표 상세 조회 컨트롤러
 *
 * 역할:
 * - 인증된 사용자의 특정 목표 상세 정보를 조회
 * - query로 받은 날짜 범위를 검증
 * - service 계층에 로직 위임
 *
 * 흐름:
 * 1. 사용자 인증 확인
 * 2. goalId 유효성 검사
 * 3. 날짜(query) 형식 검증
 * 4. 서비스 호출
 * 5. 응답 반환
 */
export const getGoalDetailController = async (req: Request, res: Response) => {
  try {
    // 인증된 사용자 정보 추출
    const user = req.user;

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 토큰입니다.',
        },
      });
    }
    //path parameter (goalId) 파싱
    const goalId = Number(req.params.goalId);

    //query parameter (startDate, endDate)
    const { startDate, endDate } = req.query as GetGoalDetailQuery;

    //goalId 유효성 검사
    if (!goalId || Number.isNaN(goalId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'BAD_REQUEST', // 애리: INVALID_GOAL_ID로 통일하겠습니다!
          message: '유효한 goalId가 필요합니다.',
        },
      });
    }

    //날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

    if (startDate && !dateRegex.test(startDate)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'BAD_REQUEST', // 애리: INVALID_DATE로 하셔도 될 듯해요!
          message: 'startDate 형식은 YYYY-MM-DD 이어야 합니다.',
        },
      });
    }

    if (endDate && !dateRegex.test(endDate)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'BAD_REQUEST', // 애리: INVALID_DATE로 하셔도 될 듯해요!
          message: 'endDate 형식은 YYYY-MM-DD 이어야 합니다.',
        },
      });
    }

    // 서비스 호출 (로직 처리)
    const data = await getGoalDetailService({
      userId: user.userId,
      goalId,
      startDate,
      endDate,
    });

    // 성공 응답 반환
    return res.status(StatusCodes.OK).json({
      success: true,
      message: '개별 목표 상세 정보',
      data,
    });
  } catch (error: any) {
    //목표가 없을때
    if (error.message === 'GOAL_NOT_FOUND') {
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        error: {
          code: 'GOAL_NOT_FOUND',
          message: '해당 목표를 찾을 수 없습니다.',
        },
      });
    }
    // 날짜 범위 오류
    if (error.message === 'INVALID_DATE_RANGE') {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'BAD_REQUEST', // 애리: INVALID_DATE_RANGE로 가셔도 될 듯해요!
          message: 'startDate는 endDate보다 늦을 수 없습니다.',
        },
      });
    }
    //예상치 못한 애러
    console.error('getGoalDetailController error:', error);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};

/**
 * 개별 목표 수정 컨트롤러
 *
 * 역할:
 * - 인증 사용자 확인
 * - 요청값 검증
 * - 서비스 호출
 * - 에러 처리 및 응답 반환
 */
export const updateGoalController = async (req: Request, res: Response) => {
  try {
    /**
     * 1. 인증 사용자 확인
     */
    const user = req.user;

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 토큰입니다.',
        },
      });
    }

    /**
     * 2. goalId 파라미터 검증
     */
    const goalId = Number(req.params.goalId);

    if (!goalId || Number.isNaN(goalId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: '유효한 goalId가 필요합니다.',
        },
      });
    }

    /**
     * 3. 요청 body 파싱
     * - totalAmount: 수정할 총 목표량
     * - endDate: 수정할 종료일
     */
    const { totalAmount, endDate } = req.body as UpdateGoalRequest;

    /**
     * 4. 요청값 타입 검증
     */
    if (
      (totalAmount !== undefined && typeof totalAmount !== 'number') ||
      (endDate !== undefined && typeof endDate !== 'string')
    ) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: '요청 형식이 올바르지 않습니다.',
        },
      });
    }

    /**
     * 5. 서비스 호출
     */
    const result = await updateGoalService(user.userId, goalId, {
      totalAmount,
      endDate,
    });

    /**
     * 6. 성공 응답 반환
     */
    return res.status(StatusCodes.OK).json({
      success: true,
      message: '목표 수정 성공',
      data: result,
    });
  } catch (error) {
    console.error('updateGoalController error:', error);

    /**
     * 7. 비즈니스 에러 처리
     */
    if (error instanceof Error) {
      if (error.message === 'GOAL_NOT_FOUND') {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: {
            code: 'GOAL_NOT_FOUND',
            message: '해당 목표를 찾을 수 없습니다.',
          },
        });
      }

      if (error.message === 'EMPTY_UPDATE_DATA') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'EMPTY_UPDATE_DATA',
            message: '수정할 값이 없습니다.',
          },
        });
      }

      // 애리: 에러 코드는 target value 문제라고 하는데 메시지는 totalAmount가 잘못되었다고 하고 있네요. 오타면 수정해주시구 의도한 것이면 그냥 주석 지워주세요!
      if (error.message === 'INVALID_TARGET_VALUE') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'INVALID_TARGET_VALUE',
            message: 'totalAmount는 1 이상의 정수여야 합니다.',
          },
        });
      }

      if (error.message === 'INVALID_DATE') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'INVALID_DATE',
            message: '유효하지 않은 날짜 형식입니다.',
          },
        });
      }

      if (error.message === 'INVALID_DATE_RANGE') {
        return res.status(StatusCodes.BAD_REQUEST).json({
          success: false,
          error: {
            code: 'INVALID_DATE_RANGE',
            message: '종료일은 시작일보다 빠를 수 없습니다.',
          },
        });
      }
    }

    /**
     * 8. 예상하지 못한 서버 에러
     */
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};

/**
 * 개별 목표 삭제 컨트롤러
 */
export const deleteGoalController = async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '유효하지 않은 토큰입니다.',
        },
      });
    }

    const goalId = Number(req.params.goalId);

    if (!goalId || Number.isNaN(goalId)) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        error: {
          code: 'BAD_REQUEST', // 애리: INVALID_GOAL_ID로 통일할게요!
          message: '유효한 goalId가 필요합니다.',
        },
      });
    }

    const result = await deleteGoalService(user.userId, goalId);

    return res.status(StatusCodes.OK).json({
      success: true,
      message: '목표 삭제 성공',
      data: result,
    });
  } catch (error) {
    console.error('deleteGoalController error:', error);

    if (error instanceof Error) {
      if (error.message === 'GOAL_NOT_FOUND') {
        return res.status(StatusCodes.NOT_FOUND).json({
          success: false,
          error: {
            code: 'GOAL_NOT_FOUND',
            message: '해당 목표를 찾을 수 없습니다.',
          },
        });
      }
    }

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: '서버 오류가 발생했습니다.',
      },
    });
  }
};
