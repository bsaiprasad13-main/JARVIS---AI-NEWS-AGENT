import { SupervisorAgent } from './supervisor';
import { fetchAll } from '../fetchers/index';
import { RawItem, FilteredItem } from '../models/types';
import { StateStore } from '../store/stateStore';
import { deduplicateItems } from '../processor/dedup';
import { applyQualityBar } from '../processor/filter';

export class SupervisorA extends SupervisorAgent {
  private store: StateStore;

  constructor(store: StateStore) {
    super(
      'SupervisorA',
      process.env.GEMINI_SUPERVISOR_A_KEY!,
      [process.env.GEMINI_WORKER_1_KEY!, process.env.GEMINI_WORKER_2_KEY!],
      process.env.GEMINI_SAFE_SIDE_KEY!
    );
    this.store = store;
  }

  public async curateData(): Promise<FilteredItem[]> {
    console.log(`[${this.id}] Initiating data fetch...`);
    let allItems: RawItem[] = [];

    try {
      // In a more advanced implementation, fetchAll could also be split among workers
      allItems = await fetchAll();
    } catch (e: any) {
      console.error(`[${this.id}] Data fetch failed.`, e);
      return [];
    }

    let deduped = deduplicateItems(allItems);
    const newItems = deduped.filter((item) => !this.store.hasItemBeenSent(item.id));
    
    // We could use workers here to do AI filtering, but falling back to programmatic 
    // filter to keep token usage low for phase 1.
    const highQuality = applyQualityBar(newItems);
    
    console.log(`[${this.id}] Curation complete. ${highQuality.length} items passed.`);
    return highQuality;
  }
}
