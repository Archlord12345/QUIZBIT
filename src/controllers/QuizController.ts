import AIModel, { Question, QuizGenerationOptions } from '../models/AIModel';

export type QuizState = {
  theme: string;
  questions: Question[];
  hearts: number;
  score: number;
  currentIndex: number;
  timeLimitSeconds?: number;
};

class QuizController {
  private currentQuiz: QuizState | null = null;

  async initQuiz(
    theme: string,
    options: QuizGenerationOptions = {},
  ): Promise<QuizState> {
    const questions = await AIModel.generateQuestions(theme, options);

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
    options: { advanceOnWrong?: boolean } = {},
  ) {
    const currentQuestion = quizState.questions[quizState.currentIndex];

    if (!currentQuestion) {
      onComplete(quizState.score);
      return;
    }

    const isCorrect = await AIModel.validateAnswer(
      answer,
      currentQuestion.answer,
      currentQuestion,
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
      if (options.advanceOnWrong) {
        const nextIndex = quizState.currentIndex + 1;
        if (nextIndex < quizState.questions.length) {
          setQuizState({ ...quizState, currentIndex: nextIndex });
        } else {
          onComplete(quizState.score);
        }
        return;
      }

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
