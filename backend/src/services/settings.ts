import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export interface AppSettings {
  openaiApiKey: string;
  googleApiKey: string;
  mongodbUri: string;
  instagramUsername: string;
  instagramPassword: string;
}

const SETTINGS_PATH = path.resolve(__dirname, '../../settings.json');

function envDefaults(): AppSettings {
  return {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    googleApiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || '',
    mongodbUri: process.env.MONGODB_URI || '',
    instagramUsername: '',
    instagramPassword: '',
  };
}

export function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const raw = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      const data = JSON.parse(raw);
      const defaults = envDefaults();
      return {
        openaiApiKey: data.openaiApiKey || defaults.openaiApiKey,
        googleApiKey: data.googleApiKey || defaults.googleApiKey,
        mongodbUri: data.mongodbUri || defaults.mongodbUri,
        instagramUsername: data.instagramUsername || '',
        instagramPassword: data.instagramPassword || '',
      };
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }
  return envDefaults();
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const next: AppSettings = {
    ...loadSettings(),
    ...partial,
  };
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(next, null, 2), 'utf-8');
  return next;
}

export function hasValidMongoUri(uri: string): boolean {
  return !!uri && !uri.includes('<') && !uri.includes('...');
}