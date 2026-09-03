import { ModelConfig } from '../models/config';

/**
 * Estimates tokens using a fast industry-standard heuristic (1 word ≈ 1.3 tokens).
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  const words = text.trim().split(/\s+/).length;
  return Math.ceil(words * 1.3);
}

export class RateLimiter {
  private config: ModelConfig;
  private requestsThisMinute: number = 0;
  private tokensThisMinute: number = 0;
  private minuteStartTime: number = Date.now();

  constructor(config: ModelConfig) {
    this.config = config;
  }

  private async checkAndEnforceLimits(estimatedTokens: number) {
    const now = Date.now();
    
    // Reset the window if 60 seconds have passed
    if (now - this.minuteStartTime >= 60000) {
      this.requestsThisMinute = 0;
      this.tokensThisMinute = 0;
      this.minuteStartTime = now;
    }

    const projectedTokens = this.tokensThisMinute + estimatedTokens;
    const projectedRequests = this.requestsThisMinute + 1;

    // Apply safety margin to our TPM limit
    const safeTpm = this.config.tpm * this.config.safety_margin;
    
    // If we are about to hit RPM or TPM, wait until the next minute window
    if (projectedRequests > this.config.rpm || projectedTokens > safeTpm) {
      const waitTime = 60000 - (now - this.minuteStartTime) + 1000; // wait remainder of minute + 1s buffer
      console.log(`[RateLimiter] Approaching limit (Reqs: ${this.requestsThisMinute}/${this.config.rpm}, Tokens: ${this.tokensThisMinute}/${safeTpm}). Sleeping for ${Math.ceil(waitTime/1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // Reset after sleeping
      this.requestsThisMinute = 0;
      this.tokensThisMinute = 0;
      this.minuteStartTime = Date.now();
    }

    // Register this request
    this.requestsThisMinute += 1;
    this.tokensThisMinute += estimatedTokens;
  }

  /**
   * Chunks items dynamically based on the context window and processes them while respecting RPM and TPM.
   */
  public async processItems<T, R>(
    items: T[], 
    stringifyItem: (item: T) => string,
    processChunk: (chunk: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const safeContextLimit = this.config.context_limit * this.config.safety_margin;
    
    let currentChunk: T[] = [];
    let currentChunkTokens = 0;
    const chunks: { items: T[], tokens: number }[] = [];

    // 1. Smart Chunking
    for (const item of items) {
      const itemText = stringifyItem(item);
      const itemTokens = estimateTokens(itemText);

      if (currentChunkTokens + itemTokens > safeContextLimit && currentChunk.length > 0) {
        // Push current chunk and start a new one
        chunks.push({ items: currentChunk, tokens: currentChunkTokens });
        currentChunk = [item];
        currentChunkTokens = itemTokens;
      } else {
        currentChunk.push(item);
        currentChunkTokens += itemTokens;
      }
    }
    
    if (currentChunk.length > 0) {
      chunks.push({ items: currentChunk, tokens: currentChunkTokens });
    }

    const results: R[] = [];

    // 2. Dispatch chunks with rate limiting
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]!;
      await this.checkAndEnforceLimits(chunk.tokens);
      
      console.log(`[RateLimiter] Dispatching chunk ${i + 1}/${chunks.length} (${chunk.items.length} items, ~${chunk.tokens} tokens)...`);
      
      let retries = 3;
      while (retries > 0) {
        try {
          const chunkResults = await processChunk(chunk.items);
          results.push(...chunkResults);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.error(`[RateLimiter] Error processing chunk ${i + 1} after retries:`, error);
          } else {
            console.warn(`[RateLimiter] Error processing chunk ${i + 1}. Retrying in 5s...`, error);
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }
    }

    return results;
  }
}
