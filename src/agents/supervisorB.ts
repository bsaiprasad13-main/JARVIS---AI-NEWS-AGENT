import { SupervisorAgent } from './supervisor';
import { FilteredItem, ProcessedItem } from '../models/types';
import { sendDailyDigest, sendSOSAlert } from '../delivery/email';
import { SchemaType } from '@google/generative-ai';
import { RateLimiter } from '../summarizer/rateLimiter';
import { getModelsConfig } from '../models/config';

export class SupervisorB extends SupervisorAgent {
  constructor() {
    super(
      'SupervisorB',
      process.env.GEMINI_SUPERVISOR_B_KEY!,
      [process.env.GEMINI_WORKER_3_KEY!, process.env.GEMINI_WORKER_4_KEY!],
      process.env.GEMINI_SAFE_SIDE_KEY!
    );
  }

  public async generateContent(items: FilteredItem[]): Promise<ProcessedItem[]> {
    console.log(`[${this.id}] Initiating content generation for ${items.length} items...`);
    
    const config = getModelsConfig().gemini;
    const limiter = new RateLimiter(config);
    
    const schema = {
        type: SchemaType.OBJECT,
        properties: {
          processed_items: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                id: { type: SchemaType.STRING },
                llmSummary: { type: SchemaType.STRING },
                pmRelevance: { type: SchemaType.STRING },
                tags: {
                  type: SchemaType.ARRAY,
                  items: { type: SchemaType.STRING },
                },
              },
              required: ['id', 'llmSummary', 'pmRelevance', 'tags'],
            },
          },
        },
        required: ['processed_items'],
    };

    const stringifyItem = (item: FilteredItem) => JSON.stringify({
      id: item.id,
      title: item.title,
      source: item.source,
      description: item.description?.substring(0, 1000) || '',
    });

    const processChunk = async (chunk: FilteredItem[]): Promise<ProcessedItem[]> => {
      const assignedWorker = this.workers[Math.floor(Math.random() * this.workers.length)]!;
      
      return this.executeWithToolbox(assignedWorker, async (worker) => {
        const prompt = `You are an expert product manager analyzing a daily feed of news and new tools.
Your task is to review the following items, merge any duplicates, and provide:
1. A 1-line summary.
2. A 1-line explanation of why it's relevant to a PM.
3. 2-3 keyword tags.

Input Items:
${JSON.stringify(chunk.map(item => JSON.parse(stringifyItem(item))), null, 2)}

Return a JSON object with a single key "processed_items" matching the schema.`;
        
        const parsed = await worker.generateJSON(prompt, schema);
        
        const processedMap = new Map<string, any>();
        for (const p of parsed.processed_items || []) {
          processedMap.set(p.id, p);
        }

        const finalItems: ProcessedItem[] = [];
        for (const item of chunk) {
          if (processedMap.has(item.id)) {
            const p = processedMap.get(item.id);
            finalItems.push({
              ...item,
              llmSummary: p.llmSummary,
              pmRelevance: p.pmRelevance,
              tags: p.tags || [],
            });
          }
        }
        return finalItems;
      }, 'summarizing_content');
    };

    try {
      const results = await limiter.processItems(items, stringifyItem, processChunk);
      return results;
    } catch (err: any) {
      if (err.message === 'HIBERNATING') {
        console.warn(`[${this.id}] Workflow hibernated due to exhausted keys.`);
        return [];
      }
      throw err;
    }
  }

  public async deliverAndVerify(items: ProcessedItem[]): Promise<void> {
    try {
      await sendDailyDigest(items);
      console.log(`[${this.id}] Delivery completed.`);
    } catch (err: any) {
      console.error(`[${this.id}] Delivery failed:`, err);
      await this.executeWithToolbox(this.supervisorWorker, async () => {
         await sendSOSAlert(err.message);
      }, 'delivery_failure');
    }
  }
}
