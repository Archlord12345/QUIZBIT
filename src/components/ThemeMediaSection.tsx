import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ThemeMedia } from '../utils/themeMediaPicker';
import { classifyThemeMedia } from '../utils/themeMediaPayload';
import { COLORS, HELPER, PLACEHOLDER, LINE, INPUT_BG } from '../utils/theme';
import { RADIUS, UI } from '../utils/ui';

type ThemeMediaSectionProps = {
  themeMedia: ThemeMedia | null;
  loading?: boolean;
  isRecording?: boolean;
  recordDurationLabel?: string;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPickAudio: () => void;
  onPickImage: () => void;
  onPickDocument: () => void;
  onPickAny: () => void;
  onRemove: () => void;
};

const categoryLabel = (media: ThemeMedia) => {
  switch (classifyThemeMedia(media)) {
    case 'audio':
      return media.name.startsWith('theme-vocal') ? 'Vocal enregistré' : 'Audio';
    case 'image':
      return 'Image';
    case 'video':
      return 'Vidéo';
    case 'text':
      return 'Texte';
    default:
      return 'Document';
  }
};

export const ThemeMediaSection = ({
  themeMedia,
  loading = false,
  isRecording = false,
  recordDurationLabel = '0:00',
  onStartRecording,
  onStopRecording,
  onPickAudio,
  onPickImage,
  onPickDocument,
  onPickAny,
  onRemove,
}: ThemeMediaSectionProps) => (
  <View style={styles.wrap}>
    <Text style={styles.hint}>
      Parle pour définir le thème : ton enregistrement est envoyé à l&apos;IA (Gemini)
      pour créer les questions. Tu peux aussi charger un fichier audio.
    </Text>

    {isRecording ? (
      <View style={styles.recordingBox}>
        <View style={styles.recordingPulse} />
        <Text style={styles.recordingTitle}>Enregistrement en cours…</Text>
        <Text style={styles.recordingTime}>{recordDurationLabel}</Text>
        <Text style={styles.recordingHint}>Parle clairement, puis appuie sur Envoyer.</Text>
        <TouchableOpacity
          style={[styles.stopRecordBtn, loading && styles.disabled]}
          onPress={onStopRecording}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.stopRecordBtnText}>⏹ Envoyer l&apos;audio</Text>
          )}
        </TouchableOpacity>
      </View>
    ) : (
      <TouchableOpacity
        style={[styles.voiceBtn, loading && styles.disabled]}
        onPress={onStartRecording}
        disabled={loading}
      >
        <Text style={styles.voiceBtnText}>🎙️ Parler (micro)</Text>
      </TouchableOpacity>
    )}

    <TouchableOpacity
      style={[styles.primaryMediaBtn, (loading || isRecording) && styles.disabled]}
      onPress={onPickAudio}
      disabled={loading || isRecording}
    >
      <Text style={styles.primaryMediaBtnText}>🎧 Choisir un fichier audio</Text>
    </TouchableOpacity>

    <View style={styles.pillsRow}>
      <TouchableOpacity
        style={styles.pill}
        onPress={onPickImage}
        disabled={loading || isRecording}
      >
        <Text style={styles.pillText}>🖼️ Image</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.pill}
        onPress={onPickDocument}
        disabled={loading || isRecording}
      >
        <Text style={styles.pillText}>📄 Doc</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.pill}
        onPress={onPickAny}
        disabled={loading || isRecording}
      >
        <Text style={styles.pillText}>📁 Autre</Text>
      </TouchableOpacity>
    </View>

    {themeMedia ? (
      <View style={styles.badge}>
        <Text style={styles.badgeTitle}>
          {categoryLabel(themeMedia)} · {themeMedia.name}
        </Text>
        <Text style={styles.badgeMeta}>
          {themeMedia.type || 'type inconnu'}
          {themeMedia.size ? ` · ${Math.round(themeMedia.size / 1024)} Ko` : ''}
        </Text>
        {classifyThemeMedia(themeMedia) === 'audio' ? (
          <Text style={styles.badgeAudio}>
            Audio prêt : il sera analysé à la génération du quiz.
          </Text>
        ) : null}
        <TouchableOpacity onPress={onRemove} disabled={loading || isRecording}>
          <Text style={styles.remove}>Retirer le support</Text>
        </TouchableOpacity>
      </View>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  hint: {
    color: HELPER,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  voiceBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    marginBottom: 10,
    padding: 16,
  },
  voiceBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '900',
  },
  recordingBox: {
    alignItems: 'center',
    backgroundColor: UI.errorBg,
    borderColor: COLORS.error,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 16,
    gap: 6,
  },
  recordingPulse: {
    backgroundColor: COLORS.error,
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  recordingTitle: {
    color: COLORS.error,
    fontSize: 15,
    fontWeight: '900',
  },
  recordingTime: {
    color: COLORS.primary,
    fontSize: 28,
    fontWeight: '900',
  },
  recordingHint: {
    color: PLACEHOLDER,
    fontSize: 12,
    textAlign: 'center',
  },
  stopRecordBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    marginTop: 8,
    minWidth: 200,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  stopRecordBtnText: {
    color: 'white',
    fontWeight: '900',
  },
  primaryMediaBtn: {
    alignItems: 'center',
    backgroundColor: UI.violetSoft,
    borderColor: COLORS.violet,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    padding: 14,
  },
  primaryMediaBtnText: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  pillsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pill: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: INPUT_BG,
    borderColor: LINE,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
  },
  pillText: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  badge: {
    backgroundColor: UI.chipBg,
    borderRadius: 14,
    gap: 4,
    padding: 12,
  },
  badgeTitle: { color: COLORS.primary, fontWeight: '900' },
  badgeMeta: { color: HELPER, fontSize: 12 },
  badgeAudio: { color: COLORS.violet, fontSize: 12, fontWeight: '700' },
  remove: { color: COLORS.error, fontWeight: '900', marginTop: 6 },
  disabled: { opacity: 0.6 },
});
