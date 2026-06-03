import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { COLORS, SPACING } from '../utils/theme';
import QuizController from '../controllers/QuizController';

const { width } = Dimensions.get('window');

const HomeView = ({ navigation }: any) => {
  const [theme, setTheme] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!theme) return;
    setLoading(true);
    await QuizController.initQuiz(theme, navigation);
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeInUp.delay(200)} style={styles.header}>
        <Text style={styles.logo}>QuizBit</Text>
        <Text style={styles.subtitle}>IA-Powered Quiz Master</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400)} style={styles.card}>
        <Text style={styles.label}>Entrez un thème</Text>
        <TextInput
          style={styles.input}
          placeholder="ex: Mathématiques, Science-Fiction..."
          placeholderTextColor="#6B778C"
          value={theme}
          onChangeText={setTheme}
        />

        <TouchableOpacity 
          style={[styles.button, !theme && styles.buttonDisabled]} 
          onPress={handleStart}
          disabled={loading || !theme}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Génération...' : 'Commencer le Quiz'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.modeButton}>
          <Text style={styles.modeText}>Mode Online</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modeButton}>
          <Text style={styles.modeText}>Multiplayer Local</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 40,
  },
  modeButton: {
    borderWidth: 1,
    borderColor: COLORS.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  modeText: {
    color: 'white',
    fontSize: 14,
  }
});

export default HomeView;
