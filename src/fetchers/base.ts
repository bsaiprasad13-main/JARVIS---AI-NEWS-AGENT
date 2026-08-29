import { RawItem } from '../models/types';

export interface Fetcher {
  sourceName: string;
  fetchItems(): Promise<RawItem[]>;
}
