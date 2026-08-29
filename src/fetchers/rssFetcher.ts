import Parser from 'rss-parser';
import * as cheerio from 'cheerio';
import { Fetcher } from './base';
import { RawItem } from '../models/types';
import crypto from 'crypto';

interface RssFeedSource {
  name: string;
  url: string;
}

export class RssFetcher implements Fetcher {
  public sourceName: string;
  private feedUrls: RssFeedSource[];
  private parser: Parser;

  constructor(sourceName: string = 'Standard RSS', feedUrls: RssFeedSource[]) {
    this.sourceName = sourceName;
    this.feedUrls = feedUrls;
    this.parser = new Parser();
  }

  private async discoverRssFeed(siteUrl: string): Promise<string | null> {
    try {
      const response = await fetch(siteUrl, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) return null;
      const html = await response.text();
      const $ = cheerio.load(html);
      const rssLink =
        $('link[type="application/rss+xml"]').attr('href') ||
        $('link[type="application/atom+xml"]').attr('href');

      if (rssLink) {
        if (rssLink.startsWith('http')) return rssLink;
        return new URL(rssLink, siteUrl).toString();
      }
    } catch (e) {
      console.warn(`Failed to auto-discover RSS on ${siteUrl}`);
    }
    return null;
  }

  public async fetchItems(): Promise<RawItem[]> {
    const allItems: RawItem[] = [];

    for (const feed of this.feedUrls) {
      try {
        let parsed: Parser.Output<{ [key: string]: any }>;

        try {
          parsed = await this.parser.parseURL(feed.url);
        } catch (initialError) {
          console.warn(
            `Initial fetch failed for ${feed.name} (${feed.url}). Attempting auto-discovery...`,
          );
          const siteUrl = new URL(feed.url).origin;
          const newUrl = await this.discoverRssFeed(siteUrl);

          if (newUrl) {
            console.log(`Auto-discovered new RSS URL for ${feed.name}: ${newUrl}`);
            feed.url = newUrl;

            try {
              const fs = require('fs');
              const path = require('path');
              const sourcesPath = path.join(__dirname, '../../data/sources.json');
              const currentSources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
              const sourceToUpdate = currentSources.find((s: any) => s.name === feed.name);
              if (sourceToUpdate) {
                sourceToUpdate.url = newUrl;
                fs.writeFileSync(sourcesPath, JSON.stringify(currentSources, null, 2), 'utf8');
              }
            } catch (writeErr) {
              console.error('Failed to update sources.json:', writeErr);
            }

            parsed = await this.parser.parseURL(newUrl);
          } else {
            throw new Error(
              `Auto-discovery failed. Original error: ${(initialError as Error).message}`,
            );
          }
        }

        const items: RawItem[] = parsed.items.map((item: any) => {
          const id = item.guid || item.link || crypto.randomUUID();
          return {
            id,
            source: feed.name,
            title: item.title || 'Untitled',
            url: item.link || '',
            publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
            author: item.creator || item.author,
            description: item.contentSnippet || item.content || item.summary,
          };
        });

        // Filter out items older than 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentItems = items.filter((i) => new Date(i.publishedAt) >= oneDayAgo);

        allItems.push(...recentItems);
      } catch (error) {
        console.error(`Error fetching RSS feed ${feed.name} (${feed.url}):`, error);
      }
    }

    return allItems;
  }
}
