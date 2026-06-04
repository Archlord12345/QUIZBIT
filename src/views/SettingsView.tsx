import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import {
  buildLocalApiUrl,
  getApiBaseUrl,
  getApiMode,
  getOfflineApiHost,
  setApiMode,
  setOfflineApiHost,
} from '../utils/api';
import { COLORS, SPACING } from '../utils/theme';

type SettingsViewProps = {
  onBack: () => void;
};

const SettingsView = ({ onBack }: SettingsViewProps) => {
  const [isOffline, setIsOffline] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [offlineHost, setOfflineHost] = useState(
    Platform.OS === 'android' ? '10.0.2.2' : 'localhost',
  );

  const refresh = async () => {
    setIsOffline((await getApiMode()) === 'local');
    setApiUrl(await getApiBaseUrl());
    setOfflineHost(await getOfflineApiHost());
  };

  useEffect(() => {
    refresh();
  }, []);

  const toggleOffline = async (value: boolean) => {
    await setApiMode(value ? 'local' : 'remote');
    setIsOffline(value);
    setApiUrl(await getApiBaseUrl());
  };

  const saveOfflineHost = async () => {
    await setOfflineApiHost(offlineHost);
    if (isOffline) {
      setApiUrl(await buildLocalApiUrl());
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
      </View>

      <Text style={styles.pageTitle}>Paramètres</Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Mode offline</Text>
            <Text style={styles.settingDescription}>
              Utilise le serveur local QuizBit (quiz, scores, battle) sans Internet.
              Lance: cd local && npm start
            </Text>
          </View>
          <Switch
            value={isOffline}
            onValueChange={toggleOffline}
            trackColor={{ false: '#DFE1E6', true: COLORS.primary }}
            thumbColor="white"
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.urlLabel}>IP / hôte du serveur local</Text>
        <Text style={styles.settingDescription}>
          Émulateur Android: 10.0.2.2 · Téléphone réel: IP de ton PC (ex. 192.168.1.42)
        </Text>
        <TextInput
          style={styles.hostInput}
          value={offlineHost}
          onChangeText={setOfflineHost}
          placeholder="10.0.2.2"
          placeholderTextColor="#6B778C"
          autoCapitalize="none"
          onSubmitEditing={saveOfflineHost}
          onBlur={saveOfflineHost}
        />

        <View style={styles.divider} />

        <Text style={styles.urlLabel}>URL de l&apos;API active</Text>
        <View style={styles.urlValueBox}>
          <Text style={styles.urlText}>{apiUrl}</Text>
        </View>

        {isOffline ? (
          <Text style={styles.demoHint}>
            Compte démo: demo@local.quizbit / demo123{'\n'}
            Panel: http://localhost:3000
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    flexGrow: 1,
    padding: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xl,
    marginTop: SPACING.sm,
  },
  headerSpacer: {
    width: 70,
  },
  backButton: {
    padding: SPACING.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
  },
  backButtonText: {
    color: 'white',
    fontWeight: '800',
  },
  pageTitle: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: SPACING.xl,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: SPACING.lg,
  },
  settingTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: '#6B778C',
    lineHeight: 18,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F2F5',
    marginVertical: SPACING.lg,
  },
  urlLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B778C',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  hostInput: {
    backgroundColor: '#FAFBFC',
    borderColor: '#DFE1E6',
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 8,
    padding: 14,
  },
  urlValueBox: {
    backgroundColor: '#F4F5F7',
    borderRadius: 12,
    padding: 14,
  },
  urlText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  demoHint: {
    color: COLORS.violet,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    marginTop: SPACING.md,
  },
});

export default SettingsView;
