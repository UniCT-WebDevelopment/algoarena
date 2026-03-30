export interface LeaderboardEntry {
  id: string;
  name: string;
  totalScore: number;
  categoryScores: Record<string, number>;
}
