import fs from 'fs';
import path from 'path';

const MEMORY_FILE = path.join(__dirname, '../../data/supervisor_memory.json');

export interface SupervisorMemory {
  strategies: Record<string, string>;
  failedSources: string[];
  lastErrorLogs: string[];
}

const defaultMemory: SupervisorMemory = {
  strategies: {},
  failedSources: [],
  lastErrorLogs: []
};

export class AgentMemory {
  private memory: SupervisorMemory;

  constructor() {
    this.memory = this.load();
  }

  private load(): SupervisorMemory {
    if (fs.existsSync(MEMORY_FILE)) {
      try {
        const data = fs.readFileSync(MEMORY_FILE, 'utf-8');
        return JSON.parse(data) as SupervisorMemory;
      } catch (err) {
        console.error('Failed to load supervisor memory, using default', err);
      }
    }
    return { ...defaultMemory };
  }

  private save() {
    try {
      const dir = path.dirname(MEMORY_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.memory, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save supervisor memory', err);
    }
  }

  public getMemory(): SupervisorMemory {
    return this.memory;
  }

  public updateStrategy(key: string, strategy: string) {
    this.memory.strategies[key] = strategy;
    this.save();
  }

  public addFailedSource(source: string) {
    if (!this.memory.failedSources.includes(source)) {
      this.memory.failedSources.push(source);
      this.save();
    }
  }

  public clearFailedSources() {
    this.memory.failedSources = [];
    this.save();
  }
}
