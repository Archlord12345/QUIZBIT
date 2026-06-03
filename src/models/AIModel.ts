import { apiPost } from '../utils/api';

export type Question = {
  id: string;
  text: string;
  options?: string[];
  answer: string;
  type: 'mcq' | 'open';
};

type GenerateQuestionsResponse = {
  ok: boolean;
  model?: string;
  provider?: 'gemini' | 'mistral';
  fallbackUsed?: boolean;
  questions: Question[];
};

type ValidateAnswerResponse = {
  ok: boolean;
  correct: boolean;
};

class AIModel {
  async generateQuestions(
    theme: string,
    count: number = 5,
  ): Promise<Question[]> {
    const cleanTheme = theme.trim();
    if (!cleanTheme) {
      throw new Error('Theme manquant.');
    }

    const response = await apiPost<GenerateQuestionsResponse>(
      '/api/generate-questions',
      {
        prompt: cleanTheme,
        count,
      },
    );

    if (!response.questions?.length) {
      throw new Error('Le serveur Vercel n a retourne aucune question.');
    }

    return response.questions;
  }

  async validateAnswer(
    userAnswer: string,
    correctAnswer: string,
  ): Promise<boolean> {
    const response = await apiPost<ValidateAnswerResponse>(
      '/api/validate-answer',
      {
        userAnswer,
        correctAnswer,
      },
    );
    return response.correct;
  }
}

export default new AIModel();
