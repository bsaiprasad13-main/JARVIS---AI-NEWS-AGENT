import { WorkerAgent } from './worker';
import { AgentMemory } from './memory';

export type Strategy = 'retry_immediately' | 'swap_to_safe_side' | 'split_and_conquer' | 'hibernate' | 're_prompt_with_correction' | 'adjust_prompt_and_retry' | 'skip_source_for_today' | 'alert_admin_fallback';

export class SupervisorAgent {
  protected memory: AgentMemory;
  protected supervisorWorker: WorkerAgent;
  protected workers: WorkerAgent[];
  protected safeSideWorker: WorkerAgent;
  public id: string;

  constructor(id: string, supervisorKey: string, workerKeys: string[], safeSideKey: string) {
    this.id = id;
    this.memory = new AgentMemory();
    this.supervisorWorker = new WorkerAgent(id, supervisorKey);
    this.workers = workerKeys.map((key, i) => new WorkerAgent(`${id}_worker_${i+1}`, key));
    this.safeSideWorker = new WorkerAgent('SAFE_SIDE', safeSideKey);
  }

  public async decideStrategy(errorMsg: string, contextContext: string): Promise<Strategy> {
    const prompt = `You are a Supervisor Agent. One of your workers failed.
Error: ${errorMsg}
Context: ${contextContext}

Past Memory: ${JSON.stringify(this.memory.getMemory())}

Pick one of the following strategies to recover:
- swap_to_safe_side (if 503 or 429 quota exhausted)
- split_and_conquer (if context window overflow or too much data)
- re_prompt_with_correction (if JSON is malformed)
- adjust_prompt_and_retry (if output quality is bad)
- skip_source_for_today (if a data source completely failed)
- alert_admin_fallback (if it's a fatal delivery failure)
- hibernate (if all keys are exhausted)
- retry_immediately (for generic transient network errors)

Return ONLY the strategy name.`;

    try {
      const decision = await this.supervisorWorker.generateText(prompt);
      const strat = decision.trim() as Strategy;
      console.log(`[${this.id}] Decided strategy: ${strat}`);
      this.memory.updateStrategy(contextContext, strat);
      return strat;
    } catch (e) {
      console.error(`[${this.id}] Supervisor failed to decide strategy, defaulting to swap_to_safe_side`);
      return 'swap_to_safe_side';
    }
  }

  protected async executeWithToolbox<T>(worker: WorkerAgent, task: (w: WorkerAgent) => Promise<T>, contextContext: string): Promise<T> {
     let currentWorker = worker;
     let attempts = 0;
     let maxAttempts = 3;

     while (attempts < maxAttempts) {
       try {
         return await task(currentWorker);
       } catch (err: any) {
         attempts++;
         console.warn(`[${this.id}] Task failed. Asking supervisor for strategy...`);
         const strat = await this.decideStrategy(err.message || String(err), contextContext);

         if (strat === 'swap_to_safe_side') {
           console.log(`[${this.id}] Swapping to safe side agent!`);
           currentWorker = this.safeSideWorker;
         } else if (strat === 'hibernate') {
           console.log(`[${this.id}] Hibernating workflow.`);
           throw new Error('HIBERNATING');
         } else if (strat === 'skip_source_for_today') {
           console.log(`[${this.id}] Skipping source.`);
           throw new Error('SKIPPED');
         } else if (strat === 'split_and_conquer') {
           throw new Error('SPLIT_REQUIRED');
         } else if (strat === 're_prompt_with_correction' || strat === 'adjust_prompt_and_retry') {
            console.log(`[${this.id}] Retrying with adjustment...`);
            // Custom prompt changes would happen in the task callback based on attempts
         } else {
           console.log(`[${this.id}] Retrying immediately...`);
         }
       }
     }
     throw new Error(`[${this.id}] Task failed after ${maxAttempts} attempts`);
  }
}
