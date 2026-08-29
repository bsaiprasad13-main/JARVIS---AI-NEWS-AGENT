import 'dotenv/config';
import { fetchAll } from './fetchers/index';
import { StateStore } from './store/stateStore';
import { applyQualityBar } from './processor/filter';
import { summarizeItems } from './summarizer/groq';
import { sendDailyDigest } from './delivery/email';
import path from 'path';

async function main() {
  console.log('Starting Jarvis Digest...');

  // 1. Fetch items
  console.log('Fetching items from all sources...');
  const allItems = await fetchAll();
  console.log(`Fetched total of ${allItems.length} items.`);

  // 2. Deduplicate across days
  const storePath = path.join(__dirname, '../data/sent_items.json');
  const store = new StateStore(storePath);

  const newItems = allItems.filter((item) => !store.hasItemBeenSent(item.id));
  console.log(`Found ${newItems.length} new items (not sent before).`);

  if (newItems.length === 0) {
    console.log('No new items to process today. Exiting.');
    return;
  }

  // 3. Filter by quality bar
  const highQualityItems = applyQualityBar(newItems);
  console.log(`Filtered down to ${highQualityItems.length} high-quality items.`);

  if (highQualityItems.length === 0) {
    console.log('No items passed the quality bar today. Exiting.');
    return;
  }

  // 4. Summarize and deduplicate within the day via LLM
  console.log('Sending to Groq Llama-3 for summarization and deduplication...');
  const processedItems = await summarizeItems(highQualityItems);
  console.log(`Received ${processedItems.length} processed and merged items from LLM.`);

  if (processedItems.length === 0) {
    console.log('No items returned from LLM. Exiting.');
    return;
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
}

main().catch((error) => {
  console.error('Fatal error in Jarvis Digest workflow:', error);
});
