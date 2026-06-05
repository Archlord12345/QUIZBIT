import { QuizState } from '../controllers/QuizController';

/** Quiz solo réussi : terminé sans perdre toutes ses vies. */
export const isSoloQuizSuccessful = (quiz: QuizState): boolean =>
  (quiz.hearts ?? 0) > 0;
