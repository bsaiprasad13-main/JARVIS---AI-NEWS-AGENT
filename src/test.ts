import 'dotenv/config';
import fs from 'fs';
import yaml from 'yaml';
import { StateStore } from './store/stateStore';

console.log('--- ENV VERIFICATION ---');
console.log(
  'GROQ_API_KEY from env (should be undefined if using .example):',
  process.env.GROQ_API_KEY,
);

console.log('\n--- YAML VERIFICATION ---');
try {
  const file = fs.readFileSync('./models.yaml', 'utf8');
  const parsed = yaml.parse(file);
  console.log('Parsed models.yaml:', JSON.stringify(parsed, null, 2));
} catch (e) {
  console.error('Error parsing models.yaml:', e);
}

console.log('\n--- STATE STORE VERIFICATION ---');
const store = new StateStore('./data/sent_items.json');
console.log('Store initialized.');
console.log('Has item "123"?', store.hasItemBeenSent('123'));
store.markItemAsSent('123');
console.log('Marked item "123" as sent.');
const storeCheck = new StateStore('./data/sent_items.json');
console.log('Has item "123" after reloading?', storeCheck.hasItemBeenSent('123'));
