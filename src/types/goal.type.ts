/**
 * 목표 생성
 * POST /goals
 */
export interface CreateGoalRequest {
  title: string;
  categoryId: number;
  description?: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  quota: number;
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
