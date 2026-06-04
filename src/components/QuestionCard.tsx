import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import styles from './styles/QuestionCard.styles';

interface Answer {
  id: string;
  label: string;
  text: string;
}

interface QuestionCardProps {
  question: string;
  category: string;
  currentQuestion: number;
  totalQuestions: number;
  timeRemaining: number;
  answers: Answer[];
  selectedAnswerId?: string;
  favorites: number;
  onAnswerSelect: (answerId: string) => void;
  onSubmit: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  category,
  currentQuestion,
  totalQuestions,
  timeRemaining,
  answers,
  selectedAnswerId,
  favorites,
  onAnswerSelect,
  onSubmit,
}) => {
  const filledHearts = Math.floor(favorites);
  const hasHalfHeart = favorites % 1 !== 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>

        <View style={styles.favoriteContainer}>
          <View style={styles.hearts}>
            {Array.from({ length: Math.floor(favorites) }).map((_, i) => (
              <Text key={`full-${i}`} style={styles.heart}>
                ❤️
              </Text>
            ))}
            {hasHalfHeart && <Text style={styles.heart}>🤍</Text>}
          </View>
          <Text style={styles.questionCount}>
            {currentQuestion}/{totalQuestions}
          </Text>
        </View>
      </View>

      <View style={styles.progressBar} />

      <View style={styles.timerSection}>
        <View style={styles.timerCircle}>
          <Text style={styles.timerValue}>{timeRemaining}</Text>
        </View>
      </View>

      <Text style={styles.category}>{category}</Text>
      <Text style={styles.question}>{question}</Text>

      <View style={styles.answersContainer}>
        {answers.map((answer) => (
          <TouchableOpacity
            key={answer.id}
            style={[
              styles.answerButton,
              selectedAnswerId === answer.id && styles.answerButtonSelected,
            ]}
            onPress={() => onAnswerSelect(answer.id)}
          >
            <View style={styles.answerLabel}>{answer.label}</View>
            <Text style={[styles.answerText, selectedAnswerId === answer.id && styles.answerTextSelected]}>
              {answer.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={onSubmit}>
        <Text style={styles.submitButtonText}>✓ Valider</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
