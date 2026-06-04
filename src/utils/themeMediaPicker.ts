import { pick, types } from '@react-native-documents/picker';
import { PermissionsAndroid, Platform } from 'react-native';

export type ThemeMedia = {
  name: string;
  size?: number | null;
  type?: string | null;
  uri: string;
};

const requestAndroidMediaPermissions = async () => {
  if (Platform.OS !== 'android') return true;

  const version = Number(Platform.Version);
  if (version >= 33) {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
    ]);
    return Object.values(results).every(
      result => result === PermissionsAndroid.RESULTS.GRANTED,
    );
  }

  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

export type ThemeMediaPickKind = 'any' | 'audio' | 'image' | 'document';

const pickTypesForKind = (kind: ThemeMediaPickKind) => {
  switch (kind) {
    case 'audio':
      return [types.audio];
    case 'image':
      return [types.images];
    case 'document':
      return [
        types.doc,
        types.docx,
        types.pdf,
        types.plainText,
        types.ppt,
        types.pptx,
      ];
    default:
      return [
        types.audio,
        types.doc,
        types.docx,
        types.images,
        types.pdf,
        types.plainText,
        types.ppt,
        types.pptx,
        types.video,
      ];
  }
};

export const pickThemeMedia = async (
  kind: ThemeMediaPickKind = 'any',
): Promise<ThemeMedia | null> => {
  const granted = await requestAndroidMediaPermissions();
  if (!granted) {
    throw new Error(
      'Permission media refusee. Autorise les fichiers pour charger un theme.',
    );
  }

  const [file] = await pick({
    allowMultiSelection: false,
    type: pickTypesForKind(kind),
  });

  if (!file?.uri) return null;

  return {
    name: file.name || 'media-theme',
    size: file.size,
    type: file.type,
    uri: file.uri,
  };
};

export const describeThemeMedia = (media: ThemeMedia | null) => {
  if (!media) return '';
  const mime = String(media.type || '').toLowerCase();
  if (mime.startsWith('audio/')) {
    return `Support audio: ${media.name}. Analyse le contenu parle (paroles, sujet, mots-cles) pour definir le theme et les questions.`;
  }
  if (mime.startsWith('image/')) {
    return `Support image: ${media.name}. Analyse le visuel pour definir le theme du quiz.`;
  }
  return [
    `Support fourni: ${media.name}.`,
    media.type ? `Type: ${media.type}.` : '',
    'Utilise ce support comme contexte principal du quiz.',
  ]
    .filter(Boolean)
    .join(' ');
};
