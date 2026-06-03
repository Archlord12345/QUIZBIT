import React, { useState } from 'react';
import {
  Alert,
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

  const currentQuestion = quizState.questions[quizState.currentIndex];

  const completeQuiz = async (finalScore: number) => {
    await onComplete(finalScore, quizState);
    Alert.alert(
      mode === 'battle_royale' ? 'Battle terminée !' : 'Partie terminée !',
      `Score final : ${finalScore}`,
      [{ text: 'OK', onPress: onExit }],
    );
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
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.score}>Score: {quizState.score}</Text>
        <Text style={styles.hearts}>Vies: {quizState.hearts}</Text>
      </View>
      <Text style={styles.modeBadge}>
        {mode === 'battle_royale' ? 'Mode Battle Royale' : 'Mode Solo'}
      </Text>

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
