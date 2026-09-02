import Parser from 'rss-parser';
import { Fetcher } from './base';
import { RawItem } from '../models/types';
import crypto from 'crypto';

export class AnthropicFetcher implements Fetcher {
  public sourceName: string = 'Anthropic Blog';
  private parser: Parser;

  constructor() {
    this.parser = new Parser();
  }

  public async fetchItems(): Promise<RawItem[]> {
    const primaryUrl = 'https://rsshub.bestblogs.dev/anthropic/news';
    const fallbackUrl = 'https://tim-hilde.github.io/anthropic-rss/docs/rss.xml';
    
    let parsed: Parser.Output<{ [key: string]: any }>;

    try {
      try {
        parsed = await this.parser.parseURL(primaryUrl);
      } catch (primaryError) {
        console.warn(`[AnthropicFetcher] Primary URL failed: ${(primaryError as Error).message}. Attempting fallback...`);
        parsed = await this.parser.parseURL(fallbackUrl);
      }
    } catch (fallbackError) {
      console.error(`[AnthropicFetcher] Both primary and fallback URLs failed. Final error: ${(fallbackError as Error).message}`);
      return [];
    }

    const items: RawItem[] = parsed.items.map((item: any) => {
      const id = item.guid || item.link || crypto.randomUUID();
      return {
        id,
        source: this.sourceName,
        title: item.title || 'Untitled',
        url: item.link || '',
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        author: item.creator || item.author || 'Anthropic',
        description: item.contentSnippet || item.content || item.summary,
      };
    });

    // Filter out items older than 24 hours to match standard RSS behavior
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentItems = items.filter((i) => new Date(i.publishedAt) >= oneDayAgo);

    return recentItems;
  }
}
