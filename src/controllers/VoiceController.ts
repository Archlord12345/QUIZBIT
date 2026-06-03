import Voice, { SpeechResultsEvent } from '@react-native-voice/voice';

class VoiceController {
  private onResultsCallback: (text: string) => void = () => {};

  constructor() {
    Voice.onSpeechResults = this.onSpeechResults.bind(this);
    Voice.onSpeechError = (e) => console.error('Voice error:', e);
  }

  async startListening(callback: (text: string) => void) {
    this.onResultsCallback = callback;
    try {
      await Voice.start('fr-FR'); // Default to French as requested
    } catch (e) {
      console.error(e);
    }
  }

  async stopListening() {
    try {
      await Voice.stop();
    } catch (e) {
      console.error(e);
    }
  }

  private onSpeechResults(e: SpeechResultsEvent) {
    if (e.value && e.value.length > 0) {
      this.onResultsCallback(e.value[0]);
    }
  }
}

export default new VoiceController();
