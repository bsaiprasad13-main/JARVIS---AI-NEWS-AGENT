import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

export class WorkerAgent {
  private genAI: GoogleGenerativeAI;
  public id: string;
  
  // Model hierarchy to cycle through
  private modelHierarchy = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
  private currentModelIndex = 0;
  
  public get activeModel(): string {
    return this.modelHierarchy[this.currentModelIndex]!;
  }

  constructor(id: string, apiKey: string) {
    this.id = id;
    if (!apiKey) throw new Error(`API Key for ${id} is missing`);
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  public switchToSmarterModel() {
    if (this.currentModelIndex < this.modelHierarchy.length - 1) {
       this.currentModelIndex++;
       console.log(`[${this.id}] Upgraded internal model to ${this.activeModel}`);
    } else {
       console.log(`[${this.id}] Already at the maximum model tier (${this.activeModel}). Cannot upgrade further.`);
    }
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
