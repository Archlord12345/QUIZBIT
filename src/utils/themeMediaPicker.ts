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

export const pickThemeMedia = async (): Promise<ThemeMedia | null> => {
  const granted = await requestAndroidMediaPermissions();
  if (!granted) {
    throw new Error(
      'Permission media refusee. Autorise les fichiers pour charger un theme.',
    );
  }

  const [file] = await pick({
    allowMultiSelection: false,
    type: [
      types.audio,
      types.doc,
      types.docx,
      types.images,
      types.pdf,
      types.plainText,
      types.ppt,
      types.pptx,
      types.video,
    ],
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
  return [
    `Support fourni par l utilisateur: ${media.name}.`,
    media.type ? `Type MIME: ${media.type}.` : '',
    'Utilise ce support comme contexte de theme si son nom ou son type indique un sujet.',
  ]
    .filter(Boolean)
    .join(' ');
};
