import AIModel, { Question } from '../models/AIModel';

export type QuizState = {
  theme: string;
  questions: Question[];
  hearts: number;
  score: number;
  currentIndex: number;
};

class QuizController {
  private currentQuiz: QuizState | null = null;

  async initQuiz(theme: string): Promise<QuizState> {
    const questions = await AIModel.generateQuestions(theme);

    if (questions.length === 0) {
      throw new Error('Aucune question disponible pour ce theme.');
    }

    this.currentQuiz = {
      theme: theme.trim(),
      questions,
      hearts: 3,
      score: 0,
      currentIndex: 0,
    };

    return this.currentQuiz;
  }

  async submitAnswer(
    answer: string,
    quizState: QuizState,
    setQuizState: (state: QuizState) => void,
    onComplete: (finalScore: number) => void,
  ) {
    const currentQuestion = quizState.questions[quizState.currentIndex];

    if (!currentQuestion) {
      onComplete(quizState.score);
      return;
    }

    const isCorrect = await AIModel.validateAnswer(
      answer,
      currentQuestion.answer,
    );

    if (isCorrect) {
      const newScore = quizState.score + 10;
      const nextIndex = quizState.currentIndex + 1;

      if (nextIndex < quizState.questions.length) {
        setQuizState({
          ...quizState,
          score: newScore,
          currentIndex: nextIndex,
        });
      } else {
        onComplete(newScore);
      }
    } else {
      const newHearts = quizState.hearts - 1;
      if (newHearts <= 0) {
        onComplete(quizState.score);
      } else {
        setQuizState({ ...quizState, hearts: newHearts });
      }
    }
  }
}

export default new QuizController();
