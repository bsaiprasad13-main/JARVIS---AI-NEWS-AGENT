import fs from 'fs';
import path from 'path';

export class StateStore {
  private filePath: string;
  private sentItems: Set<string>;

  constructor(filePath: string = path.join(__dirname, '../../data/sent_items.json')) {
    this.filePath = filePath;
    this.sentItems = new Set<string>();
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf-8');
        const items = JSON.parse(data);
        if (Array.isArray(items)) {
          this.sentItems = new Set(items);
        }
      }
    } catch (error) {
      console.error(`Error loading state store from ${this.filePath}:`, error);
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = JSON.stringify(Array.from(this.sentItems), null, 2);
      fs.writeFileSync(this.filePath, data, 'utf-8');
    } catch (error) {
      console.error(`Error saving state store to ${this.filePath}:`, error);
    }
  }

  public hasItemBeenSent(id: string): boolean {
    return this.sentItems.has(id);
  }

  public markItemAsSent(id: string): void {
    if (!this.sentItems.has(id)) {
      this.sentItems.add(id);
      this.save();
    }
  }
}
