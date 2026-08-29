import 'dotenv/config';
import { fetchAll } from './fetchers';

async function test() {
  try {
    const items = await fetchAll();
    console.log(`\n✅ Successfully fetched ${items.length} total items from all sources.`);
    if (items.length > 0) {
      console.log('Sample item:');
      console.log(JSON.stringify(items[0], null, 2));
    }
  } catch (error) {
    console.error('Error in test:', error);
  }
}

test();
