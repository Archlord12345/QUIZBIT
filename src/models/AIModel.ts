import Config from 'react-native-config';

export type Question = {
  id: string;
  text: string;
  options?: string[];
  answer: string;
  type: 'mcq' | 'open';
};

class AIModel {
  private geminiKey = this.readRuntimeValue('GEMINI_API_KEY');

  async generateQuestions(
    theme: string,
    count: number = 5,
  ): Promise<Question[]> {
    if (!this.geminiKey) {
      throw new Error(
        'GEMINI_API_KEY doit etre configuree pour generer un quiz reel.',
      );
    }

    const cleanTheme = theme.trim();
    if (!cleanTheme) {
      throw new Error('Theme manquant.');
    }

    const onlineQuestions = await this.fetchFromGemini(cleanTheme, count);
    if (onlineQuestions.length === 0) {
      throw new Error('Gemini n a retourne aucune question exploitable.');
    }

    return onlineQuestions;
  }

  private async fetchFromGemini(
    theme: string,
    count: number,
  ): Promise<Question[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiKey}`;
    const prompt = [
      `Genere ${count} questions de quiz en francais sur "${theme}".`,
      'Reponds uniquement avec un tableau JSON valide.',
      'Schema: [{"id":"1","text":"Question","options":["A","B","C","D"],"answer":"A","type":"mcq"}].',
      'Chaque question doit avoir 4 options et la reponse doit exactement correspondre a une option.',
    ].join(' ');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== 'string') {
      throw new Error('Gemini response does not contain text.');
    }

    return this.normalizeQuestions(this.parseQuestionsJson(text), count);
  }

  async validateAnswer(
    userAnswer: string,
    correctAnswer: string,
  ): Promise<boolean> {
    return (
      this.normalizeAnswer(userAnswer) === this.normalizeAnswer(correctAnswer)
    );
  }

  private parseQuestionsJson(text: string): unknown {
    const withoutCodeFence = text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();
    const firstArrayChar = withoutCodeFence.indexOf('[');
    const lastArrayChar = withoutCodeFence.lastIndexOf(']');

    if (firstArrayChar === -1 || lastArrayChar === -1) {
      throw new Error('No JSON array found in Gemini response.');
    }

    return JSON.parse(
      withoutCodeFence.slice(firstArrayChar, lastArrayChar + 1),
    );
  }

  private normalizeQuestions(value: unknown, count: number): Question[] {
    if (!Array.isArray(value)) {
      throw new Error('Gemini response is not an array.');
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

    const options = rawOptions.includes(answer)
      ? rawOptions
      : [answer, ...rawOptions.filter(option => option !== answer)];

    if (options.length < 2) {
      return {
        id: String(candidate.id || `open-${index + 1}`),
        text,
        answer,
        type: 'open',
      };
    }

    return {
      id: String(candidate.id || `mcq-${index + 1}`),
      text,
      answer,
      options: options.slice(0, 4),
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
