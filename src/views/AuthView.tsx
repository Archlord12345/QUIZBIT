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
import LogoMark from '../components/LogoMark';
import AuthController, { UserAccount } from '../controllers/AuthController';
import { COLORS, SPACING } from '../utils/theme';

type AuthViewProps = {
  onAuthenticated: (account: UserAccount) => void;
};

const AuthView = ({ onAuthenticated }: AuthViewProps) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const account =
        mode === 'register'
          ? await AuthController.register(email, password, displayName)
          : await AuthController.login(email, password);
      onAuthenticated(account);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Authentification impossible.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <LogoMark subtitle="Connexion, scores et battle royale" />

      <View style={styles.card}>
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.tabActive]}
            onPress={() => setMode('login')}
          >
            <Text style={styles.tabText}>Connexion</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'register' && styles.tabActive]}
            onPress={() => setMode('register')}
          >
            <Text style={styles.tabText}>Créer compte</Text>
          </TouchableOpacity>
        </View>

        {mode === 'register' ? (
          <TextInput
            style={styles.input}
            placeholder="Pseudo"
            placeholderTextColor="#6B778C"
            value={displayName}
            onChangeText={setDisplayName}
          />
        ) : null}

        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="Email"
          placeholderTextColor="#6B778C"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          placeholderTextColor="#6B778C"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.primaryButton} onPress={submit}>
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {mode === 'register' ? 'Créer le compte' : 'Se connecter'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.hint}>
          Firebase Auth et Firestore sont obligatoires : l'app mobile lit et
          écrit uniquement les données réelles de ton projet Firebase.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
  },
  logo: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.secondary,
    fontSize: 16,
    marginBottom: 32,
    marginTop: 8,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: SPACING.xl,
    gap: 14,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    borderColor: '#DFE1E6',
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  tabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabText: {
    color: COLORS.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FAFBFC',
    borderColor: '#DFE1E6',
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 16,
    padding: 15,
  },
  error: {
    color: COLORS.error,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    padding: 16,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: COLORS.secondary,
    borderRadius: 10,
    borderWidth: 1,
    padding: 14,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  hint: {
    color: '#6B778C',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default AuthView;
