import { Router } from 'express';
import { loadSettings, saveSettings, AppSettings } from '../services/settings';

const router = Router();

function toPublic(s: AppSettings) {
  return {
    openaiApiKeySet: !!s.openaiApiKey,
    googleApiKeySet: !!s.googleApiKey,
    mongodbUriSet: !!s.mongodbUri,
    instagramUsername: s.instagramUsername,
    instagramPasswordSet: !!s.instagramPassword,
  };
}

// GET /api/settings
// Return whether secrets are configured (never send the secret values)
router.get('/', (req, res) => {
  res.json(toPublic(loadSettings()));
});

// POST /api/settings
// Save provided API keys and Instagram credentials (empty fields are ignored)
router.post('/', (req: any, res: any) => {
  const {
    openaiApiKey,
    googleApiKey,
    mongodbUri,
    instagramUsername,
    instagramPassword,
  } = req.body || {};

  const partial: Partial<AppSettings> = {};
  if (typeof openaiApiKey === 'string' && openaiApiKey.trim()) partial.openaiApiKey = openaiApiKey.trim();
  if (typeof googleApiKey === 'string' && googleApiKey.trim()) partial.googleApiKey = googleApiKey.trim();
  if (typeof mongodbUri === 'string' && mongodbUri.trim()) partial.mongodbUri = mongodbUri.trim();
  if (typeof instagramUsername === 'string' && instagramUsername.trim()) partial.instagramUsername = instagramUsername.trim();
  if (typeof instagramPassword === 'string' && instagramPassword.trim()) partial.instagramPassword = instagramPassword.trim();

  const saved = saveSettings(partial);
  res.json({
    message: 'Settings saved successfully',
    ...toPublic(saved),
  });
});

export default router;