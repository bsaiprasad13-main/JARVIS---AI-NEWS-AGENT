import Groq from 'groq-sdk';
import { FilteredItem, ProcessedItem } from '../models/types';

const PM_TAGS = [
  'User research',
  'Roadmapping / prioritization',
  'PRD / spec writing',
  'Product analytics',
  'Competitive intel',
  'Stakeholder comms / presentations',
  'Experimentation / A-B testing',
  'Growth / GTM & pricing-monetization',
  'Customer feedback / voice-of-customer synthesis',
  'No-code / prototyping',
  'General productivity (meetings, docs, scheduling)',
  'AI agents / automation',
  'Product case-study / interview prep tools',
];

export async function summarizeItems(items: FilteredItem[]): Promise<ProcessedItem[]> {
  if (items.length === 0) return [];

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const prompt = `
You are an expert product manager analyzing a daily feed of news and new tools.
Your task is to review the following items, merge any duplicates (stories covering the same exact event or tool), and for each distinct item, provide:
1. A 1-line summary of the tool/news.
2. A 1-line explanation of why it's relevant to a PM's work.
3. Relevant tags chosen ONLY from this list: ${JSON.stringify(PM_TAGS)}

Input Items:
${JSON.stringify(
  items.map((i) => ({
    id: i.id,
    title: i.title,
    source: i.source,
    description: i.description?.substring(0, 1000) || '',
  })),
  null,
  2,
)}

Return a JSON object with a single key "processed_items" containing an array of objects.
Each object must have the following keys:
- "id": The ID of the item (if you merged multiple, pick the one from the most reliable source).
- "llmSummary": The 1-line summary.
- "pmRelevance": The 1-line explanation of why it matters to a PM.
- "tags": Array of strings from the allowed tags list.
`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: 'You output only valid JSON.' },
        { role: 'user', content: prompt },
      ],
      model: 'qwen/qwen3.8-27b',
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
    for (const item of items) {
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
  } catch (error) {
    console.error('Summarization failed', error);
    return [];
  }
}
