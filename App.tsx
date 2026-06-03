import React from 'react';
import HomeView from './src/views/HomeView';
import QuizView from './src/views/QuizView';
import { QuizState } from './src/controllers/QuizController';

const App = () => {
  const [quiz, setQuiz] = React.useState<QuizState | null>(null);

  if (quiz) {
    return <QuizView initialQuiz={quiz} onExit={() => setQuiz(null)} />;
  }

  return <HomeView onQuizReady={setQuiz} />;
};

export default App;
