import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AuthController, { UserAccount } from '../controllers/AuthController';
import { checkApiHealth } from '../utils/networkHealth';
import { COLORS, SPACING, PLACEHOLDER, HELPER } from '../utils/theme';
import { RADIUS, SHADOW, UI } from '../utils/ui';

interface LoginFormProps {
  onSuccess: (account: UserAccount) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState<boolean>(true);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [apiReachable, setApiReachable] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const probe = async () => {
      const health = await checkApiHealth();
      if (!active) return;
      setApiReachable(health.ok);
      setApiStatus(
        health.ok
          ? health.message ||
              `${health.mode === 'local' ? 'Mode offline' : 'Mode cloud'} — ${health.url}`
          : health.message,
      );
    };
    probe();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Veuillez renseigner un email valide.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (!isLoginMode && !name.trim()) {
      setError('Veuillez renseigner votre nom.');
      return;
    }

    setLoading(true);
    try {
      const health = await checkApiHealth();
      if (!health.ok) {
        setError(health.message);
        setApiReachable(false);
        setApiStatus(health.message);
        return;
      }

      const account = isLoginMode
        ? await AuthController.login(cleanEmail, password)
        : await AuthController.register(cleanEmail, password, name);
      onSuccess(account);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Une erreur d'authentification est survenue.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isLoginMode ? 'Bon retour,' : 'Bienvenue,'} {'\n'}
            <Text style={styles.titleHighlight}>
              {isLoginMode ? 'Champion.' : 'Futur Pro.'}
            </Text>
          </Text>
          <Text style={styles.subtitle}>
            {isLoginMode
              ? 'Connecte-toi pour reprendre tes battles et lancer de nouveaux quiz.'
              : 'Crée un compte pour enregistrer tes scores et défier tes amis.'}
          </Text>
        </View>

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleButton, isLoginMode && styles.toggleButtonActive]}
            onPress={() => {
              setError(null);
              setIsLoginMode(true);
            }}
          >
            <Text style={[styles.toggleText, isLoginMode && styles.toggleTextActive]}>
              Connexion
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, !isLoginMode && styles.toggleButtonActive]}
            onPress={() => {
              setError(null);
              setIsLoginMode(false);
            }}
          >
            <Text style={[styles.toggleText, !isLoginMode && styles.toggleTextActive]}>
              Inscription
            </Text>
          </TouchableOpacity>
        </View>

        {apiStatus ? (
          <View
            style={[
              styles.statusBox,
              apiReachable ? styles.statusOk : styles.statusWarn,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                apiReachable ? styles.statusTextOk : styles.statusTextWarn,
              ]}
            >
              {apiStatus}
            </Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {!isLoginMode ? (
          <View style={styles.inputContainer}>
            <View style={styles.inputContentContainer}>
              <Text style={styles.inputLabel}>NOM</Text>
              <TextInput
                style={styles.inputFlex}
                value={name}
                onChangeText={setName}
                placeholder="Ton pseudo"
                placeholderTextColor={PLACEHOLDER}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          <View style={styles.inputContentContainer}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <TextInput
              style={styles.inputFlex}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="email@exemple.com"
              placeholderTextColor={PLACEHOLDER}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputContentContainer}>
            <Text style={styles.inputLabel}>MOT DE PASSE</Text>
            <TextInput
              style={styles.inputFlex}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              placeholderTextColor={PLACEHOLDER}
            />
          </View>
          <TouchableOpacity
            style={styles.inputRightIconContainer}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Text style={styles.inputRightIcon}>{showPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {isLoginMode ? 'Se connecter' : 'Créer mon compte'}
              </Text>
              <Text style={styles.submitArrow}>→</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.footerText}>
          En continuant, tu acceptes les conditions et la politique de confidentialité.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.md,
    backgroundColor: 'transparent',
  },
  card: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.sm,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  header: { marginBottom: SPACING.lg },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.text,
    lineHeight: 38,
  },
  titleHighlight: { color: COLORS.secondary },
  subtitle: {
    fontSize: 13,
    color: HELPER,
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: UI.chipBg,
    borderRadius: RADIUS.pill,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
  },
  toggleButtonActive: { backgroundColor: COLORS.primary },
  toggleText: { fontSize: 13, fontWeight: '800', color: HELPER },
  toggleTextActive: { color: COLORS.textOnDark },
  statusBox: {
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  statusOk: { backgroundColor: 'rgba(34, 197, 94, 0.12)' },
  statusWarn: { backgroundColor: UI.errorBg },
  statusText: { fontSize: 11, fontWeight: '700', lineHeight: 16 },
  statusTextOk: { color: COLORS.success },
  statusTextWarn: { color: COLORS.error },
  errorBox: {
    backgroundColor: UI.errorBg,
    padding: 12,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.error, fontSize: 12, fontWeight: '800' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: UI.line,
    ...SHADOW.soft,
  },
  inputContentContainer: { flex: 1, flexDirection: 'column' },
  inputLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: PLACEHOLDER,
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  inputFlex: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    padding: 0,
    height: 20,
  },
  inputRightIconContainer: { padding: 4 },
  inputRightIcon: { fontSize: 16, color: HELPER },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.sm,
  },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  submitArrow: { fontSize: 15, color: '#fff', fontWeight: '800' },
  disabledButton: { opacity: 0.7 },
  footerText: {
    fontSize: 11,
    color: HELPER,
    textAlign: 'center',
    marginTop: SPACING.lg,
    lineHeight: 16,
  },
});
