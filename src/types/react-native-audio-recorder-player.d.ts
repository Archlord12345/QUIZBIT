declare module 'react-native-audio-recorder-player' {
  export enum AudioEncoderAndroidType {
    AAC = 'aac',
  }
  export enum AudioSourceAndroidType {
    MIC = 'MIC',
  }
  export enum AVEncoderAudioQualityIOSType {
    high = 'high',
  }
  export enum AVEncodingOption {
    aac = 'aac',
  }

  export type RecordBackType = {
    currentPosition?: number;
  };

  export default class AudioRecorderPlayer {
    startRecorder(
      uri?: string,
      audioSets?: Record<string, unknown>,
      meteringEnabled?: boolean,
    ): Promise<string>;
    stopRecorder(): Promise<string>;
    addRecordBackListener(
      callback: (event: RecordBackType) => void,
    ): void;
    removeRecordBackListener(): void;
  }
}
