export interface UserStats {
  displayName: string;
  email: string;
  totalScore: number;
  partiesPlayed: number;
  bestScore: number;
  streak: number;
}

export interface LeaderboardUser {
  rank: number;
  name: string;
  score: number;
  initials: string;
  avatarUrl: string;
  userId: string;
  isCurrentUser?: boolean;
  change: number;
}

export interface Option {
  id: string;
  label: string;
  text: string;
}

export interface Question {
  id: string | number;
  question: string;
  category?: string;
  correctAnswerId: string;
  answers: Option[];
  explanation?: string;
  type?: 'mcq' | 'open';
  exactAnswer?: boolean;
}

export interface Quiz {
  id: string;
  title: string;
  category: string;
  icon: string;
  questions: Question[];
  timeLimitSeconds?: number;
}