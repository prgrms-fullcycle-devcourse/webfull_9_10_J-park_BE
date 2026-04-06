export type CountOption = number | { min: number; max: number };

export interface GenRandDataRequest {
  userId: number;
  goalCount: CountOption;
}

export interface GenRandDataResponse {
  goalResultCount: number;
}
