export interface UserProfile {
  id: number;
  nickname: string;
  profileImageUrl: string | null;
  totalTime: number;
  createdAt: Date;
}
