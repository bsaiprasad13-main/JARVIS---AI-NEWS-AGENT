import { RateLimiter, estimateTokens } from './src/summarizer/rateLimiter';
import { ModelConfig } from './src/models/config';

async function testRateLimiter() {
  const config: ModelConfig = {
    default: 'test-model',
    context_limit: 100, // Very small context limit to force chunking
    tpm: 150,           // Very small TPM to force sleep
    rpm: 5,             // 5 RPM
    safety_margin: 0.8, // safe context = 80, safe tpm = 120
  };

  const limiter = new RateLimiter(config);

  // Generate 10 dummy items of 20 words each (~26 tokens each)
  const items = Array.from({ length: 10 }).map((_, i) => ({
    id: `item-${i}`,
    text: "word ".repeat(20).trim()
  }));

  const processChunk = async (chunk: any[]) => {
    console.log(`[Processor] Processing chunk of ${chunk.length} items`);
    return chunk.map(i => ({ ...i, processed: true }));
  };

  const stringifyItem = (item: any) => item.text;

  console.log('Starting RateLimiter test...');
  const start = Date.now();
  
  const results = await limiter.processItems(items, stringifyItem, processChunk);
  
  const end = Date.now();
  console.log(`\nTest completed in ${(end - start) / 1000}s`);
  console.log(`Processed ${results.length} items successfully.`);
}

testRateLimiter().catch(console.error);
