import { RawItem } from '../models/types';

/**
 * Deduplicates an array of RawItems based on exact URL or title similarity.
 * Uses a basic normalized title match: lowercase and alphanumeric only.
 */
export function deduplicateItems(items: RawItem[]): RawItem[] {
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const uniqueItems: RawItem[] = [];

  for (const item of items) {
    // 1. Check exact URL
    if (item.url && seenUrls.has(item.url)) {
      console.log(`[Dedup] Skipping duplicate URL: ${item.url}`);
      continue;
    }

    // 2. Check normalized title
    const normalizedTitle = item.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    if (normalizedTitle && seenTitles.has(normalizedTitle)) {
      console.log(`[Dedup] Skipping duplicate title: ${item.title}`);
      continue;
    }

    // If we reach here, it's a unique item
    if (item.url) {
      seenUrls.add(item.url);
    }
    if (normalizedTitle) {
      seenTitles.add(normalizedTitle);
    }
    
    uniqueItems.push(item);
  }

  return uniqueItems;
}
