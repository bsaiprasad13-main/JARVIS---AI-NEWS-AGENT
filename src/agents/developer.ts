import { WorkerAgent } from './worker';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

export class DeveloperAgent {
  private worker: WorkerAgent;

  constructor() {
    this.worker = new WorkerAgent('DEVELOPER', process.env.GEMINI_SAFE_SIDE_KEY!);
  }

  public async healWorkflow(errorMsg: string, contextContext: string): Promise<void> {
    console.log(`[DeveloperAgent] Waking up to heal an unknown error...`);
    const supervisorPath = path.join(__dirname, 'supervisor.ts');
    let sourceCode = '';
    
    try {
       sourceCode = fs.readFileSync(supervisorPath, 'utf8');
    } catch (e) {
       console.error(`[DeveloperAgent] Could not read supervisor.ts`);
       return;
    }

    const prompt = `You are an elite Developer Agent. The production workflow just crashed with an unknown error.
Error: ${errorMsg}
Context: ${contextContext}

Your task is to invent a new error recovery strategy.
Return a JSON object with:
1. "new_strategy_name": A unique string name for the new strategy.
2. "code_block": The exact TypeScript code block to insert inside the executeWithToolbox if-else chain. It should start with "else if (strat === 'your_strategy_name') { ... }".

Make sure the code matches the existing style.

Current source code:
${sourceCode}`;

    const schema = {
      type: 'object',
      properties: {
        new_strategy_name: { type: 'string' },
        code_block: { type: 'string' }
      },
      required: ['new_strategy_name', 'code_block']
    } as any;

    try {
      const response = await this.worker.generateJSON(prompt, schema);
      const newStrategyName = response.new_strategy_name;
      const newCodeBlock = response.code_block;
      
      console.log(`[DeveloperAgent] Invented strategy: ${newStrategyName}`);
      
      // Patching Logic
      const marker = '// [AUTO_GENERATED_STRATEGIES_START]';
      const replacement = `${marker}\n         ${newCodeBlock}`;
      
      if (!sourceCode.includes(marker)) {
         throw new Error("Injection marker not found in supervisor.ts");
      }
      
      const patchedCode = sourceCode.replace(marker, replacement);
      
      // Additionally, we need to add the new strategy name to the Strategy type
      // Regex to find: export type Strategy = '...' | string;
      // We will just let `string` cover it for now, so we don't strictly need to modify the type!
      
      fs.writeFileSync(supervisorPath, patchedCode, 'utf8');
      
      console.log(`[DeveloperAgent] Patched supervisor.ts. Verifying syntax...`);
      
      // Verify Syntax
      try {
         await execPromise('npx tsc --noEmit', { cwd: path.join(__dirname, '../../') });
         console.log(`[DeveloperAgent] Syntax OK! Committing to git and restarting...`);
         
         // Commit to Git
         await execPromise('git add src/agents/supervisor.ts && git commit -m "fix(auto): safe-side agent patched supervisor.ts"', { cwd: path.join(__dirname, '../../') });
         await execPromise('git push', { cwd: path.join(__dirname, '../../') });
         
         // Restart Server (Railway restart)
         console.log(`[DeveloperAgent] Self-healing complete. Exiting to trigger Railway restart...`);
         process.exit(1);
         
      } catch (tscError) {
         console.error(`[DeveloperAgent] Bad syntax generated! Rolling back.`);
         fs.writeFileSync(supervisorPath, sourceCode, 'utf8'); // Rollback
      }

    } catch (e) {
      console.error(`[DeveloperAgent] Failed to heal the workflow.`, e);
    }
  }
}
