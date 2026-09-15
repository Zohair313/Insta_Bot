import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

// Fail fast on DB queries when MongoDB is not connected
mongoose.set('bufferCommands', false);

const app = express();
const port = process.env.PORT || 3001;

// Import routes
import reelsRoutes from './routes/reels';
import chatRoutes from './routes/chat';
import settingsRoutes from './routes/settings';
import { loadSettings, hasValidMongoUri } from './services/settings';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/reels', reelsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/settings', settingsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Instagram AI Retriever Backend API is running. Access /health or /api/*' });
});

// Basic health check route
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Instagram AI Retriever backend is running' });
});

// Start the server
async function startServer() {
  try {
    // Connect to MongoDB if a valid URI is configured (env or saved settings)
    const settings = loadSettings();
    const mongoUri = settings.mongodbUri || process.env.MONGODB_URI || '';
    if (hasValidMongoUri(mongoUri)) {
      await mongoose.connect(mongoUri);
      console.log('Connected to MongoDB');
    } else {
      console.log('MongoDB not connected (no valid MONGODB_URI in settings/.env). DB-backed features will use fallbacks.');
    }

    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer();
