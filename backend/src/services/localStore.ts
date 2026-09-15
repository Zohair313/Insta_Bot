import fs from 'fs';
import path from 'path';

export interface LocalReel {
  reelUrl: string;
  caption: string;
  tags: string[];
  audio_name?: string;
  transcript?: string;
  product_type?: string;
  createdAt: string;
}

const SAVED_REELS_PATH = path.resolve(__dirname, '../../../saved_reels.json');

export function getSavedReelsPath(): string {
  return SAVED_REELS_PATH;
}

export function readLocalReels(): LocalReel[] {
  try {
    if (fs.existsSync(SAVED_REELS_PATH)) {
      const raw = fs.readFileSync(SAVED_REELS_PATH, 'utf-8');
      const items = JSON.parse(raw);
      if (Array.isArray(items)) return items;
    }
  } catch (e) {
    console.error('Error reading saved_reels.json:', e);
  }
  return [];
}

export function upsertLocalReels(newItems: LocalReel[]): { all: LocalReel[]; addedCount: number } {
  const existing = readLocalReels();
  const existingUrls = new Set(existing.map(r => r.reelUrl));

  let addedCount = 0;
  for (const item of newItems) {
    if (!existingUrls.has(item.reelUrl)) {
      existing.push(item);
      existingUrls.add(item.reelUrl);
      addedCount++;
    }
  }

  try {
    fs.writeFileSync(SAVED_REELS_PATH, JSON.stringify(existing, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing saved_reels.json:', e);
  }

  return { all: existing, addedCount };
}

export function writeLocalReels(items: LocalReel[]): void {
  try {
    fs.writeFileSync(SAVED_REELS_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error writing saved_reels.json:', e);
  }
}