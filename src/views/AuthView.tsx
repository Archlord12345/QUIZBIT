import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import LogoMark from '../components/LogoMark';
import { UserAccount } from '../controllers/AuthController';
import { LoginForm } from '../components/LoginForm';
import { COLORS, SPACING } from '../utils/theme';

type AuthViewProps = NativeStackScreenProps<any> & {
  onAuthenticated: (account: UserAccount) => void;
};

const AuthView = ({ onAuthenticated, navigation }: AuthViewProps) => {
  return (
    <ScrollView 
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.logoContainer}>
        <LogoMark subtitle="Quiz IA, scores cloud et battle royale" />
      </View>

      <LoginForm onSuccess={onAuthenticated} />

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Settings')}
        activeOpacity={0.8}
      >
        <Text style={styles.settingsText}>⚙ Paramètres de connexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xl,
  },
  logoContainer: {
    marginBottom: SPACING.lg,
  },
  settingsButton: {
    alignSelf: 'center',
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  settingsText: {
    color: COLORS.secondary,
    fontSize: 13,
    fontWeight: '800',
  },
});

export default AuthView;
