import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

export interface ModelConfig {
  default: string;
  context_limit: number;
  tpm: number;
  rpm: number;
  safety_margin: number;
}

export interface ModelsConfig {
  groq: ModelConfig;
  gemini: ModelConfig;
}

let cachedConfig: ModelsConfig | null = null;

export function getModelsConfig(): ModelsConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  
  try {
    const yamlPath = path.join(__dirname, '../../models.yaml');
    const file = fs.readFileSync(yamlPath, 'utf8');
    const parsed = YAML.parse(file);
    cachedConfig = parsed.models as ModelsConfig;
    return cachedConfig;
  } catch (error) {
    console.error('Failed to parse models.yaml', error);
    // Provide sensible defaults if file is missing/broken
    return {
      groq: {
        default: 'llama-3.1-8b-instant',
        context_limit: 8192,
        tpm: 30000,
        rpm: 30,
        safety_margin: 0.8
      },
      gemini: {
        default: 'gemini-1.5-flash',
        context_limit: 1048576,
        tpm: 1000000,
        rpm: 15,
        safety_margin: 0.8
      }
    };
  }
}
