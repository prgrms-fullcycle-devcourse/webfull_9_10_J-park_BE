export interface UserProfile {
  id: number;
  username: string;
  profile_image_url: string | null;
  total_time: number;
  created_at: Date;
}
