import { StateStore } from './store/stateStore';
import path from 'path';
import { SupervisorA } from './agents/supervisorA';
import { SupervisorB } from './agents/supervisorB';

export async function runDailyDigest() {
  console.log('Starting 7-Agent Autonomous Jarvis Digest Workflow...');

  const storePath = path.join(__dirname, '../data/sent_items.json');
  const store = new StateStore(storePath);

  // Initialize Supervisors
  const supervisorA = new SupervisorA(store);
  const supervisorB = new SupervisorB();

  // Supervisor A handles Data Intake & Curation
  const curatedItems = await supervisorA.curateData();

  if (curatedItems.length === 0) {
    console.log('Supervisor A reported no new items to process today. Exiting workflow.');
    return;
  }

  // Supervisor B handles Content Generation & Delivery
  const processedItems = await supervisorB.generateContent(curatedItems);

  if (processedItems.length === 0) {
    console.log('Supervisor B returned no processed items. Exiting workflow.');
    return;
  }

  // Supervisor B verifies and sends email
  await supervisorB.deliverAndVerify(processedItems);

  // Update store
  console.log('Updating state store with sent items...');
  for (const item of processedItems) {
    store.markItemAsSent(item.id);
  }
  
  console.log('Jarvis Digest workflow completed successfully.');
}
