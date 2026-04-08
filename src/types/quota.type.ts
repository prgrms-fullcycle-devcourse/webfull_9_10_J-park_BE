type GoalId = number;
type Quota = number;

export type QuotaRecommendationResult = Map<GoalId, Quota>;

export type GoalForRecommendation = {
  id: number;
  quota: number;
  startDate: Date;
  endDate: Date;
  targetValue: number;
  currentValue: number;
};

export type BaseQuotaFeedbackResult = {
  recommendationId: number;
  actualCompleted: number;
  completionRate: number;
  finalReward: number;
  updatedBaseBias: number;
};
