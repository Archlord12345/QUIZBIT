class AudioRecorderPlayer {
  startRecorder = jest.fn(async () => 'file://mock-recording.m4a');
  stopRecorder = jest.fn(async () => 'file://mock-recording.m4a');
  addRecordBackListener = jest.fn();
  removeRecordBackListener = jest.fn();
}

module.exports = {
  __esModule: true,
  default: AudioRecorderPlayer,
  AudioEncoderAndroidType: { AAC: 'aac' },
  AudioSourceAndroidType: { MIC: 'mic' },
  AVEncoderAudioQualityIOSType: { high: 'high' },
  AVEncodingOption: { aac: 'aac' },
};
