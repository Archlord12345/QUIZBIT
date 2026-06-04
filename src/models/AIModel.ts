import AuthController from '../controllers/AuthController';
import { apiPost } from '../utils/api';
import type { ThemeMediaPayload } from '../utils/themeMediaPayload';

export type QuestionType = 'mixed' | 'mcq' | 'open';
export type OpenAnswerMode = 'flexible' | 'exact';

export type Question = {
  id: string;
  text: string;
  options?: string[];
  answer: string;
  exactAnswer?: boolean;
  type: 'mcq' | 'open';
};

export type QuizGenerationOptions = {
  choiceCount?: number;
  mediaDescription?: string;
  mediaPayload?: ThemeMediaPayload | null;
  count?: number;
  openAnswerMode?: OpenAnswerMode;
  questionType?: QuestionType;
};

type GenerateQuestionsResponse = {
  ok: boolean;
  questions: Question[];
  provider?: string;
  model?: string;
};

type ValidateAnswerResponse = {
  correct: boolean;
  ok: boolean;
};

class AIModel {
  private requireIdToken(): string {
    const account = AuthController.getCurrentAccount();
    if (!account?.idToken) {
      throw new Error('Session manquante. Reconnecte-toi pour utiliser l IA.');
    }
    return account.idToken;
  }

  async generateQuestions(
    theme: string,
    options: QuizGenerationOptions = {},
  ): Promise<Question[]> {
    const cleanTheme = theme.trim();
    const hasMedia = Boolean(options.mediaPayload);
    if (!cleanTheme && !hasMedia) {
      throw new Error('Indique un theme ou charge un support audio/document.');
    }

    const count = Math.max(1, Math.min(20, Math.floor(options.count || 5)));
    const themeLine = cleanTheme || 'Theme deduit du support fourni';
    const response = await apiPost<GenerateQuestionsResponse>(
      '/api/generate-questions',
      {
        choiceCount: Math.max(
          2,
          Math.min(5, Math.floor(options.choiceCount || 4)),
        ),
        count,
        idToken: this.requireIdToken(),
        mediaPayload: options.mediaPayload || undefined,
        openAnswerMode: options.openAnswerMode || 'flexible',
        prompt: options.mediaDescription
          ? `${themeLine}. ${options.mediaDescription}`
          : themeLine,
        questionType: options.questionType || 'mixed',
      },
    );
    const onlineQuestions = this.normalizeQuestions(response.questions, count);
    if (onlineQuestions.length === 0) {
      throw new Error('Le serveur IA n a retourne aucune question exploitable.');
    }

    return onlineQuestions;
  }

  async validateAnswer(
    userAnswer: string,
    correctAnswer: string,
    question?: Question,
  ): Promise<boolean> {
    if (question?.exactAnswer) {
      return (
        this.normalizeExactAnswer(userAnswer) ===
        this.normalizeExactAnswer(correctAnswer)
      );
    }

    if (this.normalizeAnswer(userAnswer) === this.normalizeAnswer(correctAnswer)) {
      return true;
    }

    const response = await apiPost<ValidateAnswerResponse>(
      '/api/validate-answer',
      {
        correctAnswer,
        exactAnswer: Boolean(question?.exactAnswer),
        idToken: this.requireIdToken(),
        questionText: question?.text || '',
        userAnswer,
      },
    );
    return response.correct;
  }

  private normalizeQuestions(value: unknown, count: number): Question[] {
    if (!Array.isArray(value)) {
      throw new Error('La reponse IA serveur n est pas un tableau.');
    }

    return value
      .map((item, index) => this.normalizeQuestion(item, index))
      .filter((question): question is Question => question !== null)
      .slice(0, count);
  }

  private normalizeQuestion(item: unknown, index: number): Question | null {
    if (!item || typeof item !== 'object') {
      return null;
    }

    const candidate = item as Partial<Question>;
    const text = String(candidate.text || '').trim();
    const answer = String(candidate.answer || '').trim();
    const rawOptions = Array.isArray(candidate.options)
      ? candidate.options.map(option => String(option).trim()).filter(Boolean)
      : [];

    if (!text || !answer) {
      return null;
    }

    const requestedType = candidate.type === 'open' ? 'open' : 'mcq';

    if (requestedType === 'open' || rawOptions.length < 2) {
      return {
        id: String(candidate.id || `open-${index + 1}`),
        text,
        answer,
        exactAnswer: Boolean(candidate.exactAnswer),
        type: 'open',
      };
    }

    const options = rawOptions.includes(answer)
      ? rawOptions
      : [answer, ...rawOptions.filter(option => option !== answer)];

    return {
      id: String(candidate.id || `mcq-${index + 1}`),
      text,
      answer,
      options: options.slice(0, 5),
      type: 'mcq',
    };
  }

  private normalizeAnswer(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeExactAnswer(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
  }
}

export default new AIModel();
