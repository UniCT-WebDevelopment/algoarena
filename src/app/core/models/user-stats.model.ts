export interface UserStatsOverall {
  totalCompleted: number;
  totalPoints: number;
  totalDurationMs: number;
  averageDurationMs: number;
  medianDurationMs: number;
  fastestDurationMs: number;
  slowestDurationMs: number;
  averageErrors: number;
  averageAttempts: number;
  averagePoints: number;
  averageMultiplier: number;
  pointsPerMinute: number;
}

export interface UserCategoryStats extends UserStatsOverall {
  key: string;
  label: string;
}

export interface UserCompletionStat {
  exerciseId: string;
  category: string;
  pointsAwarded: number;
  basePoints: number;
  durationMs?: number | null;
  errors?: number;
  attempts?: number;
  completedAt?: string;
}

export interface DailyActivityStat {
  date: string;
  completions: number;
  points: number;
}

export interface UserStatsResponse {
  user: {
    id: string;
    name: string;
    totalScore: number;
    categoryScores: Record<string, number>;
    completedCount: number;
    createdAt?: string;
  };
  stats: {
    overall: UserStatsOverall;
    categories: UserCategoryStats[];
    recentCompletions: UserCompletionStat[];
    dailyActivity: DailyActivityStat[];
  };
}
