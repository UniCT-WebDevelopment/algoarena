export type ExerciseCategory =
  | 'heap'
  | 'rbTree'
  | 'graphs'
  | 'hashTable'
  | 'dp'
  | 'greedy'
  | 'master'
  | 'code';

export interface ExerciseDescriptor {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  category: ExerciseCategory;
  estimatedTime: number; // minutes
  icon: string;
  route: string;
}

export interface ExerciseHistory {
  exerciseId: string;
  attempts: number;
  bestScore: number;
  completedDate?: string;
  timeSpentMs: number;
}
