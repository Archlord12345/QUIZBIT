import Config from 'react-native-config';

export type Question = {
  id: string;
  text: string;
  options?: string[];
  answer: string;
  type: 'mcq' | 'open';
};

class AIModel {
  private geminiKey = "AIzaSyC2BFG1aCUtrNTPX4J_paX3LeNREg_Lpk8";
  private mistralKey = "mRojCOQOb7lUy82kZ8lixtQwMG4vau5d";

  async generateQuestions(theme: string, count: number = 5): Promise<Question[]> {
    // Priority 1: Gemini (Online)
    try {
      return await this.fetchFromGemini(theme, count);
    } catch (e) {
      console.log("Gemini failed, trying Mistral...");
      try {
        return await this.fetchFromMistral(theme, count);
      } catch (e2) {
        console.log("Mistral failed, trying Offline SmolLM...");
        return await this.generateOffline(theme, count);
      }
    }
  }

  private async fetchFromGemini(theme: string, count: number): Promise<Question[]> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.geminiKey}`;
    const prompt = `Generate ${count} quiz questions about "${theme}". Format as JSON array: [{text, options:[], answer, type:'mcq'|'open'}]`;
    
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await response.json();
    // Parse JSON from text response (simplified for now)
    return JSON.parse(data.candidates[0].content.parts[0].text);
  }

  private async fetchFromMistral(theme: string, count: number): Promise<Question[]> {
    // Mistral API call logic here
    return [];
  }

  private async generateOffline(theme: string, count: number): Promise<Question[]> {
    // llama.rn (SmolLM2-135M) logic here
    return [];
  }

  async validateAnswer(userAnswer: string, correctAnswer: string): Promise<boolean> {
    // Semantic validation logic
    return userAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
  }
}

export default new AIModel();
