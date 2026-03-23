/**
 * 목표 생성
 * POST /goals
 */
export interface CreateGoalRequestDto {
  title: string;
  categoryId: number;
  description?: string;
  targetValue: number;
  startDate: string;
  endDate: string;
  quota: number;
}

export interface CreateGoalResponseDto {
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
export interface GoalListItemDto {
  id: number;
  title: string;
  endDate: string;
  description: string | null;
  progressRate: number;
}

export interface GoalListResponseDto {
  goals: GoalListItemDto[];
}