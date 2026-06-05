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
import { COLORS, LINE, SPACING } from '../utils/theme';
import { LAYOUT } from '../utils/ui';

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
    backgroundColor: COLORS.background,
    paddingHorizontal: LAYOUT.screenPaddingH,
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
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LINE,
  },
  settingsText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
});

export default AuthView;
