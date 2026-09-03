import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

export class WorkerAgent {
  private genAI: GoogleGenerativeAI;
  public id: string;
  public activeModel: string = 'gemini-1.5-flash';

  constructor(id: string, apiKey: string) {
    this.id = id;
    if (!apiKey) throw new Error(`API Key for ${id} is missing`);
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  public switchToSmarterModel() {
    this.activeModel = 'gemini-1.5-pro';
    console.log(`[${this.id}] Upgraded internal model to ${this.activeModel}`);
  }

  public async generateJSON(prompt: string, schema: any): Promise<any> {
    const model = this.genAI.getGenerativeModel({
      model: this.activeModel,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: schema,
      },
    });

    try {
      const result = await model.generateContent(prompt);
      const content = result.response.text();
      if (!content) throw new Error('Empty response from model');
      return JSON.parse(content);
    } catch (err: any) {
      if (err.message && err.message.includes('503')) {
        throw new Error('503_SERVICE_UNAVAILABLE');
      }
      if (err.message && err.message.includes('429')) {
        throw new Error('429_TOO_MANY_REQUESTS');
      }
      if (err instanceof SyntaxError) {
        throw new Error('MALFORMED_JSON');
      }
      throw err;
    }
  }

  public async generateText(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.activeModel });
    try {
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err: any) {
      if (err.message && err.message.includes('503')) throw new Error('503_SERVICE_UNAVAILABLE');
      if (err.message && err.message.includes('429')) throw new Error('429_TOO_MANY_REQUESTS');
      throw err;
    }
  }
}
