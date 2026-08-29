import { RawItem, FilteredItem } from '../models/types';

export function applyQualityBar(items: RawItem[]): FilteredItem[] {
  return items.filter((item) => {
    if (item.source === 'Product Hunt') {
      return (item.score ?? 0) >= 50;
    }
    if (item.source === 'Hacker News') {
      return (item.score ?? 0) >= 30 || (item.comments ?? 0) >= 15;
    }
    // Auto-pass other items (newsletters, etc.)
    return true;
  });
}
