interface BaseGoal {
  id: number;
  title: string;
}

interface Goal extends BaseGoal {
  quota: number;
}

interface GoalResponse extends BaseGoal {
  todayQuota: number;
}

interface BaseUser {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  totalTime: number;
}
export interface User extends BaseUser {
  createdAt: Date;
  goals: Goal[];
}
export interface UserProfileResponse extends BaseUser {
  createdAt: string;
  goals: GoalResponse[];
}
