import AIModel from '../models/AIModel';

class QuizController {
  private currentQuiz: any = null;

  async initQuiz(theme: string, navigation: any) {
    try {
      const questions = await AIModel.generateQuestions(theme);
      this.currentQuiz = {
        theme,
        questions,
        hearts: 3,
        score: 0,
        currentIndex: 0
      };
      
      navigation.navigate('Quiz', { quiz: this.currentQuiz });
    } catch (error) {
      console.error("Failed to init quiz", error);
    }
  }

  async submitAnswer(answer: string, quizState: any, setQuizState: Function, onComplete: Function) {
    const currentQuestion = quizState.questions[quizState.currentIndex];
    
    let isCorrect = false;
    if (currentQuestion.type === 'mcq') {
      isCorrect = answer.toLowerCase() === currentQuestion.answer.toLowerCase();
    } else {
      isCorrect = await AIModel.validateAnswer(answer, currentQuestion.answer);
    }

    if (isCorrect) {
      const newScore = quizState.score + 10;
      const nextIndex = quizState.currentIndex + 1;
      
      if (nextIndex < quizState.questions.length) {
        setQuizState({ ...quizState, score: newScore, currentIndex: nextIndex });
      } else {
        // End of quiz or generate more (heart system)
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
