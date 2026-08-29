import { Fetcher } from './base';
import { RawItem } from '../models/types';
import * as cheerio from 'cheerio';

export class HackerNewsFetcher implements Fetcher {
  public sourceName = 'Hacker News';
  private apiUrl = 'https://hn.algolia.com/api/v1/search';

  public async fetchItems(): Promise<RawItem[]> {
    const oneDayAgoUnix = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    // Querying for AI or Product Management, restricted to last 24 hours
    const url = `${this.apiUrl}?query=AI OR "Product Management"&tags=story&numericFilters=created_at_i>${oneDayAgoUnix}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HN API error: ${response.status}`);
      }

      const data = await response.json();
      const hits = data.hits || [];

      // We only take the top 10 to avoid scraping too many pages
      const topHits = hits.slice(0, 10);
      const items: RawItem[] = [];

      for (const hit of topHits) {
        let description = '';

        // Try to fetch og:description as a fallback
        if (hit.url) {
          try {
            const pageResp = await fetch(hit.url, { signal: AbortSignal.timeout(3000) });
            if (pageResp.ok) {
              const html = await pageResp.text();
              const $ = cheerio.load(html);
              description =
                $('meta[property="og:description"]').attr('content') ||
                $('meta[name="description"]').attr('content') ||
                '';
            }
          } catch (e) {
            // Ignore timeout or fetch errors for the fallback
          }
        }

        items.push({
          id: hit.objectID,
          source: this.sourceName,
          title: hit.title,
          url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          publishedAt: hit.created_at,
          author: hit.author,
          description: description,
          score: hit.points,
          comments: hit.num_comments,
        });
      }

      return items;
    } catch (error) {
      console.error('Error fetching Hacker News:', error);
      return [];
    }
  }
}
