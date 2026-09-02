import { Fetcher } from './base';
import { RssFetcher } from './rssFetcher';
import { ProductHuntFetcher } from './productHuntFetcher';
import { HackerNewsFetcher } from './hackerNewsFetcher';
import { RundownFetcher } from './rundownFetcher';
import { AnthropicFetcher } from './anthropicFetcher';
import { RawItem } from '../models/types';

import fs from 'fs';
import path from 'path';

export async function fetchAll(): Promise<RawItem[]> {
  let rssSources = [];
  try {
    const sourcesPath = path.join(__dirname, '../../data/sources.json');
    rssSources = JSON.parse(fs.readFileSync(sourcesPath, 'utf8'));
  } catch (e) {
    console.error('Failed to read sources.json', e);
  }

  const fetchers: Fetcher[] = [
    new RssFetcher('Standard RSS', rssSources),
    new ProductHuntFetcher(),
    new HackerNewsFetcher(),
    new RundownFetcher(),
    new AnthropicFetcher(),
  ];

  console.log(`Starting fetch from ${fetchers.length} fetchers...`);

  const results = await Promise.allSettled(fetchers.map((f) => f.fetchItems()));

  const allItems: RawItem[] = [];

  results.forEach((result, index) => {
    const fetcherName = fetchers[index]?.sourceName;
    if (result.status === 'fulfilled') {
      console.log(`[${fetcherName}] fetched ${result.value.length} items.`);
      allItems.push(...result.value);
    } else {
      console.error(`[${fetcherName}] fetch failed:`, result.reason);
    }
  });

  return allItems;
}
