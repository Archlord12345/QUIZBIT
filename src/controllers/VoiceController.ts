import type { ThemeMedia } from '../utils/themeMediaPicker';
import {
  cancelVoiceRecording,
  formatRecordDuration,
  startVoiceRecording,
  stopVoiceRecording,
} from '../utils/voiceRecorder';

class VoiceController {
  private recording = false;

  isRecording() {
    return this.recording;
  }

  async startRecording(onDurationMs: (ms: number) => void): Promise<void> {
    if (this.recording) return;
    this.recording = true;
    await startVoiceRecording(onDurationMs);
  }

  async stopRecording(): Promise<ThemeMedia> {
    if (!this.recording) {
      throw new Error('Aucun enregistrement en cours.');
    }
    const media = await stopVoiceRecording();
    this.recording = false;
    return media;
  }

  async cancelRecording(): Promise<void> {
    if (!this.recording) return;
    await cancelVoiceRecording();
    this.recording = false;
  }

  formatDuration(ms: number) {
    return formatRecordDuration(ms);
  }
}

export default new VoiceController();
