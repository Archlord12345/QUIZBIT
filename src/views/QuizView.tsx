import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { COLORS, SPACING } from '../utils/theme';
import VoiceController from '../controllers/VoiceController';
import QuizController from '../controllers/QuizController';

const { width } = Dimensions.get('window');

const QuizView = ({ route, navigation }: any) => {
  const [quizState, setQuizState] = useState(route.params.quiz);
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');
  
  const currentQuestion = quizState.questions[quizState.currentIndex];

  const handleAnswer = async (answer: string) => {
    await QuizController.submitAnswer(
      answer, 
      quizState, 
      setQuizState, 
      (finalScore: number) => {
        Alert.alert("Partie terminée !", `Score final : ${finalScore}`, [
          { text: "OK", onPress: () => navigation.navigate('Home') }
        ]);
      }
    );
  };

  const toggleVoice = async () => {
    if (isListening) {
      await VoiceController.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      setVoiceText('Écoute...');
      await VoiceController.startListening((text) => {
        setVoiceText(text);
        handleAnswer(text);
        setIsListening(false);
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.score}>Score: {quizState.score}</Text>
        <View style={styles.heartsContainer}>
          {[...Array(3)].map((_, i) => (
            <Text key={i} style={styles.heart}>
              {i < quizState.hearts ? '❤️' : '🖤'}
            </Text>
          ))}
        </View>
      </View>

      <Animated.View layout={Layout.springify()} style={styles.questionCard}>
        <Animated.Text entering={FadeIn} key={quizState.currentIndex} style={styles.questionText}>
          {currentQuestion?.text}
        </Animated.Text>
        
        <View style={styles.optionsContainer}>
          {currentQuestion?.options?.map((option: string, index: number) => (
            <TouchableOpacity 
              key={index} 
              style={styles.optionButton}
              onPress={() => handleAnswer(option)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={[styles.voiceButton, isListening && styles.voiceButtonActive]}
          onPress={toggleVoice}
        >
          <Text style={styles.voiceIcon}>{isListening ? '🛑' : '🎤'}</Text>
        </TouchableOpacity>
        {voiceText ? (
          <Animated.Text entering={FadeIn} exiting={FadeOut} style={styles.voiceTextPreview}>
            "{voiceText}"
          </Animated.Text>
        ) : null}
      </Animated.View>

      <TouchableOpacity style={styles.quitButton} onPress={() => navigation.goBack()}>
        <Text style={styles.quitText}>Quitter</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  heartsContainer: {
    flexDirection: 'row',
  },
  heart: {
    fontSize: 26,
    marginLeft: 5,
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
  optionText: {
    fontSize: 18,
    color: COLORS.text,
    textAlign: 'center',
    fontWeight: '500',
  },
  voiceButton: {
    marginTop: 40,
    backgroundColor: COLORS.primary,
    width: 70,
    height: 70,
    borderRadius: 35,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  voiceButtonActive: {
    backgroundColor: COLORS.error,
  },
  voiceIcon: {
    fontSize: 30,
  },
  voiceTextPreview: {
    textAlign: 'center',
    marginTop: 15,
    color: COLORS.text,
    fontStyle: 'italic',
    fontSize: 16,
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
  }
});

export default QuizView;
