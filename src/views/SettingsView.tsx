import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl, setApiMode } from '../utils/api';
import { COLORS, SPACING } from '../utils/theme';

type SettingsViewProps = {
  onBack: () => void;
};

const SettingsView = ({ onBack }: SettingsViewProps) => {
  const [isLocal, setIsLocal] = useState(false);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    const loadSettings = async () => {
      const mode = await AsyncStorage.getItem('quizbit.apiMode');
      setIsLocal(mode === 'local');
      const url = await getApiBaseUrl();
      setApiUrl(url);
    };
    loadSettings();
  }, []);

  const toggleMode = async (value: boolean) => {
    const mode = value ? 'local' : 'remote';
    await setApiMode(mode);
    setIsLocal(value);
    const url = await getApiBaseUrl();
    setApiUrl(url);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paramètres</Text>
      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>Utiliser serveur local</Text>
        <Switch value={isLocal} onValueChange={toggleMode} />
      </View>
      <Text style={styles.urlText}>URL actuelle : {apiUrl}</Text>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Retour</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: SPACING.md,
    borderRadius: 10,
    marginBottom: 20,
  },
  settingLabel: {
    fontSize: 18,
    color: COLORS.text,
  },
  urlText: {
    color: 'white',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: COLORS.accent,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SettingsView;
