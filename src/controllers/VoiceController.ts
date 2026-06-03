class VoiceController {
  private onResultsCallback: (text: string) => void = () => {};

  async startListening(callback: (text: string) => void) {
    this.onResultsCallback = callback;
    console.warn('Voice recognition is disabled in this stable APK build.');
  }

  async stopListening() {
    this.onResultsCallback = () => {};
  }
}

export default new VoiceController();
