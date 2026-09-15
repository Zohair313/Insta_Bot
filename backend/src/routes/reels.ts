import { Router } from 'express';
import { Reel } from '../models/Reel';
import { generateEmbedding } from '../services/embeddings';
import { scrapeSavedReels, loginAndSaveSession } from '../services/scraper';
import { loadSettings, hasValidMongoUri } from '../services/settings';
import { readLocalReels, LocalReel } from '../services/localStore';

const router = Router();

// POST /api/reels/login
// Trigger a manual login browser window
router.post('/login', async (req, res) => {
  try {
    const settings = loadSettings();
    await loginAndSaveSession(
      settings.instagramUsername || undefined,
      settings.instagramPassword || undefined
    );
    res.json({ message: 'Login session saved successfully. You can now close the browser.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to complete login', details: error.message });
  }
});

// POST /api/reels/sync
// Trigger scraping and index the new reels
router.post('/sync', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const settings = loadSettings();
    const scrapedReels = await scrapeSavedReels(username);

    const dbSynced = [];
    const localReels = readLocalReels();
    const knownUrls = new Set(localReels.map(r => r.reelUrl));

    // Persist to MongoDB (with embeddings) only when both are properly configured.
    const useDb = hasValidMongoUri(settings.mongodbUri) && !!settings.openaiApiKey;

    for (const reel of scrapedReels) {
      try {
        if (useDb) {
          const existing = await Reel.findOne({ reelUrl: reel.reelUrl });
          if (!existing) {
            const contentToEmbed = `Caption: ${reel.caption} | Tags: ${reel.tags.join(', ')} | Audio: ${reel.transcript || ''}`;
            const embedding = await generateEmbedding(contentToEmbed);
            const newReel = new Reel({ ...reel, embedding });
            await newReel.save();
            dbSynced.push(newReel);
          }
        }
      } catch (dbErr) {
        console.log('Skipping DB save for reel (embeddings/Mongo not configured):', dbErr);
      }
    }

    // Local saved_reels.json is the primary store for the frontend + chat.
    const addedCount = scrapedReels.filter(r => !knownUrls.has(r.reelUrl)).length;

    res.json({
      message: 'Sync complete',
      syncedCount: addedCount,
      data: scrapedReels,
      store: useDb ? 'mongodb' : 'local',
      note: useDb
        ? ''
        : 'Stored locally in saved_reels.json. Add OpenAI + MongoDB keys in Settings for DB storage.',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to sync reels', details: error.message });
  }
});

function toFrontendReel(r: LocalReel): any {
  return {
    _id: r.reelUrl,
    reelUrl: r.reelUrl,
    caption: r.caption || '',
    tags: r.tags || [],
    transcript: r.transcript || r.audio_name || '',
    createdAt: r.createdAt || new Date().toISOString(),
  };
}

// GET /api/reels
// Retrieve all saved reels (from MongoDB if connected, otherwise local file)
router.get('/', async (req, res) => {
  try {
    const settings = loadSettings();
    if (hasValidMongoUri(settings.mongodbUri)) {
      try {
        const reels = await Reel.find().sort({ createdAt: -1 }).select('-embedding');
        if (reels && reels.length > 0) {
          return res.json(reels);
        }
      } catch (dbErr) {
        console.log('MongoDB fetch failed, falling back to local file:', dbErr);
      }
    }

    const local = readLocalReels();
    res.json(local.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1)).map(toFrontendReel));
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch reels', details: error.message });
  }
});

export default router;