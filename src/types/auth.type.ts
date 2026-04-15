export interface AuthUser {
  userId: number;
  isLoggedIn: boolean;
}

export interface KakaoTokenResponse {
  token_type: string; // "bearer"로 고정
  access_token: string; // 사용자 정보 가져오기 등 API 호출 시 사용
  id_token?: string; // OpenID Connect 활성화 시 포함됨
  expires_in: number; // 액세스 토큰 만료 시간(초)
  refresh_token: string; // 액세스 토큰 만료 시 재발급용
  refresh_token_expires_in: number; // 리프레시 토큰 만료 시간(초)
  scope?: string; // 사용자 동의 항목 (예: "profile_nickname account_email")
}

export interface KakaoUserResponse {
  id: number; // 사용자 고유 번호
  connected_at?: string; // 서비스 연결 시각
  properties?: {
    // 사용자 프로퍼티 (별명, 프로필 이미지 등)
    nickname?: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
  kakao_account: {
    // 카카오 계정 정보
    profile_needs_agreement?: boolean;
    profile?: {
      nickname?: string;
      thumbnail_image_url?: string;
      profile_image_url?: string;
      is_default_image?: boolean;
    };
    has_email?: boolean;
    email_needs_agreement?: boolean;
    is_email_valid?: boolean;
    is_email_verified?: boolean;
    email?: string; // 유저 이메일

    has_age_range?: boolean;
    age_range_needs_agreement?: boolean;
    age_range?: string; // 연령대 (예: "20~29")

    has_gender?: boolean;
    gender_needs_agreement?: boolean;
    gender?: 'male' | 'female'; // 성별
  };
}

export interface KakaoTokenError {
  error: string; // 에러 코드 (예: "invalid_client")
  error_description: string; // 에러 상세 메시지
  error_code: string; // 카카오 전용 에러 코드 (예: "KOE010")
}
