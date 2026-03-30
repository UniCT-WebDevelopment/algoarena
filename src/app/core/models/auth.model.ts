export interface AuthUser {
  id: string;
  name: string;
  email: string;
  totalScore?: number;
  categoryScores?: Record<string, number>;
  completedExercises?: string[];
}

export interface AuthResponse {
  user: AuthUser;
  token?: string;
}

export interface PasswordResetResponse {
  message: string;
  resetToken?: string | null;
  resetTokenExpiresAt?: string | null;
}
