import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Switch,
  Platform,
} from 'react-native';
import {
  getApiBaseUrl,
  getApiMode,
  getOfflineApiUrl,
  setApiMode,
  setOfflineApiUrl,
} from '../utils/api';
import { checkApiHealth } from '../utils/networkHealth';
import { COLORS, LINE, SPACING, PLACEHOLDER, INPUT_BG } from '../utils/theme';
import { UI } from '../utils/ui';
import { ScreenHeader, ScreenScroll, screenCardStyle } from '../components/ScreenLayout';

type SettingsViewProps = {
  onBack: () => void;
};

const SettingsView = ({ onBack }: SettingsViewProps) => {
  const [isOffline, setIsOffline] = useState(false);
  const [apiUrl, setApiUrl] = useState('');
  const [offlineServerUrl, setOfflineServerUrl] = useState(
    Platform.OS === 'android'
      ? 'http://10.0.2.2:3000'
      : 'http://localhost:3000',
  );
  const [saveHint, setSaveHint] = useState('');
  const [ollamaMessage, setOllamaMessage] = useState('');

  const refreshOllama = useCallback(async () => {
    const health = await checkApiHealth();
    if (health.mode !== 'local' || !health.ok) {
      setOllamaMessage('');
      return;
    }
    if (health.ollama?.available) {
      setOllamaMessage(`IA locale active — modele ${health.ollama.model}`);
    } else if (health.ollama?.enabled) {
      setOllamaMessage(
        `Ollama configure (${health.ollama.model}) — chargement au demarrage du serveur.`,
      );
    } else {
      setOllamaMessage('Ollama desactive sur le serveur local.');
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsOffline((await getApiMode()) === 'local');
    setApiUrl(await getApiBaseUrl());
    setOfflineServerUrl(await getOfflineApiUrl());
    setSaveHint('');
    await refreshOllama();
  }, [refreshOllama]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggleOffline = async (value: boolean) => {
    await setApiMode(value ? 'local' : 'remote');
    setIsOffline(value);
    setApiUrl(await getApiBaseUrl());
  };

  const saveOfflineServer = async () => {
    await setOfflineApiUrl(offlineServerUrl);
    const nextBase = await getApiBaseUrl();
    setApiUrl(nextBase);
    setOfflineServerUrl(await getOfflineApiUrl());
    setSaveHint('URL enregistrée.');
    await refreshOllama();
  };

  return (
    <ScreenScroll>
      <ScreenHeader title="Paramètres" onBack={onBack} />

      <View style={[screenCardStyle, styles.card]}>
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Mode offline</Text>
            <Text style={styles.settingDescription}>
              Utilise le serveur local QuizBit (quiz, scores, battle) sans Internet.
              Lance: npm run local:serve (Ollama charge automatiquement)
            </Text>
          </View>
          <Switch
            value={isOffline}
            onValueChange={toggleOffline}
            trackColor={{ false: LINE, true: COLORS.primary }}
            thumbColor="white"
          />
        </View>

        <View style={styles.divider} />

        <Text style={styles.urlLabel}>URL du serveur local</Text>
        <Text style={styles.settingDescription}>
          Saisis l&apos;adresse complète du serveur (panel + API). Exemples :{'\n'}
          http://10.0.2.2:3000 (émulateur Android){'\n'}
          http://192.168.1.42:3000 (téléphone sur le même Wi‑Fi){'\n'}
          Tu peux aussi indiquer seulement l&apos;IP ou l&apos;hôte (port 3000 par défaut).
        </Text>
        <TextInput
          style={styles.hostInput}
          value={offlineServerUrl}
          onChangeText={text => {
            setOfflineServerUrl(text);
            setSaveHint('');
          }}
          placeholder="http://10.0.2.2:3000"
          placeholderTextColor={PLACEHOLDER}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onSubmitEditing={saveOfflineServer}
        />
        <TouchableOpacity style={styles.saveUrlButton} onPress={saveOfflineServer}>
          <Text style={styles.saveUrlButtonText}>Enregistrer l&apos;URL du serveur</Text>
        </TouchableOpacity>
        {saveHint ? <Text style={styles.saveHint}>{saveHint}</Text> : null}

        <View style={styles.divider} />

        <Text style={styles.urlLabel}>URL de l&apos;API active</Text>
        <View style={styles.urlValueBox}>
          <Text style={styles.urlText}>{apiUrl}</Text>
        </View>

        {isOffline ? (
          <Text style={styles.demoHint}>
            Compte démo: demo@local.quizbit / demo123{'\n'}
            {ollamaMessage
              ? `${ollamaMessage}\n`
              : 'Lance npm run local:serve pour demarrer le serveur et charger Ollama.\n'}
            {Platform.OS === 'android' && offlineServerUrl.includes('10.0.2.2')
              ? 'Attention: 10.0.2.2 fonctionne seulement sur emulateur. Sur telephone, mets l IP Wi-Fi du PC.'
              : 'Panel local: ouvre http://<IP-du-PC>:3000 dans le navigateur du PC.'}
          </Text>
        ) : (
          <Text style={styles.demoHint}>
            Mode cloud actif — connexion via Firebase (quizbit-admin.vercel.app).
          </Text>
        )}
      </View>
    </ScreenScroll>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 0,
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
    color: PLACEHOLDER,
    lineHeight: 18,
    marginBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: UI.surfaceMuted,
    marginVertical: SPACING.lg,
  },
  urlLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: PLACEHOLDER,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  hostInput: {
    backgroundColor: INPUT_BG,
    borderColor: LINE,
    borderRadius: 10,
    borderWidth: 1,
    color: COLORS.text,
    fontSize: 16,
    marginBottom: 8,
    padding: 14,
  },
  urlValueBox: {
    backgroundColor: UI.surfaceSoft,
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
  saveUrlButton: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    marginTop: 4,
    paddingVertical: 14,
  },
  saveUrlButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  saveHint: {
    color: COLORS.success,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
});

export default SettingsView;
