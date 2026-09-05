import { Router } from 'express';
import { generateEmbedding } from '../services/embeddings';
import { Reel } from '../models/Reel';
import { generateChatResponse } from '../services/chatbot';

const router = Router();

// POST /api/chat/query
// Perform semantic search and return LLM response
router.post('/query', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // 1. Generate embedding for user query
    const queryEmbedding = await generateEmbedding(prompt);

    // 2. Perform Vector Search (Cosine Similarity)
    // NOTE: This assumes a MongoDB Atlas cluster with Vector Search index configured.
    // If running locally without Atlas, a different similarity search algorithm must be implemented or Pinecone used.
    const retrievedReels = await Reel.aggregate([
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: 100,
          limit: 3
        }
      }
    ]);

    // 3. Pass to LLM
    const llmResponse = await generateChatResponse(prompt, retrievedReels);

    res.json({
      response: llmResponse,
      reels: retrievedReels.map(r => r.reelUrl)
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to process chat query', details: error.message });
  }
});

export default router;
