/**
 * 목표 생성
 * POST /goals
 */
export interface CreateGoalRequest {
  title: string;
  categoryId: number;
  detail?: string;
  totalAmount: number;
  startDate: string;
  endDate: string;
}

export interface CreateGoalResponse {
  id: number;
  title: string;
  categoryId: number;
  status: string;
  currentValue: number;
  targetValue: number;
  quota: number;
  nickname: string;
}

/**
 * 전체 목표 리스트 조회
 * GET /goals
 */
export interface GoalListItem {
  id: number;
  title: string;
  endDate: string;
  description: string | null;
  progressRate: number;
}

export interface GoalListResponse {
  goals: GoalListItem[];
}

/**
 * 개별 목표 상세 조회
 * /goals/{goalId}/detail:
 * /goals/:goalId/detail?startDate=?&endDate=?
 */

export interface GetGoalDetailQuery {
  //DTO
  startDate?: string;
  endDate?: string;
}

export interface DailyProgressItem {
  //1
  goalLogId: number | null;
  date: string;
  targetAmount: number;
  completedAmount: number;
  isCompleted: boolean;
  studyTime: number;
  isToday: boolean;
}

export interface GoalDetailResponse {
  //DTO
  id: number;
  title: string;
  description: string | null;
  category: string;
  progress: {
    rate: number;
    currentAmount: number;
    targetAmount: number;
    totalStudyTime: number;
    unit: string | null;
  };
  period: {
    startDate: string;
    endDate: string;
    daysRemaining: number;
  };
  dailyProgress: DailyProgressItem[];
}

/**
 * 개별 목표 수정
 * PATCH /goals/:goalId
 */
export interface UpdateGoalRequest {
  totalAmount?: number;
  endDate?: string;
}

export interface UpdatedGoalResponse {
  id: number;
  title: string;
  description: string | null;
  category: string;
  progress: {
    rate: number;
    currentAmount: number;
    targetAmount: number;
    totalStudyTime: number;
    unit: string | null;
  };
  period: {
    startDate: string;
    endDate: string;
    daysRemaining: number;
  };
  dailyProgress: DailyProgressItem[];
}

/**
 * 인증 사용자
 */
export interface AuthenticatedUser {
  id: number;
}

/**
 * 개별 목표 삭제
 * DELETE /goals/:goalId
 */
export interface DeleteGoalResponse {
  id: number;
  title: string;
}

/**
 * 데일리 목표 리스트
 * GET /goals/today
 */
export interface TodayGoalItem {
  id: number;
  goalLogId: number | null;
  title: string;
  targetAmount: number;
  currentAmount: number;
  unit: string | null;
  studyTime: number;
  completed: boolean;
  isTimerRunning: boolean;
  progressRate: number;
}

export interface TodayGoalsResponse {
  totalStudyTime: number;
  todayGoals: TodayGoalItem[];
}
