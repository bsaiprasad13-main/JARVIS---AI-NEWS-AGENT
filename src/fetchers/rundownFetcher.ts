import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { Fetcher } from './base';
import { RawItem } from '../models/types';
import crypto from 'crypto';

export class RundownFetcher implements Fetcher {
  public sourceName = 'The Rundown AI';
  private feedUrl = 'https://www.therundown.ai/feed'; // Replace with actual feed if different
  private parser: Parser;

  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['content:encoded', 'content'],
      },
    });
  }

  public async fetchItems(): Promise<RawItem[]> {
    try {
      const parsed = await this.parser.parseURL(this.feedUrl);
      const allItems: RawItem[] = [];
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const item of parsed.items) {
        const publishedAt = new Date(item.isoDate || item.pubDate || Date.now());
        if (publishedAt < oneDayAgo) continue;

        const htmlContent = item['content:encoded'] || item.content || '';
        if (!htmlContent) continue;

        const $ = cheerio.load(htmlContent);

        // This is a heuristic. We split by <h3> which usually denote new stories in a newsletter
        // This logic might need tweaking based on the exact HTML structure of The Rundown AI
        const storyBlocks = $('h3');

        storyBlocks.each((_, el) => {
          const title = $(el).text().trim();

          // Get next elements until the next h3 to form the description
          let descriptionHtml = '';
          let nextEl = $(el).next();
          while (nextEl.length > 0 && nextEl[0]?.tagName !== 'h3') {
            descriptionHtml += nextEl.prop('outerHTML') || '';
            nextEl = nextEl.next();
          }

          const description = cheerio.load(descriptionHtml).text().trim();
          const links = cheerio.load(descriptionHtml)('a');
          const firstLink = links.length > 0 ? links.first().attr('href') : item.link;

          // Skip if it looks like an ad/sponsor (basic heuristic)
          if (
            title.toLowerCase().includes('sponsor') ||
            description.toLowerCase().includes('sponsor')
          ) {
            return;
          }

          if (title && description) {
            allItems.push({
              id: crypto.randomUUID(),
              source: this.sourceName,
              title: title,
              url: firstLink || item.link || '',
              publishedAt: publishedAt.toISOString(),
              author: 'The Rundown AI',
              description: description,
            });
          }
        });
      }
      return allItems;
    } catch (error) {
      console.error('Error fetching The Rundown AI:', error);
      return [];
    }
  }
}
