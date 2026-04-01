export interface StartTimerRequest {
  goalId: number;
}

export interface StartTimerResponse {
  goalId: number;
  timerRunning: boolean;
}

export interface EndTimerRequest {
  currentCompletedAmount: number;
  isPaused: boolean;
}

export interface EndTimerResponse {
  goalId: number;
  goalLogId: number;
  isTimerRunning: boolean;
  goalDuration: number;
  goalProgressRate: number;
}

// export interface RunningTimerRequest {
//   goalId: number;
// }

export interface RunningTimerResponse {
  goalId: number;
  goalTitle: string;
  goalLogId: number;
  todayStudyDuration: number;
  todayProgressRate: number;
  todayCompletedAmount: number;
  todayTargetAmount: number;
  timer: {
    isRunning: boolean;
    startedAt: Date;
  };
}
