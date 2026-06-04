import { PermissionsAndroid, Platform } from 'react-native';
import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  AVEncoderAudioQualityIOSType,
  AVEncodingOption,
} from 'react-native-audio-recorder-player';
import type { ThemeMedia } from './themeMediaPicker';

const audioRecorderPlayer = new AudioRecorderPlayer();
export const MAX_VOICE_RECORD_MS = 60_000;

let recordListenerAttached = false;

export const requestMicrophonePermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone QuizBit',
      message:
        'QuizBit a besoin du micro pour enregistrer ton thème vocal et generer le quiz.',
      buttonPositive: 'Autoriser',
      buttonNegative: 'Refuser',
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

export const startVoiceRecording = async (
  onDurationMs?: (ms: number) => void,
): Promise<void> => {
  const allowed = await requestMicrophonePermission();
  if (!allowed) {
    throw new Error(
      'Permission micro refusee. Autorise le microphone dans les reglages.',
    );
  }

  const audioSet = {
    AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
    AudioSourceAndroid: AudioSourceAndroidType.MIC,
    AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
    AVNumberOfChannelsKeyIOS: 1,
    AVFormatIDKeyIOS: AVEncodingOption.aac,
  };

  await audioRecorderPlayer.startRecorder(undefined, audioSet, true);

  if (!recordListenerAttached) {
    audioRecorderPlayer.addRecordBackListener(event => {
      onDurationMs?.(Math.floor(event.currentPosition || 0));
    });
    recordListenerAttached = true;
  }
};

export const stopVoiceRecording = async (): Promise<ThemeMedia> => {
  const uri = await audioRecorderPlayer.stopRecorder();
  audioRecorderPlayer.removeRecordBackListener();
  recordListenerAttached = false;

  if (!uri) {
    throw new Error('Enregistrement vocal vide. Reessaie en parlant plus longtemps.');
  }

  const extension = Platform.OS === 'ios' ? 'm4a' : 'mp4';
  const mimeType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4';

  return {
    uri,
    name: `theme-vocal-${Date.now()}.${extension}`,
    type: mimeType,
    size: null,
  };
};

export const cancelVoiceRecording = async () => {
  try {
    await audioRecorderPlayer.stopRecorder();
  } catch {
    // ignore if not recording
  }
  audioRecorderPlayer.removeRecordBackListener();
  recordListenerAttached = false;
};

export const formatRecordDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};
