import { Router } from 'express';
import { Reel } from '../models/Reel';
import { generateEmbedding } from '../services/embeddings';
import { scrapeSavedReels, loginAndSaveSession } from '../services/scraper';

const router = Router();

// POST /api/reels/login
// Trigger a manual login browser window
router.post('/login', async (req, res) => {
  try {
    await loginAndSaveSession();
    res.json({ message: 'Login session saved successfully. You can now close the browser.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to complete login', details: error.message });
  }
});

// POST /api/reels/sync
// Trigger scraping and index the new reels
router.post('/sync', async (req, res) => {
  try {
    // Note: requires passing a username from request body
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    const scrapedReels = await scrapeSavedReels(username);
    const savedReels = [];

    for (const reelData of scrapedReels) {
      // Check if already exists
      const existing = await Reel.findOne({ reelUrl: reelData.reelUrl });
      if (existing) {
        continue;
      }

      // Generate embedding
      const contentToEmbed = `Caption: ${reelData.caption} | Tags: ${reelData.tags.join(', ')} | Audio: ${reelData.transcript || ''}`;
      const embedding = await generateEmbedding(contentToEmbed);

      // Save to DB
      const newReel = new Reel({
        ...reelData,
        embedding
      });

      await newReel.save();
      savedReels.push(newReel);
    }

    res.json({ message: 'Sync complete', syncedCount: savedReels.length, data: savedReels });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to sync reels', details: error.message });
  }
});

// GET /api/reels
// Retrieve all saved reels
router.get('/', async (req, res) => {
  try {
    const reels = await Reel.find().sort({ createdAt: -1 }).select('-embedding'); // don't send huge vectors
    res.json(reels);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch reels', details: error.message });
  }
});

export default router;
