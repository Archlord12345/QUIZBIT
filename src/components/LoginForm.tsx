import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import styles from './styles/LoginForm.styles';

interface LoginFormProps {
  isLoginMode?: boolean;
  onToggleMode?: (isLogin: boolean) => void;
  onLogin?: (email: string, password: string) => void;
  onGoogleLogin?: () => void;
  onForgotPassword?: (email: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  isLoginMode = true,
  onToggleMode,
  onLogin,
  onGoogleLogin,
  onForgotPassword,
}) => {
  const [email, setEmail] = useState('leo@quizizz.app');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    onLogin?.(email, password);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior="padding">
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.greeting}>Bon retour,</Text>
          <Text style={styles.greetingHighlight}>Champion.</Text>

          <Text style={styles.description}>
            Connecte-toi pour reprendre tes battles et lancer de nouveaux quiz.
          </Text>

          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, isLoginMode && styles.tabActive]}
              onPress={() => onToggleMode?.(true)}
            >
              <Text
                style={[
                  styles.tabText,
                  isLoginMode && styles.tabTextActive,
                ]}
              >
                Connexion
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, !isLoginMode && styles.tabActive]}
              onPress={() => onToggleMode?.(false)}
            >
              <Text
                style={[
                  styles.tabText,
                  !isLoginMode && styles.tabTextActive,
                ]}
              >
                Créer un compte
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>✉️</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com"
                  value={email}
                  onChangeText={setEmail}
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>MOT DE PASSE</Text>
              <View style={styles.inputWrapper}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.togglePassword}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
              {isLoginMode && (
                <TouchableOpacity onPress={() => onForgotPassword?.(email)}>
                  <Text style={styles.forgotPassword}>Mot de passe oublié ?</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
            >
              <Text style={styles.loginButtonText}>Se connecter →</Text>
            </TouchableOpacity>

            <Text style={styles.divider}>OU</Text>

            <TouchableOpacity
              style={styles.googleButton}
              onPress={onGoogleLogin}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleButtonText}>Continuer avec Google</Text>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              En continuant, tu acceptes les conditions et la politique de confidentialité.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};
