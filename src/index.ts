import 'dotenv/config';
import { fetchAll } from './fetchers/index';
import { StateStore } from './store/stateStore';
import { applyQualityBar } from './processor/filter';
import { deduplicateItems } from './processor/dedup';
import { summarizeItemsGroq } from './summarizer/groq';
import { summarizeItemsGemini } from './summarizer/gemini';
import { sendDailyDigest } from './delivery/email';
import path from 'path';

async function main() {
  console.log('Starting Jarvis Digest...');

  // 1. Fetch items
  console.log('Fetching items from all sources...');
  let allItems = await fetchAll();
  console.log(`Fetched total of ${allItems.length} items.`);

  console.log('Deduplicating fetched items...');
  const originalCount = allItems.length;
  allItems = deduplicateItems(allItems);
  console.log(`Removed ${originalCount - allItems.length} duplicates. Total is now ${allItems.length}.`);

  // 2. Deduplicate across days
  const storePath = path.join(__dirname, '../data/sent_items.json');
  const store = new StateStore(storePath);

  const newItems = allItems.filter((item) => !store.hasItemBeenSent(item.id));
  console.log(`Found ${newItems.length} new items (not sent before).`);

  if (newItems.length === 0) {
    console.log('No new items to process today. Exiting.');
    process.exit(0);
  }

  // 3. Filter by quality bar
  const highQualityItems = applyQualityBar(newItems);
  console.log(`Filtered down to ${highQualityItems.length} high-quality items.`);

  if (highQualityItems.length === 0) {
    console.log('No items passed the quality bar today. Exiting.');
    process.exit(0);
  }

  // 4. Summarize and deduplicate within the day via LLMs
  console.log('Splitting items by source and sending to Groq and Gemini...');

  const groqItems = highQualityItems.filter(
    (item) => item.source === 'Product Hunt' || item.source === 'Hacker News',
  );
  const geminiItems = highQualityItems.filter(
    (item) => item.source !== 'Product Hunt' && item.source !== 'Hacker News',
  );

  console.log(
    `Sending ${groqItems.length} items to Groq and ${geminiItems.length} items to Gemini...`,
  );

  const [groqProcessed, geminiProcessed] = await Promise.all([
    summarizeItemsGroq(groqItems),
    summarizeItemsGemini(geminiItems),
  ]);

  const processedItems = [...groqProcessed, ...geminiProcessed];
  console.log(`Received ${processedItems.length} processed and merged items from LLMs.`);

  if (processedItems.length === 0) {
    console.log('No items returned from LLM. Exiting.');
    process.exit(0);
  }

  // 5. Send email
  console.log('Sending daily digest email...');
  await sendDailyDigest(processedItems);

  // 6. Log sent items to state store
  console.log('Updating state store...');
  for (const item of processedItems) {
    store.markItemAsSent(item.id);
  }

  console.log('Jarvis Digest workflow completed successfully.');
  process.exit(0);
}

main().catch((error) => {
  console.error('Fatal error in Jarvis Digest workflow:', error);
  process.exit(1);
});
