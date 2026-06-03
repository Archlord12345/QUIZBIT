import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, SPACING } from '../utils/theme';
import QuizController, { QuizState } from '../controllers/QuizController';

type HomeViewProps = {
  onQuizReady: (quiz: QuizState) => void;
};

const HomeView = ({ onQuizReady }: HomeViewProps) => {
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    const cleanTheme = theme.trim();
    if (!cleanTheme || loading) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const quiz = await QuizController.initQuiz(cleanTheme);
      onQuizReady(quiz);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Impossible de creer le quiz pour le moment.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.logo}>QuizBit</Text>
        <Text style={styles.subtitle}>Quiz IA jouable meme hors ligne</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Entrez un thème</Text>
        <TextInput
          style={styles.input}
          placeholder="ex: Mathématiques, Science-Fiction..."
          placeholderTextColor="#6B778C"
          value={theme}
          onChangeText={setTheme}
          editable={!loading}
          returnKeyType="done"
          onSubmitEditing={handleStart}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[
            styles.button,
            (!theme.trim() || loading) && styles.buttonDisabled,
          ]}
          onPress={handleStart}
          disabled={loading || !theme.trim()}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Commencer le Quiz</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.modeText}>
          Online si une clé Gemini est configurée
        </Text>
        <Text style={styles.modeText}>Fallback local actif sans connexion</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 50,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    color: COLORS.secondary,
    fontSize: 16,
    marginTop: 5,
  },
  card: {
    backgroundColor: 'white',
    padding: SPACING.xl,
    borderRadius: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  label: {
    fontSize: 18,
    color: COLORS.text,
    marginBottom: 10,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#DFE1E6',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 20,
    backgroundColor: '#FAFBFC',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: COLORS.accent,
    padding: 18,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#B3D4FF',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 40,
    gap: 8,
  },
  modeText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default HomeView;
