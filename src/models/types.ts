export interface RawItem {
  id: string;
  source: string;
  title: string;
  url: string;
  publishedAt: string;
  author?: string;
  description?: string;
  score?: number;
  comments?: number;
}

export interface FilteredItem extends RawItem {
  score?: number; // e.g. upvotes, points
  comments?: number;
}

export interface ProcessedItem extends FilteredItem {
  llmSummary: string;
  pmRelevance: string;
  tags: string[];
}
