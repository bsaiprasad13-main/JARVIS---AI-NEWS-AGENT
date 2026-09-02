import 'dotenv/config';
import { fetchAll } from './fetchers';
import { deduplicateItems } from './processor/dedup';

async function test() {
  try {
    let items = await fetchAll();
    console.log(`\n✅ Successfully fetched ${items.length} total items from all sources.`);
    
    const sourceCounts = items.reduce((acc, item) => {
      acc[item.source] = (acc[item.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('Items by source:');
    console.table(sourceCounts);

    const dedupedItems = deduplicateItems(items);
    console.log(`\n✅ Deduplication: removed ${items.length - dedupedItems.length} duplicates. Final count: ${dedupedItems.length}`);
    
    if (dedupedItems.length > 0) {
      console.log('\nSample item:');
      console.log(JSON.stringify(dedupedItems[0], null, 2));
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

test();
