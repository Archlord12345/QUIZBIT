import { PermissionsAndroid, Platform } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';


const requestPhotoPermission = async () => {
  if (Platform.OS !== 'android') return true;

  const version = Number(Platform.Version);
  const permission =
    version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
};

export type PickedAvatar = {
  fileName?: string;
  type?: string;
  uri: string;
};

export const pickAvatarFromLibrary = async (): Promise<PickedAvatar | null> => {
  const granted = await requestPhotoPermission();
  if (!granted) {
    throw new Error('Permission photo refusee. Autorise les images pour choisir un avatar.');
  }

  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8,
    selectionLimit: 1,
  });

  if (result.didCancel) return null;
  if (result.errorMessage) {
    throw new Error(result.errorMessage);
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) {
    throw new Error('Aucun fichier image selectionne.');
  }

  return {
    fileName: asset.fileName,
    type: asset.type,
    uri: asset.uri,
  };
};
