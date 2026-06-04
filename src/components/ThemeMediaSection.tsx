import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { ThemeMedia } from '../utils/themeMediaPicker';
import { classifyThemeMedia } from '../utils/themeMediaPayload';
import { COLORS } from '../utils/theme';

type ThemeMediaSectionProps = {
  themeMedia: ThemeMedia | null;
  loading?: boolean;
  onPickAudio: () => void;
  onPickImage: () => void;
  onPickDocument: () => void;
  onPickAny: () => void;
  onRemove: () => void;
};

const categoryLabel = (media: ThemeMedia) => {
  switch (classifyThemeMedia(media)) {
    case 'audio':
      return 'Audio';
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
  onPickAudio,
  onPickImage,
  onPickDocument,
  onPickAny,
  onRemove,
}: ThemeMediaSectionProps) => (
  <View style={styles.wrap}>
    <Text style={styles.hint}>
      Ajoute un audio, une image ou un document : l&apos;IA analyse le support pour
      générer le quiz (l&apos;audio est transcrit et compris par Gemini).
    </Text>

    <TouchableOpacity
      style={[styles.primaryMediaBtn, loading && styles.disabled]}
      onPress={onPickAudio}
      disabled={loading}
    >
      <Text style={styles.primaryMediaBtnText}>🎧 Choisir un fichier audio</Text>
    </TouchableOpacity>

    <View style={styles.pillsRow}>
      <TouchableOpacity style={styles.pill} onPress={onPickImage} disabled={loading}>
        <Text style={styles.pillText}>🖼️ Image</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.pill} onPress={onPickDocument} disabled={loading}>
        <Text style={styles.pillText}>📄 Doc</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.pill} onPress={onPickAny} disabled={loading}>
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
            Le contenu audio sera analysé pour définir le thème du quiz.
          </Text>
        ) : null}
        <TouchableOpacity onPress={onRemove} disabled={loading}>
          <Text style={styles.remove}>Retirer le support</Text>
        </TouchableOpacity>
      </View>
    ) : null}
  </View>
);

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  hint: {
    color: '#5E6C84',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  primaryMediaBtn: {
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
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
    backgroundColor: '#FAFBFC',
    borderColor: '#DFE1E6',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
  },
  pillText: { color: COLORS.text, fontSize: 12, fontWeight: '800' },
  badge: {
    backgroundColor: '#EAF2FF',
    borderRadius: 14,
    gap: 4,
    padding: 12,
  },
  badgeTitle: { color: COLORS.primary, fontWeight: '900' },
  badgeMeta: { color: '#5E6C84', fontSize: 12 },
  badgeAudio: { color: COLORS.violet, fontSize: 12, fontWeight: '700' },
  remove: { color: COLORS.error, fontWeight: '900', marginTop: 6 },
  disabled: { opacity: 0.6 },
});
