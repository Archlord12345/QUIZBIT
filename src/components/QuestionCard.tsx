import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, DimensionValue, TextInput } from 'react-native';
import { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  questionIndex: number;
  totalQuestions: number;
  lives: number;
  onAnswerSubmit: (isCorrect: boolean) => void;
  onClose: () => void;
  onNext: () => void;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  questionIndex,
  totalQuestions,
  lives,
  onAnswerSubmit,
  onClose,
  onNext,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(15);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [openAnswer, setOpenAnswer] = useState<string>('');

  // Reset states on question change
  useEffect(() => {
    setSelectedOptionId(null);
    setOpenAnswer('');
    setIsAnswered(false);
    setTimeLeft(15);
  }, [question]);

  // Setup Countdown Timer
  useEffect(() => {
    if (isAnswered) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAnswered, question]);

  // Handle timeout expiration
  useEffect(() => {
    if (timeLeft <= 0 && !isAnswered) {
      if (timerRef.current) clearInterval(timerRef.current);
      handleTimeout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, isAnswered]);

  const handleTimeout = () => {
    setIsAnswered(true);
    onAnswerSubmit(false);
  };

  const handleOptionSelect = (optionId: string) => {
    if (isAnswered) return;
    setSelectedOptionId(optionId);
  };

  const handleValidate = () => {
    if (isAnswered) return;
    
    let isCorrect = false;
    if (question.type === 'open') {
      if (!openAnswer.trim()) return;
      isCorrect = openAnswer.trim().toLowerCase() === (question.correctAnswerId || '').toLowerCase();
    } else {
      if (!selectedOptionId) return;
      isCorrect = selectedOptionId === question.correctAnswerId;
    }

    // Clear timer
    if (timerRef.current) clearInterval(timerRef.current);
    
    setIsAnswered(true);
    onAnswerSubmit(isCorrect);
  };

  // Convert lives into 3 hearts representation
  const renderHearts = () => {
    const maxLives = 3;
    const hearts = [];
    for (let i = 0; i < maxLives; i++) {
      hearts.push(
        <Text key={i} style={styles.heartText}>
          {i < lives ? '❤️' : '🤍'}
        </Text>
      );
    }
    return <View style={styles.heartsContainer}>{hearts}</View>;
  };

  const progressWidth = `${((questionIndex + 1) / totalQuestions) * 100}%`;
  const isSubmitDisabled = question.type === 'open' ? !openAnswer.trim() : !selectedOptionId;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>

        {renderHearts()}

        <View style={styles.progressPill}>
          <Text style={styles.progressText}>
            {String(questionIndex + 1).padStart(2, '0')}/{String(totalQuestions).padStart(2, '0')}
          </Text>
        </View>
      </View>

      <View style={styles.trackerBarContainer}>
        <View style={[styles.trackerBar, { width: progressWidth as DimensionValue }]} />
      </View>

      <View style={styles.content}>
        <View style={styles.timerContainer}>
          <View style={styles.timerCircle}>
            <Text style={styles.timerText}>{timeLeft}s</Text>
          </View>
        </View>

        <View style={styles.categoryContainer}>
          <Text style={styles.categoryText}>{question.category || 'HISTOIRE · QCM'}</Text>
        </View>

        <Text style={styles.questionText}>{question.question}</Text>

        {question.type === 'open' ? (
          <TextInput
            style={styles.openInput}
            value={openAnswer}
            onChangeText={setOpenAnswer}
            placeholder="Saisis ta réponse ici..."
            placeholderTextColor="#a8a29e"
            editable={!isAnswered}
            onSubmitEditing={handleValidate}
          />
        ) : (
          <View style={styles.optionsList}>
            {question.answers?.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              
              let cardStyle: any = styles.optionCard;
              let badgeStyle: any = styles.optionBadge;
              let badgeTextStyle: any = styles.optionBadgeText;

              if (isAnswered) {
                const isCorrectAns = opt.id === question.correctAnswerId;
                const isChosenWrong = isSelected && !isCorrectAns;

                if (isCorrectAns) {
                  cardStyle = [styles.optionCard, styles.optionCorrect];
                  badgeStyle = [styles.optionBadge, styles.badgeCorrect];
                  badgeTextStyle = [styles.optionBadgeText, styles.badgeTextCorrect];
                } else if (isChosenWrong) {
                  cardStyle = [styles.optionCard, styles.optionWrong];
                  badgeStyle = [styles.optionBadge, styles.badgeWrong];
                  badgeTextStyle = [styles.optionBadgeText, styles.badgeTextWrong];
                } else {
                  cardStyle = [styles.optionCard, styles.optionFaded];
                }
              } else if (isSelected) {
                cardStyle = [styles.optionCard, styles.optionSelected];
                badgeStyle = [styles.optionBadge, styles.badgeSelected];
                badgeTextStyle = [styles.optionBadgeText, styles.badgeTextSelected];
              }

              return (
                <TouchableOpacity
                  key={opt.id}
                  disabled={isAnswered}
                  onPress={() => handleOptionSelect(opt.id)}
                  style={cardStyle}
                >
                  <View style={badgeStyle}>
                    <Text style={badgeTextStyle}>{opt.label}</Text>
                  </View>
                  <Text style={styles.optionText}>{opt.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={styles.footer}>
          {isAnswered && question.explanation && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationIcon}>💬</Text>
              <View style={styles.explanationContent}>
                <Text style={styles.explanationTitle}>Explication</Text>
                <Text style={styles.explanationText}>{question.explanation}</Text>
              </View>
            </View>
          )}

          {!isAnswered ? (
            <TouchableOpacity
              disabled={isSubmitDisabled}
              onPress={handleValidate}
              style={[styles.actionButton, isSubmitDisabled && styles.actionButtonDisabled]}
            >
              <Text style={[styles.actionButtonText, isSubmitDisabled && styles.actionButtonTextDisabled]}>
                ✓ Valider
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={onNext} style={styles.actionButton}>
              <Text style={styles.actionButtonText}>
                {questionIndex + 1 >= totalQuestions || lives <= 0 ? 'Terminer et voir le score' : 'Continuer →'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#eef3ff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  closeButton: { padding: 8, backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#dfe7f5' },
  heartsContainer: { flexDirection: 'row', gap: 4 },
  progressPill: { backgroundColor: '#152a63', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  progressText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  trackerBarContainer: { width: '100%', height: 6, backgroundColor: '#e7e5e4' },
  trackerBar: { height: '100%', backgroundColor: '#2563eb' },
  content: { flex: 1, padding: 20 },
  timerContainer: { alignItems: 'center', marginVertical: 10 },
  timerCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'white', borderWidth: 1, borderColor: '#f5f5f4', alignItems: 'center', justifyContent: 'center' },
  timerText: { fontSize: 16, fontWeight: 'bold', color: '#0f1c44' },
  categoryContainer: { alignItems: 'center', marginBottom: 16 },
  categoryText: { backgroundColor: '#e0f2fe', color: '#0284c7', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, overflow: 'hidden' },
  questionText: { fontSize: 22, fontWeight: 'bold', color: '#0f1c44', textAlign: 'center', marginBottom: 24 },
  optionsList: { gap: 14 },
  optionCard: { width: '100%', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#e7e5e4', backgroundColor: 'white', flexDirection: 'row', alignItems: 'center', gap: 16 },
  optionSelected: { backgroundColor: '#eaf1ff', borderColor: '#93b4f7' },
  optionCorrect: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  optionWrong: { backgroundColor: '#fff1f2', borderColor: '#f43f5e' },
  optionFaded: { opacity: 0.6 },
  optionBadge: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#d8e4fb', backgroundColor: '#eaf1ff', alignItems: 'center', justifyContent: 'center' },
  badgeSelected: { backgroundColor: '#2563eb', borderColor: '#1d4ed8' },
  badgeCorrect: { backgroundColor: '#10b981', borderColor: '#059669' },
  badgeWrong: { backgroundColor: '#f43f5e', borderColor: '#e11d48' },
  optionBadgeText: { color: '#1d4ed8', fontWeight: 'bold', fontSize: 14 },
  badgeTextSelected: { color: 'white' },
  badgeTextCorrect: { color: 'white' },
  badgeTextWrong: { color: 'white' },
  optionText: { fontSize: 14, fontWeight: 'bold', color: '#0f1c44', flex: 1 },
  openInput: { backgroundColor: 'white', borderWidth: 1, borderColor: '#dfe7f5', borderRadius: 24, padding: 20, fontSize: 16, color: '#0f1c44', fontWeight: 'bold', textAlign: 'center', marginVertical: 10 },
  footer: { marginTop: 'auto', paddingTop: 20, gap: 16 },
  explanationBox: { backgroundColor: '#f5f5f4', padding: 16, borderRadius: 24, flexDirection: 'row', gap: 12 },
  explanationContent: { flex: 1 },
  explanationTitle: { fontSize: 11, fontWeight: 'bold', color: '#2563eb', textTransform: 'uppercase', marginBottom: 4 },
  explanationText: { fontSize: 12, color: '#3a4a6b' },
  actionButton: { width: '100%', paddingVertical: 18, borderRadius: 24, backgroundColor: '#2563eb', alignItems: 'center' },
  actionButtonDisabled: { backgroundColor: '#f5f5f4', borderWidth: 1, borderColor: '#e7e5e4' },
  actionButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  actionButtonTextDisabled: { color: '#a8a29e' },
  heartText: {
    fontSize: 16,
    marginHorizontal: 1,
  },
  closeIcon: {
    fontSize: 16,
    color: '#78716c',
    fontWeight: 'bold',
  },
  explanationIcon: {
    fontSize: 18,
  },
});
