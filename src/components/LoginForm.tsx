import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import AuthController, { UserAccount } from '../controllers/AuthController';

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
      const account = isLoginMode
        ? await AuthController.login(cleanEmail, password)
        : await AuthController.register(cleanEmail, password, name);
      onSuccess(account);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur d\'authentification est survenue.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {isLoginMode ? 'Bon retour,' : 'Bienvenue,'} {'\n'}
            <Text style={styles.titleHighlight}>{isLoginMode ? 'Champion.' : 'Futur Pro.'}</Text>
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
            <Text style={[styles.toggleText, isLoginMode && styles.toggleTextActive]}>Connexion</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleButton, !isLoginMode && styles.toggleButtonActive]}
            onPress={() => {
              setError(null);
              setIsLoginMode(false);
            }}
          >
            <Text style={[styles.toggleText, !isLoginMode && styles.toggleTextActive]}>Créer un compte</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!isLoginMode && (
          <View style={styles.inputContainer}>
            <View style={styles.inputLeftIconContainer}>
              <Text style={styles.inputLeftIcon}>👤</Text>
            </View>
            <View style={styles.inputContentContainer}>
              <Text style={styles.inputLabel}>NOM COMPLET</Text>
              <TextInput
                style={styles.inputFlex}
                value={name}
                onChangeText={setName}
                placeholder="Ex. Léo Mendes"
                placeholderTextColor="#a8a29e"
                editable={!loading}
              />
            </View>
          </View>
        )}

        <View style={styles.inputContainer}>
          <View style={styles.inputLeftIconContainer}>
            <Text style={styles.inputLeftIcon}>✉️</Text>
          </View>
          <View style={styles.inputContentContainer}>
            <Text style={styles.inputLabel}>EMAIL</Text>
            <TextInput
              style={styles.inputFlex}
              value={email}
              onChangeText={setEmail}
              placeholder="votre@email.com"
              placeholderTextColor="#a8a29e"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <View style={styles.inputLeftIconContainer}>
            <Text style={styles.inputLeftIcon}>🔒</Text>
          </View>
          <View style={styles.inputContentContainer}>
            <Text style={styles.inputLabel}>MOT DE PASSE</Text>
            <TextInput
              style={styles.inputFlex}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#a8a29e"
              secureTextEntry={!showPassword}
              editable={!loading}
            />
          </View>
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)} 
            disabled={loading}
            style={styles.inputRightIconContainer}
          >
            <Text style={styles.inputRightIcon}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.forgotPassword} disabled={loading}>
          <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <>
              <Text style={styles.submitButtonText}>
                {isLoginMode ? 'Se connecter' : 'Créer un compte'}
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
  container: { flexGrow: 1, justifyContent: 'center', padding: 16, backgroundColor: 'transparent' },
  card: { backgroundColor: 'transparent', padding: 12 },
  header: { marginBottom: 28 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#2e1d33', lineHeight: 42 },
  titleHighlight: { color: '#ee6845' },
  subtitle: { fontSize: 13, color: '#78716c', marginTop: 10, lineHeight: 18 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#f5ecf4', borderRadius: 30, padding: 4, marginBottom: 28 },
  toggleButton: { flex: 1, paddingVertical: 12, borderRadius: 26, alignItems: 'center' },
  toggleButtonActive: { backgroundColor: '#7a317a' },
  toggleText: { fontSize: 13, fontWeight: 'bold', color: '#78716c' },
  toggleTextActive: { color: 'white' },
  errorBox: { backgroundColor: '#fef2f2', padding: 12, borderRadius: 16, marginBottom: 16 },
  errorText: { color: '#dc2626', fontSize: 12, fontWeight: 'bold' },
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'white', 
    borderRadius: 24, 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: '#e7e5e4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1
  },
  inputLeftIconContainer: {
    marginRight: 12,
  },
  inputLeftIcon: {
    fontSize: 18,
    color: '#78716c',
  },
  inputContentContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  inputLabel: { fontSize: 10, fontWeight: 'bold', color: '#a8a29e', marginBottom: 2, letterSpacing: 0.5 },
  inputFlex: { fontSize: 14, fontWeight: 'bold', color: '#2e1d33', padding: 0, height: 20 },
  inputRightIconContainer: {
    padding: 4,
  },
  inputRightIcon: {
    fontSize: 16,
    color: '#78716c',
  },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 28, marginTop: -4 },
  forgotPasswordText: { fontSize: 13, fontWeight: 'bold', color: '#ee6845' },
  submitButton: { backgroundColor: '#7a317a', paddingVertical: 18, borderRadius: 30, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  submitButtonText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  submitArrow: { fontSize: 15, color: 'white', fontWeight: 'bold' },
  disabledButton: { opacity: 0.7 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: '#e7e5e4' },
  dividerText: { marginHorizontal: 16, fontSize: 11, fontWeight: 'bold', color: '#a8a29e' },
  socialButton: { 
    backgroundColor: 'white', 
    borderWidth: 1, 
    borderColor: '#e7e5e4', 
    paddingVertical: 16, 
    borderRadius: 30, 
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  googleG: {
    fontSize: 16,
    color: '#EA4335',
    fontWeight: 'bold',
  },
  socialButtonText: { color: '#44403c', fontSize: 13, fontWeight: 'bold' },
  footerText: {
    fontSize: 11,
    color: '#78716c',
    textAlign: 'center',
    marginTop: 28,
    lineHeight: 16,
  },
});
