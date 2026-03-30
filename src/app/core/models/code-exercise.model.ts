export interface CodeExercise {
  id: string;
  title: string;
  category: string;
  points: number;
  difficulty: string;
  languages: Array<'c' | 'cpp'>;
  description: string;
  input: string;
  output: string;
  starterCode: Record<string, string>;
}

export interface CodeSubmissionResult {
  correct: boolean;
  pointsAwarded: number;
  alreadyCompleted: boolean;
  results: Array<{
    test: number;
    passed: boolean;
    output?: string;
    expected?: string;
  }>;
  user?: {
    id: string;
    name: string;
    email: string;
    totalScore?: number;
    categoryScores?: Record<string, number>;
    completedExercises?: string[];
  };
}
