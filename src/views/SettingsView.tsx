import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Switch, ScrollView } from 'react-native';
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
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <View style={{ width: 70 }} />
      </View>

      <Text style={styles.pageTitle}>Paramètres</Text>

      <View style={styles.card}>
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>Serveur Local</Text>
            <Text style={styles.settingDescription}>
              Bascule sur le panel admin local (hors ligne). Ne modifie pas les données Firestore.
            </Text>
          </View>
          <Switch 
            value={isLocal} 
            onValueChange={toggleMode} 
            trackColor={{ false: '#DFE1E6', true: COLORS.primary }}
            thumbColor="white"
          />
        </View>
        
        <View style={styles.divider} />
        
        <View>
          <Text style={styles.urlLabel}>URL de l'API active</Text>
          <View style={styles.urlValueBox}>
            <Text style={styles.urlText}>{apiUrl}</Text>
          </View>
        </View>
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
});

export default SettingsView;
