import {
  PermissionsAndroid,
  Platform,
  type Permission,
} from 'react-native';

const getAndroidRuntimePermissions = (): Permission[] => {
  const version = Number(Platform.Version);
  const permissions: Permission[] = [
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
    PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO,
    PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
  ];

  if (version >= 33) {
    permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
  } else {
    permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
  }

  return permissions.filter(Boolean);
};

/** Demande les permissions runtime utiles (micro, médias, Wi‑Fi proche). */
export const requestAppPermissions = async (): Promise<void> => {
  if (Platform.OS !== 'android') return;

  try {
    const permissions = getAndroidRuntimePermissions();
    const results = await PermissionsAndroid.requestMultiple(permissions);
    const denied = Object.entries(results).filter(
      ([, value]) => value === PermissionsAndroid.RESULTS.DENIED,
    );
    if (denied.length > 0) {
      console.warn(
        'Permissions refusees:',
        denied.map(([name]) => name).join(', '),
      );
    }
  } catch (error) {
    console.warn('Demande de permissions impossible:', error);
  }
};
