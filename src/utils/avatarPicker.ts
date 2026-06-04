import { launchImageLibrary } from 'react-native-image-picker';

export type PickedAvatar = {
  fileName?: string;
  type?: string;
  uri: string;
};

export const pickAvatarFromLibrary = async (): Promise<PickedAvatar | null> => {
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
