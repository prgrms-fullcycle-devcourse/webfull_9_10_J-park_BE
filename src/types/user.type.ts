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
  email: string | null;
  createdAt: Date;
  goals: Goal[];
}

interface LoginInfo {
  isLoggedIn: boolean;
  email: string | null;
}

export interface UserProfileResponse extends Omit<BaseUser, 'id'> {
  userId: number; // id 대신 userId 사용
  loginInfo: LoginInfo;
  createdAt: string;
  goals: GoalResponse[];
}
