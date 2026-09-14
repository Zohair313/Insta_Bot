import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { Reel } from '../models/Reel';
import { generateChatResponse } from '../services/chatbot';

const router = Router();

interface LocalReel {
  reelUrl: string;
  caption: string;
  tags: string[];
  audio_name?: string;
  transcript?: string;
  createdAt?: Date;
}

/**
 * Reads local saved_reels.json file if present
 */
function getLocalSavedReels(): LocalReel[] {
  const possiblePaths = [
    path.resolve(__dirname, '../../../saved_reels.json'),
    path.resolve(__dirname, '../../saved_reels.json'),
    path.resolve(process.cwd(), 'saved_reels.json')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const items = JSON.parse(raw);
        return items.map((item: any) => ({
          reelUrl: item.url || item.reelUrl || `https://www.instagram.com/reel/${item.code}/`,
          caption: item.caption || '',
          tags: item.tags || [],
          audio_name: item.audio_name || '',
          transcript: item.transcript || item.audio_name || '',
          createdAt: new Date()
        }));
      } catch (e) {
        console.error('Error reading local saved_reels.json:', e);
      }
    }
  }
  return [];
}

// POST /api/chat/query
// Perform search and return LLM response + matching Reel URLs
router.post('/query', async (req: any, res: any) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt string is required' });
  }

  try {
    let allReels: LocalReel[] = [];

    // 1. Fetch from MongoDB if available
    try {
      const dbReels = await Reel.find().lean();
      if (dbReels && dbReels.length > 0) {
        allReels = dbReels.map(r => ({
          reelUrl: r.reelUrl,
          caption: r.caption || '',
          tags: r.tags || [],
          transcript: r.transcript || '',
          createdAt: r.createdAt
        }));
      }
    } catch (dbErr) {
      console.log('MongoDB search fallback (DB empty or not connected)');
    }

    // 2. Combine with local saved_reels.json if present
    const localReels = getLocalSavedReels();
    for (const lr of localReels) {
      if (!allReels.some(r => r.reelUrl === lr.reelUrl)) {
        allReels.push(lr);
      }
    }

    if (allReels.length === 0) {
      return res.json({
        response: "No saved Instagram reels found. Please run 'python instagram_saved_search.py' to fetch your saved reels.",
        reels: []
      });
    }

    // 3. Perform keyword & relevance scoring
    const keywords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    
    const scoredReels = allReels.map(reel => {
      const textToSearch = `${reel.caption} ${reel.tags.join(' ')} ${reel.transcript || ''} ${reel.audio_name || ''}`.toLowerCase();
      let score = 0;

      for (const kw of keywords) {
        if (textToSearch.includes(kw)) {
          score += 1;
        }
      }

      return { reel, score };
    });

    // Sort by relevance score descending
    scoredReels.sort((a, b) => b.score - a.score);

    // Filter top matches
    const topMatches = scoredReels.filter(r => r.score > 0).slice(0, 5).map(r => r.reel);
    const selectedReels = topMatches.length > 0 ? topMatches : allReels.slice(0, 3);

    // 4. Generate response using LLM or structured template
    let llmResponse = '';
    try {
      llmResponse = await generateChatResponse(prompt, selectedReels as any);
    } catch (llmErr) {
      console.log('LLM response fallback:', llmErr);
      const urlList = selectedReels.map(r => r.reelUrl).join('\n');
      llmResponse = `Found ${selectedReels.length} saved reel(s) matching your description:\n${urlList}`;
    }

    const matchedUrls = selectedReels.map(r => r.reelUrl);

    return res.json({
      response: llmResponse,
      reels: matchedUrls
    });

  } catch (error: any) {
    console.error('Chat error:', error);
    return res.status(500).json({ error: 'Failed to process chat query', details: error.message });
  }
});

export default router;
