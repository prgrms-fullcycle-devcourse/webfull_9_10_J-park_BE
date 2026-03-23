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
  nickname: string;
  status: string;
  currentValue: number;
  targetValue: number;
  quota: number;
}