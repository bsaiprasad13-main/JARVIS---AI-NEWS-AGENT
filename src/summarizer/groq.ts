import Groq from 'groq-sdk';
import { FilteredItem, ProcessedItem } from '../models/types';
import { RateLimiter } from './rateLimiter';
import { getModelsConfig } from '../models/config';

export async function summarizeItemsGroq(items: FilteredItem[]): Promise<ProcessedItem[]> {
  if (items.length === 0) return [];

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const config = getModelsConfig().groq;
  const limiter = new RateLimiter(config);

  const stringifyItem = (item: FilteredItem) => JSON.stringify({
    id: item.id,
    title: item.title,
    source: item.source,
    description: item.description?.substring(0, 1000) || '',
  });

  const processChunk = async (chunk: FilteredItem[]): Promise<ProcessedItem[]> => {
    const prompt = `
You are an expert product manager analyzing a daily feed of news and new tools.
Your task is to review the following items, merge any duplicates (stories covering the same exact event or tool), and for each distinct item, provide:
1. A 1-line summary of the tool/news.
2. A 1-line explanation of why it's relevant to a PM's work.
3. Relevant tags: Generate 2-3 concise keyword tags that best categorize this item.

Input Items:
${JSON.stringify(chunk.map(item => JSON.parse(stringifyItem(item))), null, 2)}

Return a JSON object with a single key "processed_items" containing an array of objects.
Each object must have the following keys:
- "id": The ID of the item (if you merged multiple, pick the one from the most reliable source).
- "llmSummary": The 1-line summary.
- "pmRelevance": The 1-line explanation of why it matters to a PM.
- "tags": Array of 2-3 dynamically generated keyword tags as strings.
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You output only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      model: config.default,
      response_format: { type: 'json_object' },
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) throw new Error('No content returned from Groq');

    const parsed = JSON.parse(content);
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
  };

  return limiter.processItems(items, stringifyItem, processChunk);
}
