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
import { COLORS, SPACING } from '../utils/theme';
import QuizController, { QuizState } from '../controllers/QuizController';

type QuizViewProps = {
  initialQuiz: QuizState;
  onExit: () => void;
};

const QuizView = ({ initialQuiz, onExit }: QuizViewProps) => {
  const [quizState, setQuizState] = useState(initialQuiz);
  const [openAnswer, setOpenAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const currentQuestion = quizState.questions[quizState.currentIndex];

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
        (finalScore: number) => {
          Alert.alert('Partie terminée !', `Score final : ${finalScore}`, [
            { text: 'OK', onPress: onExit },
          ]);
        },
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.score}>Score: {quizState.score}</Text>
        <Text style={styles.hearts}>Coeurs: {quizState.hearts}/3</Text>
      </View>

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
    flexGrow: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 50,
    marginBottom: 20,
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
  questionCard: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: SPACING.xl,
    minHeight: 400,
    justifyContent: 'center',
    elevation: 10,
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
    fontSize: 24,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '700',
    marginBottom: 40,
  },
  optionsContainer: {
    gap: 15,
  },
  optionButton: {
    backgroundColor: '#F0F2F5',
    padding: 18,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E1E4E8',
  },
  optionDisabled: {
    opacity: 0.6,
  },
  optionText: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DFE1E6',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 15,
    backgroundColor: '#FAFBFC',
  },
  submitButton: {
    backgroundColor: COLORS.accent,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  feedback: {
    marginTop: 20,
    textAlign: 'center',
    color: COLORS.text,
    fontWeight: '700',
  },
  quitButton: {
    marginTop: 'auto',
    marginBottom: 30,
    alignSelf: 'center',
  },
  quitText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default QuizView;
