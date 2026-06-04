import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import QuizController, { QuizState } from '../controllers/QuizController';
import { GameMode } from '../controllers/ScoreController';
import { COLORS, SPACING } from '../utils/theme';

type QuizViewProps = {
  initialQuiz: QuizState;
  mode: GameMode;
  onComplete: (finalScore: number, quiz: QuizState) => Promise<void>;
  onExit: () => void;
};

const QuizView = ({ initialQuiz, mode, onComplete, onExit }: QuizViewProps) => {
  const [quizState, setQuizState] = useState(initialQuiz);
  const [openAnswer, setOpenAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [completedScore, setCompletedScore] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(
    initialQuiz.timeLimitSeconds || 0,
  );

  const currentQuestion = quizState.questions[quizState.currentIndex];

  const timedQuestionSeconds = quizState.timeLimitSeconds || 0;

  const completeQuiz = async (finalScore: number) => {
    await onComplete(finalScore, quizState);
    setCompletedScore(finalScore);
  };

  const handleAnswer = async (answer: string) => {
    if (!answer.trim() || submitting) {
      return;
    }

    const previousScore = quizState.score;
    const previousHearts = quizState.hearts;
    setSubmitting(true);
    setFeedback('');

    try {
      await QuizController.submitAnswer(
        answer,
        quizState,
        nextState => {
          setQuizState(nextState);
          if (nextState.score > previousScore) {
            setFeedback('Bonne réponse !');
          } else if (nextState.hearts < previousHearts) {
            setFeedback('Mauvaise réponse, essaye encore.');
          }
          setOpenAnswer('');
        },
        completeQuiz,
        { advanceOnWrong: mode === 'battle_royale' },
      );
    } finally {
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
    setSecondsLeft(timedQuestionSeconds);
  }, [quizState.currentIndex, timedQuestionSeconds]);

  React.useEffect(() => {
    if (!timedQuestionSeconds || submitting || completedScore !== null) {
      return undefined;
    }

    const timer = setInterval(() => {
      setSecondsLeft(previous => {
        if (previous <= 1) {
          clearInterval(timer);
          setFeedback('Temps écoulé, question suivante.');
          setTimeout(() => handleAnswer('__timeout__'), 0);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // handleAnswer is intentionally omitted to keep one stable timer per question.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedScore, quizState.currentIndex, submitting, timedQuestionSeconds]);

  if (completedScore !== null) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Quiz terminé</Text>
          <Text style={styles.summaryScore}>Score final : {completedScore}</Text>
          <Text style={styles.summaryIntro}>
            Voici la liste complète des questions et des réponses attendues.
          </Text>
          {quizState.questions.map((question, index) => (
            <View key={question.id} style={styles.summaryQuestion}>
              <Text style={styles.summaryQuestionTitle}>
                #{index + 1} · {question.type === 'mcq' ? 'QCM' : 'QRO'}
              </Text>
              <Text style={styles.summaryText}>{question.text}</Text>
              <Text style={styles.summaryAnswer}>Réponse : {question.answer}</Text>
              {question.options?.length ? (
                <Text style={styles.summaryOptions}>
                  Choix : {question.options.join(' · ')}
                </Text>
              ) : null}
            </View>
          ))}
          <TouchableOpacity style={styles.submitButton} onPress={onExit}>
            <Text style={styles.submitButtonText}>Retour à l accueil</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.score}>Score: {quizState.score}</Text>
        <Text style={styles.hearts}>Vies: {quizState.hearts}</Text>
      </View>
      <Text style={styles.modeBadge}>
        {mode === 'battle_royale' ? 'Mode Battle Royale' : 'Mode Solo'}
      </Text>
      {timedQuestionSeconds ? (
        <Text style={styles.timerBadge}>Temps restant : {secondsLeft}s</Text>
      ) : null}

      <View style={styles.questionCard}>
        <Text style={styles.progress}>
          Question {quizState.currentIndex + 1}/{quizState.questions.length}
        </Text>
        <Text style={styles.questionText}>{currentQuestion?.text}</Text>

        {currentQuestion?.type === 'mcq' ? (
          <View style={styles.optionsContainer}>
            {currentQuestion.options?.map((option: string, index: number) => (
              <TouchableOpacity
                key={`${option}-${index}`}
                style={[
                  styles.optionButton,
                  submitting && styles.optionDisabled,
                ]}
                onPress={() => handleAnswer(option)}
                disabled={submitting}
              >
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View>
            <Text style={styles.answerMode}>
              {currentQuestion.exactAnswer
                ? 'Réponse exacte requise : orthographe stricte.'
                : 'Réponse libre : l IA accepte synonymes et petites fautes.'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Tape ta réponse"
              placeholderTextColor="#6B778C"
              value={openAnswer}
              onChangeText={setOpenAnswer}
              editable={!submitting}
              returnKeyType="send"
              onSubmitEditing={() => handleAnswer(openAnswer)}
            />
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!openAnswer.trim() || submitting) && styles.optionDisabled,
              ]}
              onPress={() => handleAnswer(openAnswer)}
              disabled={!openAnswer.trim() || submitting}
            >
              <Text style={styles.submitButtonText}>Valider</Text>
            </TouchableOpacity>
          </View>
        )}

        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
      </View>

      <TouchableOpacity style={styles.quitButton} onPress={onExit}>
        <Text style={styles.quitText}>Quitter</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    flexGrow: 1,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 50,
  },
  score: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  hearts: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  modeBadge: {
    color: COLORS.secondary,
    fontWeight: '800',
    marginBottom: 18,
    textAlign: 'center',
  },
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 25,
    elevation: 10,
    justifyContent: 'center',
    minHeight: 400,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
  },
  progress: {
    color: COLORS.secondary,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  questionText: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 40,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 15,
  },
  optionButton: {
    backgroundColor: '#F0F2F5',
    borderColor: '#E1E4E8',
    borderRadius: 15,
    borderWidth: 1,
    padding: 18,
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FAFBFC',
    borderColor: '#DFE1E6',
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 15,
    padding: 15,
  },
  answerMode: {
    color: '#5E6C84',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 16,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  feedback: {
    color: COLORS.text,
    fontWeight: '700',
    marginTop: 20,
    textAlign: 'center',
  },
  timerBadge: {
    alignSelf: 'center',
    backgroundColor: COLORS.warning,
    borderRadius: 999,
    color: COLORS.primary,
    fontWeight: '900',
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    gap: 14,
    marginTop: 50,
    padding: SPACING.lg,
  },
  summaryTitle: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryScore: {
    color: COLORS.accent,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryIntro: {
    color: '#5E6C84',
    lineHeight: 20,
    textAlign: 'center',
  },
  summaryQuestion: {
    backgroundColor: '#F4F5F7',
    borderRadius: 16,
    gap: 6,
    padding: 12,
  },
  summaryQuestionTitle: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  summaryText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  summaryAnswer: {
    color: COLORS.success,
    fontWeight: '900',
  },
  summaryOptions: {
    color: '#5E6C84',
    fontSize: 12,
  },
  quitButton: {
    alignSelf: 'center',
    marginBottom: 30,
    marginTop: 'auto',
  },
  quitText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default QuizView;
