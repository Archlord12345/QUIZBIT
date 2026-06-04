import Config from 'react-native-config';
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
  questions: Question[];
  provider?: string;
  model?: string;
};

class AIModel {
  private geminiKey = this.readRuntimeValue('GEMINI_API_KEY');

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
    const onlineQuestions = this.normalizeQuestions(response.questions, count);
    if (onlineQuestions.length === 0) {
      throw new Error('Le serveur IA n a retourne aucune question exploitable.');
    }

    return onlineQuestions;
  }

  async validateAnswer(
    userAnswer: string,
    correctAnswer: string,
  ): Promise<boolean> {
    if (
      this.normalizeAnswer(userAnswer) === this.normalizeAnswer(correctAnswer)
    ) {
      return true;
    }

    if (!this.geminiKey) {
      return false;
    }

    return this.validateAnswerWithGemini(userAnswer, correctAnswer);
  }

  private async validateAnswerWithGemini(
    userAnswer: string,
    correctAnswer: string,
  ): Promise<boolean> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: [
                    'Tu verifies une reponse ouverte de quiz en francais.',
                    'Reponds uniquement par OUI ou NON.',
                    `Reponse attendue: ${correctAnswer}`,
                    `Reponse utilisateur: ${userAnswer}`,
                    'Accepte les synonymes et formulations equivalentes, refuse les contresens.',
                  ].join(' '),
                },
              ],
            },
          ],
        }),
      },
    );
    const data = await response.json();
    if (!response.ok) {
      return false;
    }

    const text = String(data?.candidates?.[0]?.content?.parts?.[0]?.text || '');
    return this.normalizeAnswer(text).startsWith('oui');
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
      .trim();
  }

  private readRuntimeValue(name: string): string {
    const nativeConfig = Config as unknown as Record<
      string,
      string | undefined
    >;
    const maybeProcess = (
      globalThis as unknown as { process?: { env?: Record<string, string> } }
    ).process;
    return nativeConfig[name] || maybeProcess?.env?.[name] || '';
  }
}

export default new AIModel();
